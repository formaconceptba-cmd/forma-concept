// Respaldo semanal: exporta las tablas importantes a CSV y las manda por mail a FORMA.
// Lo dispara el cron de Vercel (vercel.json, lunes 9 h) o un admin desde el panel ("Mandar respaldo ahora").
import { sendMail, layout, ADMIN_MAIL } from './_mail.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const TABLAS = ['master_productos', 'master_historial', 'master_listas', 'products', 'catalogo_pro', 'settings', 'eco_param', 'eco_pedidos', 'eco_items', 'eco_recepcion', 'eco_movimientos', 'orders', 'order_items', 'pedidos_pro', 'precio_historial', 'ads_campania'];

const csvCelda = v => { if (v == null) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function aCSV(rows) {
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => csvCelda(r[c])).join(','))].join('\n');
}
async function leer(t) {
  const H = { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY };
  const out = [];
  for (let from = 0; from < 100000; from += 1000) {
    const r = await fetch(`${SB}/rest/v1/${t}?select=*`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(t + ': ' + (await r.text()).slice(0, 200));
    const d = await r.json(); out.push(...d); if (d.length < 1000) break;
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const ua = String(req.headers['user-agent'] || ''), auth = String(req.headers.authorization || '');
    let ok = process.env.CRON_SECRET ? auth === 'Bearer ' + process.env.CRON_SECRET : ua.startsWith('vercel-cron');
    if (!ok && auth) { const c = await fetch(SB + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' }); ok = c.ok && (await c.json()) === true; }
    if (!ok) return res.status(403).json({ error: 'No autorizado' });
    const fecha = new Date().toISOString().slice(0, 10), att = [], resumen = [];
    for (const t of TABLAS) {
      try { const rows = await leer(t); att.push({ filename: `${fecha}_${t}.csv`, content: Buffer.from(aCSV(rows), 'utf8').toString('base64') }); resumen.push(`${t}: ${rows.length}`); }
      catch (e) { resumen.push(`${t}: ERROR ${e.message}`); }
    }
    const r = await sendMail({ to: ADMIN_MAIL, subject: `Respaldo semanal FORMA Concept · ${fecha}`, attachments: att,
      html: layout('Respaldo semanal', `<p style="font-size:14px;line-height:1.6">Adjuntos van los datos del panel en CSV (se abren con Excel o Google Sheets). Guardalos en Drive: si algún día se borra algo por error, de acá se recupera.</p><p style="font-size:13px;color:#77756F">${resumen.join('<br>')}</p>`) });
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok, tablas: resumen });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Error inesperado' }); }
}
