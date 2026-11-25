// POST /api/preguntar {q, h:[{q,a}]} → {respuesta, productos:[ids]}
// Buscador con IA del inicio: responde sólo con la información de la tienda (catálogo, precios y condiciones).
import Anthropic from '@anthropic-ai/sdk';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const H = { apikey: PUB, Authorization: 'Bearer ' + PUB, 'Content-Type': 'application/json' };
const ars = n => '$' + Math.round(+n || 0).toLocaleString('es-AR');

let CACHE = { t: 0, txt: '', ids: new Set() };
async function catalogo() {
  if (Date.now() - CACHE.t < 10 * 60e3 && CACHE.txt) return CACHE;
  const [pr, pz, cf] = await Promise.all([
    fetch(SB + '/rest/v1/products?select=*&activo=eq.true&order=orden', { headers: H }).then(r => r.json()),
    fetch(SB + '/rest/v1/rpc/precios_publicos', { method: 'POST', headers: H, body: '{}' }).then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(SB + '/rest/v1/config_pub?select=key,value', { headers: H }).then(r => r.ok ? r.json() : []).catch(() => []),
  ]);
  const P = Object.fromEntries((Array.isArray(pz) ? pz : []).map(x => [x.id, x]));
  const lineas = (Array.isArray(pr) ? pr : []).map(x => {
    const p = P[x.id] || {}, col = (x.colores || []).map(c => Array.isArray(c) ? c[0] : c).filter(Boolean).join(', ');
    const precio = p.publico ? `precio ${ars(p.publico)}${p.lista > p.publico ? ` (lista ${ars(p.lista)})` : ''}${p.transf ? `, con transferencia ${ars(p.transf)}` : ''}` : 'precio a consultar';
    const med = +x.ancho > 0 ? `${x.redonda ? 'Ø ' + x.ancho : x.ancho + ' ancho × ' + x.prof + ' prof.'} × ${x.alto} alto cm` : '';
    return `- id ${x.id} | ${x.tipo || ''} ${x.nombre || ''} | colección ${x.linea || ''} | ${x.categoria || ''} | ${med} | ${x.material || ''}${x.terminacion ? ' · ' + x.terminacion : ''}${col ? ' | colores: ' + col : ''} | ${precio}${x.disponibilidad ? ' | ' + x.disponibilidad : ''}${x.bajada ? ' | ' + x.bajada : ''}`;
  });
  const conf = (Array.isArray(cf) ? cf : []).map(r => `${r.key}: ${r.value}`).join('\n');
  CACHE = { t: Date.now(), ids: new Set((Array.isArray(pr) ? pr : []).map(x => String(x.id))), txt: lineas.join('\n') + (conf ? '\n\nDatos de la tienda:\n' + conf : '') };
  return CACHE;
}

const REGLAS = `Sos el asistente de la tienda online FORMA Concept (muebles de diseño en madera, acero y laca, Buenos Aires). Respondés en español rioplatense, con calidez y en pocas oraciones (máximo 5), sin markdown ni listas largas.
Usá SOLO la información de abajo (catálogo y condiciones). Si algo no está, decilo y ofrecé escribir por WhatsApp al +54 11 3944 3055. Nunca inventes medidas, precios, plazos ni stock.
Para elegir por espacio, compará con las medidas del catálogo y dejá margen de circulación (unos 70-90 cm alrededor de una mesa de comedor).
Condiciones: preventa con entrega estimada en marzo 2027. Envío gratis en CABA (martes, jueves y sábados) y GBA (jueves y sábados); envío express 24 h con costo; al interior por transporte, a cotizar; retiro sin costo en el depósito de Lanús. Pagos: Mercado Pago (hasta 3 cuotas sin interés) o transferencia bancaria con descuento. Garantía legal de 6 meses. Arrepentimiento dentro de los 10 días. Hay precios para profesionales (arquitectos, estudios, comercios) en la sección Profesionales. FRM Studio es el estudio de arquitectura e interiorismo detrás de la tienda.
Al final, en una línea aparte, escribí exactamente "PRODUCTOS:" seguido de los id de hasta 4 productos del catálogo que recomiendes, separados por coma (o nada si no corresponde).`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usá POST' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'El buscador todavía no está activo.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const q = String(body.q || '').trim().slice(0, 300);
    if (q.length < 3) return res.status(400).json({ error: 'Escribí tu pregunta.' });
    const hist = (Array.isArray(body.h) ? body.h : []).slice(-4).flatMap(x => [
      { role: 'user', content: String(x.q || '').slice(0, 300) }, { role: 'assistant', content: String(x.a || '').slice(0, 1200) }]).filter(m => m.content);
    const cat = await catalogo();
    const client = new Anthropic();
    const pedido = {
      model: 'claude-opus-5-5',
      max_tokens: 1500,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: REGLAS + '\n\nCatálogo:\n' + cat.txt, cache_control: { type: 'ephemeral' } }],
      messages: [...hist, { role: 'user', content: q }],
    };
    let r;
    try { r = await client.beta.messages.create({ ...pedido, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }); }
    catch (e) { if (!(e instanceof Anthropic.BadRequestError)) throw e; r = await client.messages.create(pedido); }
    if (r.stop_reason === 'refusal') return res.status(200).json({ respuesta: 'Esa consulta no la puedo responder acá. Escribinos por WhatsApp y te ayudamos.', productos: [] });
    const txt = r.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    const m = txt.match(/PRODUCTOS:\s*(.*)$/im);
    const productos = m ? m[1].split(/[,\s]+/).map(s => s.trim()).filter(id => cat.ids.has(id)).slice(0, 4) : [];
    const respuesta = txt.replace(/\n?PRODUCTOS:.*$/im, '').trim();
    return res.status(200).json({ respuesta, productos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No pude responder ahora. Escribinos por WhatsApp y te ayudamos.' });
  }
}
