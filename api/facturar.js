// GET/POST /api/facturar            → procesa la cola de facturas (lo llama el cron cada 15 min, el pago y el panel).
// GET /api/facturar?estado=1        → cómo está la conexión (entorno y si las claves están cargadas).
// POST /api/facturar {prueba:true}  → (sólo admin) emite en HOMOLOGACIÓN una factura B y su nota de crédito de prueba y devuelve los PDF. No toca la base.
import { procesarCola } from './_facturas.js';
import { entornoActual, tieneClave, ultimoNumero, solicitarCAE, armarPDF, datosPedido, configFactura, hoy } from './_arca.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';

async function esAdmin(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth) return false;
  const r = await fetch(SB + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}

async function prueba(pedido) {
  const ent = 'homo', cfg = await configFactura();
  const d = pedido ? await datosPedido(pedido) : { o: { total: 12100 }, lineas: [{ q: 1, unit: 12100, desc: 'Producto de prueba' }], docTipo: 96, docNro: 12345678, medio: 'Mercado Pago', cliente: { nombre: 'Cliente de prueba', direccion: 'Calle Falsa 123, CABA' } };
  const total = Math.round(+d.o.total * 100) / 100, fecha = hoy(), ref = pedido || 0;
  const nB = (await ultimoNumero(ent, 6)) + 1;
  const b = await solicitarCAE(ent, { tipo: 'B', numero: nB, fecha, total, docTipo: d.docTipo, docNro: d.docNro });
  if (!b.ok) return { ok: false, paso: 'factura', error: b.error };
  const pdfB = await armarPDF({ ent, tipo: 'B', numero: nB, fecha, cae: b.cae, cae_vto: b.cae_vto, total, docTipo: d.docTipo, docNro: d.docNro, cliente: d.cliente, lineas: d.lineas, pedido: ref, medio: d.medio, cfg });
  const nN = (await ultimoNumero(ent, 8)) + 1, asoc = { numero: nB, fecha };
  const nc = await solicitarCAE(ent, { tipo: 'NC-B', numero: nN, fecha, total, docTipo: d.docTipo, docNro: d.docNro, asoc });
  if (!nc.ok) return { ok: false, paso: 'nota de crédito', error: nc.error, factura: { numero: nB, cae: b.cae, pdf: pdfB.toString('base64') } };
  const pdfN = await armarPDF({ ent, tipo: 'NC-B', numero: nN, fecha, cae: nc.cae, cae_vto: nc.cae_vto, total, docTipo: d.docTipo, docNro: d.docNro, cliente: d.cliente, lineas: [{ q: 1, unit: total, desc: `Anulación de la compra - pedido web #${ref}` }], asoc, pedido: ref, medio: d.medio, cfg });
  return { ok: true, factura: { numero: nB, cae: b.cae, cae_vto: b.cae_vto, obs: b.obs, pdf: pdfB.toString('base64') }, nc: { numero: nN, cae: nc.cae, cae_vto: nc.cae_vto, pdf: pdfN.toString('base64') } };
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_SECRET_KEY) return res.status(503).json({ error: 'Falta SUPABASE_SECRET_KEY' });
  try {
    const q = req.query || {}, body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (q.estado) return res.status(200).json({ entorno: entornoActual(), clave_homo: tieneClave('homo'), clave_prod: tieneClave('prod') });
    if (body.prueba) {
      if (!(await esAdmin(req))) return res.status(403).json({ error: 'No autorizado' });
      if (!tieneClave('homo')) return res.status(400).json({ error: 'Falta cargar ARCA_KEY_HOMO en Vercel' });
      return res.status(200).json(await prueba(parseInt(body.pedido) || null));
    }
    return res.status(200).json(await procesarCola({ orderId: parseInt(body.pedido || q.pedido) || undefined }));
  } catch (e) { console.error(e); return res.status(500).json({ error: String(e.message || e).slice(0, 300) }); }
}
