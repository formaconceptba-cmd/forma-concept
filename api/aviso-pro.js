// Un profesional reservó en el contenedor: aviso a FORMA y confirmación al profesional.
import { sendMail, layout, tablaItems, ars, esc, ADMIN_MAIL } from './_mail.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const H = { apikey: PUB, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    // Con la sesión del profesional sólo puede leer sus propias reservas (RLS).
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const [o] = await (await fetch(`${SB}/rest/v1/pedidos_pro?select=*&order=created_at.desc&limit=1${body.id ? '&id=eq.' + parseInt(body.id) : ''}`, { headers: H })).json();
    if (!o) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (Date.now() - new Date(o.created_at) > 10 * 60 * 1000) return res.status(200).json({ ok: true, viejo: true });
    const its = (o.items || []).map(i => ({ q: i.q, precio: i.precio, color: i.color, nombre: i.producto }));
    const det = tablaItems(its) + `<p style="font-size:14px">${(+o.cbm).toFixed(2)} m³ · <b>${ars(o.total)}</b> (IVA incluido)</p>`;
    await sendMail({ to: ADMIN_MAIL, subject: `Nueva reserva profesional #${o.id} · ${esc(o.estudio || o.nombre)}`, html: layout(`Reserva profesional #${o.id}`, `<p style="font-size:14px">${esc(o.nombre)} · ${esc(o.estudio || '')} · ${esc(o.email)}</p>${det}<p><a href="https://www.formaconceptba.com/admin">Abrir el panel</a></p>`) });
    await sendMail({ to: o.email, subject: `Recibimos tu reserva #${o.id} · FORMA PRO`, html: layout('Recibimos tu reserva', `<p style="font-size:14px;line-height:1.6">Sumamos estos productos a tu pedido en el contenedor compartido. Te avisamos cuando se complete para confirmarlo.</p>${det}<p style="font-size:13px;color:#77756F">Podés ver tu pedido completo en <a href="https://www.formaconceptba.com/#pro-pedido">FORMA PRO</a>.</p>`) });
    return res.status(200).json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error inesperado' }); }
}
