// Pedidos sin pagar que pasaron el plazo ("Horas para pagar"): se cancelan, se libera la reserva y,
// si eran por transferencia, se le avisa al cliente con la plantilla "vencido".
// Lo dispara el cron de Vercel (todos los días) o un admin desde el panel.
import { sendPlantilla, layout, esc } from './_mail.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';

export default async function handler(req, res) {
  const KEY = process.env.SUPABASE_SECRET_KEY;
  if (!KEY) return res.status(503).json({ error: 'Falta SUPABASE_SECRET_KEY' });
  try {
    const ua = String(req.headers['user-agent'] || ''), auth = String(req.headers.authorization || '');
    let ok = process.env.CRON_SECRET ? auth === 'Bearer ' + process.env.CRON_SECRET : ua.startsWith('vercel-cron');
    if (!ok && auth) {
      const chk = await fetch(SB + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
      ok = chk.ok && (await chk.json()) === true;
    }
    if (!ok) return res.status(403).json({ error: 'No autorizado' });
    const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const [c] = await (await fetch(`${SB}/rest/v1/cobro_transf?select=horas&id=eq.1`, { headers: H })).json();
    const horas = (c && c.horas) || 48, limite = new Date(Date.now() - horas * 3600e3).toISOString();
    const vencidos = await (await fetch(`${SB}/rest/v1/orders?estado=eq.pendiente&created_at=lt.${encodeURIComponent(limite)}`, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: 'cancelado' }) })).json();
    let mails = 0;
    for (const o of Array.isArray(vencidos) ? vencidos : []) {
      if (o.medio_pago !== 'transferencia' || !o.email) continue;
      const nombre = (o.nombre || '').split(' ')[0];
      const r = await sendPlantilla('vencido', o.email, { nombre, pedido: o.id, horas }, { subject: `Tu pedido #${o.id} se canceló`, html: layout(`Tu pedido #${o.id} se canceló`, `<p style="font-size:14px;line-height:1.6">${esc(nombre)}, no recibimos la transferencia dentro de las ${horas} horas, así que lo cancelamos y liberamos los productos.</p>`) });
      if (r.ok) mails++;
    }
    return res.status(200).json({ ok: true, cancelados: Array.isArray(vencidos) ? vencidos.length : 0, mails });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error inesperado' }); }
}
