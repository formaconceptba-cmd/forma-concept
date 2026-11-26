// Mails de promociones a toda la lista (suscriptores + clientes que compraron), sin los que se dieron de baja.
// POST /api/campania (sólo admin) {accion:'contar'} → {n}
//                                 {accion:'prueba'|'enviar', asunto, titulo, texto, boton, link, codigo} → {enviados}
// GET  /api/campania?baja=<mail>&t=<firma> → da de baja ese mail (link al pie de cada mail).
import crypto from 'crypto';
import { layout, esc, ADMIN_MAIL } from './_mail.js';
const SBU = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const SITE = 'https://www.formaconceptba.com';
const sb = (path, opts = {}) => fetch(SBU + '/rest/v1/' + path, { ...opts, headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
const firma = m => crypto.createHmac('sha256', process.env.SUPABASE_SECRET_KEY || 'x').update(m).digest('hex').slice(0, 20);
const okMail = m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);

async function esAdmin(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth) return null;
  const r = await fetch(SBU + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  if (!(r.ok && (await r.json()) === true)) return null;
  const u = await fetch(SBU + '/auth/v1/user', { headers: { apikey: PUB, Authorization: auth } });
  return u.ok ? ((await u.json()).email || ADMIN_MAIL) : ADMIN_MAIL;
}
async function lista() {
  const j = async p => { try { const r = await sb(p); return r.ok ? await r.json() : []; } catch (e) { return []; } };
  const [s, o, b] = await Promise.all([j('suscriptores?select=email'), j('orders?select=email&email=not.is.null'), j('mail_bajas?select=email')]);
  const baja = new Set(b.map(x => String(x.email).toLowerCase()));
  return [...new Set([...s, ...o].map(x => String(x.email || '').trim().toLowerCase()).filter(m => okMail(m) && !baja.has(m)))];
}
function html(d, to) {
  const parr = String(d.texto || '').split(/\n\s*\n/).map(p => `<p style="font-size:15px;line-height:1.55;margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const cod = d.codigo ? `<div style="margin:18px 0;padding:16px;border:1px dashed #141414;text-align:center;font-size:13px">Tu código de descuento<br><b style="font-size:22px;letter-spacing:.08em">${esc(d.codigo)}</b></div>` : '';
  const link = d.link || SITE + (d.codigo ? '/?cupon=' + encodeURIComponent(d.codigo) : '');
  const btn = `<a href="${esc(link)}" style="display:inline-block;background:#141414;color:#fff;text-decoration:none;padding:14px 28px;font-size:14px;margin-top:6px">${esc(d.boton || 'Ver la tienda')}</a>`;
  const baja = to ? `<p style="color:#9a9a9a;font-size:11px;margin-top:22px">¿No querés recibir más estos mails? <a href="${SITE}/api/campania?baja=${encodeURIComponent(to)}&t=${firma(to)}" style="color:#9a9a9a">Darme de baja</a></p>` : '';
  return layout(esc(d.titulo || d.asunto), parr + cod + btn + baja);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const m = String(req.query.baja || '').trim().toLowerCase();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!okMail(m) || req.query.t !== firma(m)) return res.status(400).send('<p style="font-family:sans-serif;padding:40px">El link no es válido.</p>');
    await sb('mail_bajas', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ email: m }) });
    return res.send('<div style="font-family:Helvetica,Arial,sans-serif;padding:60px 24px;text-align:center"><h2 style="font-weight:400">Listo, no te mandamos más promociones.</h2><p>Los mails de tus compras te van a seguir llegando.</p><a href="' + SITE + '">Volver a FORMA Concept</a></div>');
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const yo = await esAdmin(req);
  if (!yo) return res.status(401).json({ error: 'Sólo admin' });
  const d = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (d.accion === 'contar') return res.json({ n: (await lista()).length, resend: !!process.env.RESEND_API_KEY });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Falta la clave de Resend (RESEND_API_KEY) en Vercel.' });
  if (!String(d.asunto || '').trim() || !String(d.texto || '').trim()) return res.status(400).json({ error: 'Falta el asunto o el texto.' });
  const para = d.accion === 'prueba' ? [yo] : await lista();
  let enviados = 0;
  for (let i = 0; i < para.length; i += 100) {
    const lote = para.slice(i, i + 100).map(to => ({ from: 'FORMA Concept <hola@formaconceptba.com>', to: [to], reply_to: ADMIN_MAIL, subject: (d.accion === 'prueba' ? '[PRUEBA] ' : '') + String(d.asunto).slice(0, 150), html: html(d, to) }));
    const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(lote) });
    if (r.ok) enviados += lote.length; else console.error('resend batch', await r.text());
  }
  return res.json({ enviados, total: para.length });
}
