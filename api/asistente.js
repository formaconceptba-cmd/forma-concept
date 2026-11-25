// POST /api/asistente {q, h:[{q,a}], pantalla}  (sólo admin) → {respuesta}
// GET  /api/asistente?estado=1 → {activo}
// Asistente del panel: explica cómo se usa cada pantalla y responde con los datos actuales del negocio.
import Anthropic from '@anthropic-ai/sdk';
import { sb, entornoActual, tieneClave } from './_arca.js';
import { MANUAL } from './_manual.js';
const SBU = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const ars = n => '$' + Math.round(+n || 0).toLocaleString('es-AR');

async function esAdmin(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth) return false;
  const r = await fetch(SBU + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}
const j = async p => { try { const r = await sb(p); return r.ok ? await r.json() : []; } catch (e) { return []; } };

/* foto del momento: lo justo para responder "¿qué tengo pendiente?" o "¿cuánto vendí?" */
async function situacion() {
  const desde = new Date(Date.now() - 60 * 864e5).toISOString();
  const [os, fs, ped, its, ms, pr, cf] = await Promise.all([
    j(`orders?select=id,estado,total,medio_pago,created_at,nombre&created_at=gte.${encodeURIComponent(desde)}&order=id.desc&limit=200`),
    j('facturas?select=order_id,tipo,estado,error,entorno&estado=in.(pendiente,error,procesando)'),
    j('eco_pedidos?select=id,nombre,proveedor,estado,created_at'),
    j('eco_items?select=pedido_id,codigo,cant'),
    j('master_productos?select=codigo,proveedor,archivado&limit=5000'),
    j('products?select=id,tipo,nombre,activo'),
    j('config_tienda?select=key,value&key=like.fact_*'),
  ]);
  const porEstado = {}; os.forEach(o => { porEstado[o.estado] = (porEstado[o.estado] || 0) + 1; });
  const pagos = os.filter(o => ['pagado', 'en_camino', 'entregado'].includes(o.estado));
  const C = Object.fromEntries(cf.map(x => [x.key, x.value]));
  return [
    `Hoy: ${new Date().toLocaleDateString('es-AR')}.`,
    `Pedidos últimos 60 días por estado: ${JSON.stringify(porEstado)}. Vendido (pagados/en camino/entregados): ${ars(pagos.reduce((a, o) => a + (+o.total || 0), 0))} en ${pagos.length} pedidos. Últimos: ${os.slice(0, 8).map(o => `#${o.id} ${o.estado} ${ars(o.total)}`).join(', ')}.`,
    `Facturación ARCA: ${entornoActual() === 'prod' ? 'producción (emite de verdad)' : 'modo prueba (no emite real)'}; clave prueba ${tieneClave('homo') ? 'cargada' : 'falta'}, clave producción ${tieneClave('prod') ? 'cargada' : 'falta'}. Facturas sin CAE: ${fs.map(f => `pedido #${f.order_id} ${f.tipo} ${f.estado}${f.error ? ' (' + String(f.error).slice(0, 80) + ')' : ''}`).join('; ') || 'ninguna'}. Datos de factura: domicilio ${C.fact_domicilio ? 'cargado' : 'FALTA'}, IIBB ${C.fact_iibb ? 'cargado' : 'FALTA'}, inicio de actividades ${C.fact_inicio ? 'cargado' : 'FALTA'}.`,
    `Contenedores: ${ped.map(p => `${p.nombre} (${p.proveedor || 's/prov'}, ${p.estado}, ${its.filter(i => i.pedido_id === p.id).length} productos, ${its.filter(i => i.pedido_id === p.id).reduce((a, i) => a + (+i.cant || 0), 0)} unidades)`).join('; ') || 'ninguno'}.`,
    `Maestro: ${ms.filter(m => !m.archivado).length} productos activos de ${new Set(ms.map(m => m.proveedor)).size} proveedores. Tienda: ${pr.filter(p => p.activo).length} productos publicados de ${pr.length}.`,
  ].join('\n');
}

const REGLAS = `Sos el asistente interno del panel de administración de FORMA Concept (tienda online de muebles importados y nacionales, Buenos Aires). Ayudás a Franco y a cualquier persona nueva del equipo a usar el panel y a resolver temas administrativos.
Respondé en español rioplatense, claro y sin jerga; si usás un término técnico, explicalo. Cuando te pregunten cómo hacer algo, dalo en pasos numerados cortos, nombrando la pantalla exacta del menú (por ejemplo "Importación → Contenedores"). Sé breve.
Usá el manual y la situación actual de abajo. Si algo no está, decilo y sugerí a quién o dónde consultar; no inventes datos, números ni pantallas.
No des asesoramiento contable, legal ni impositivo definitivo: explicá lo general y sugerí confirmarlo con el contador.`;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.status(200).json({ activo: !!process.env.ANTHROPIC_API_KEY });
    if (!(await esAdmin(req))) return res.status(403).json({ error: 'No autorizado' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ respuesta: 'Todavía no está cargada la clave ANTHROPIC_API_KEY en Vercel, así que no puedo responder. Mirá "Alertas / pendientes": ahí están los pasos.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const q = String(body.q || '').trim().slice(0, 1000);
    if (q.length < 2) return res.status(400).json({ error: 'Escribí tu pregunta.' });
    const hist = (Array.isArray(body.h) ? body.h : []).slice(-6).flatMap(x => [
      { role: 'user', content: String(x.q || '').slice(0, 1000) }, { role: 'assistant', content: String(x.a || '').slice(0, 3000) }]).filter(m => m.content);
    const sit = await situacion();
    const pedido = {
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: REGLAS + '\n\nMANUAL DEL PANEL:\n' + MANUAL, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'SITUACIÓN ACTUAL:\n' + sit + (body.pantalla ? `\nLa persona está mirando la pantalla "${String(body.pantalla).slice(0, 40)}".` : '') },
      ],
      messages: [...hist, { role: 'user', content: q }],
    };
    const client = new Anthropic();
    let r;
    try { r = await client.beta.messages.create({ ...pedido, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }); }
    catch (e) { if (!(e instanceof Anthropic.BadRequestError)) throw e; r = await client.messages.create(pedido); }
    if (r.stop_reason === 'refusal') return res.status(200).json({ respuesta: 'Eso no lo puedo responder.' });
    return res.status(200).json({ respuesta: r.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No pude responder ahora: ' + String(e.message || e).slice(0, 200) });
  }
}
