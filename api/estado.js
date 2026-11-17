// Un admin cambia el estado de un pedido. Si pasa a "en camino" o "entregado", se avisa al cliente por mail.
import { sendMail, layout, esc } from './_mail.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const ESTADOS = ['pendiente', 'pagado', 'en_camino', 'entregado', 'cancelado'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const KEY = process.env.SUPABASE_SECRET_KEY;
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const chk = await fetch(SB + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
    if (!chk.ok || (await chk.json()) !== true) return res.status(403).json({ error: 'No autorizado' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const id = parseInt(body.id), estado = String(body.estado || '');
    if (!id || !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Datos inválidos' });
    const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const [o] = await (await fetch(`${SB}/rest/v1/orders?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ estado }) })).json();
    if (!o) return res.status(404).json({ error: 'Pedido no encontrado' });
    let mail = false;
    const nombre = esc((o.nombre || '').split(' ')[0]);
    if (estado === 'en_camino' && o.email) mail = (await sendMail({ to: o.email, subject: `Tu pedido #${o.id} está en camino`, html: layout(`${nombre ? nombre + ', t' : 'T'}u pedido está en camino`, `<p style="font-size:14px;line-height:1.6">Tu pedido <b>#${o.id}</b> salió para tu casa. Te escribimos por WhatsApp con la franja horaria de entrega.</p><p style="font-size:14px;line-height:1.6">Al recibirlo, revisá el embalaje. Si ves algún daño, sacale fotos y escribinos dentro de las 48 h.</p>`) })).ok;
    if (estado === 'entregado' && o.email) mail = (await sendMail({ to: o.email, subject: `¡Que lo disfrutes! · Pedido #${o.id}`, html: layout(`¡Que lo disfrutes${nombre ? ', ' + nombre : ''}!`, `<p style="font-size:14px;line-height:1.6">Tu pedido <b>#${o.id}</b> figura como entregado. Gracias por elegir FORMA Concept.</p><p style="font-size:14px;line-height:1.6">Si nos mandás una foto de cómo quedó en tu casa, nos encanta verla. Podés etiquetarnos en Instagram <b>@forma.concept</b>.</p>`) })).ok;
    return res.status(200).json({ ok: true, mail });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error inesperado' }); }
}
