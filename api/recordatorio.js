// Un admin manda un mail de recordatorio a un cliente que empezó a pagar y no terminó.
// Variables de entorno (Vercel): SUPABASE_SECRET_KEY, RESEND_API_KEY
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const SITE = 'https://www.formaconceptba.com';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ars = n => '$' + Math.round(n).toLocaleString('es-AR');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const KEY = process.env.SUPABASE_SECRET_KEY, RK = process.env.RESEND_API_KEY;
  if (!KEY || !RK) return res.status(503).json({ error: 'Falta configurar RESEND_API_KEY en Vercel.' });
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const chk = await fetch(SB + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
    if (!chk.ok || (await chk.json()) !== true) return res.status(403).json({ error: 'No autorizado' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const id = parseInt(body.id);
    const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
    const [o] = await (await fetch(`${SB}/rest/v1/orders?select=*,order_items(*,products(tipo,nombre,img))&id=eq.${id}`, { headers: H })).json();
    if (!o) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (o.estado !== 'pendiente') return res.status(400).json({ error: 'Ese pedido ya no está pendiente' });

    const nombre = (o.nombre || '').split(' ')[0];
    const filas = (o.order_items || []).map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.cantidad} × ${esc(i.products ? i.products.tipo + ' ' + i.products.nombre : i.product_id)}${i.color ? ' · ' + esc(i.color) : ''}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${ars(i.precio * i.cantidad)}</td></tr>`).join('');
    const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#141414;max-width:520px;margin:auto;padding:24px">
      <div style="font-size:22px;font-weight:500;letter-spacing:-.02em;margin-bottom:24px">forma</div>
      <p>Hola ${esc(nombre)},</p>
      <p>Vimos que te quedó una compra sin terminar en FORMA Concept. Te guardamos el pedido con el precio de preventa:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${filas}<tr><td style="padding:10px 0"><b>Total</b></td><td style="padding:10px 0;text-align:right"><b>${ars(o.total)}</b></td></tr></table>
      <p style="margin:24px 0"><a href="${SITE}/#tienda" style="background:#141414;color:#fff;text-decoration:none;padding:14px 22px;display:inline-block;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Terminar mi compra</a></p>
      <p style="color:#77756F;font-size:13px">¿Tuviste algún problema con el pago o una duda? Respondé este mail o escribinos por WhatsApp al +54 11 3944 3055.</p>
      <p style="color:#77756F;font-size:12px;margin-top:28px">FORMA Concept · DEL GRUPPO S.R.L.</p></div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + RK, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'FORMA Concept <hola@formaconceptba.com>', to: [o.email], reply_to: 'formaconcept.ba@gmail.com', subject: `${nombre ? nombre + ', t' : 'T'}e quedó tu pedido en FORMA Concept`, html })
    });
    if (!r.ok) { console.error('resend', await r.text()); return res.status(502).json({ error: 'Resend no pudo enviar el mail' }); }
    await fetch(`${SB}/rest/v1/orders?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ recordado_at: new Date().toISOString() }) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error inesperado' });
  }
}
