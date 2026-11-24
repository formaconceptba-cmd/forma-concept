// Envío de mails con Resend. Si falta RESEND_API_KEY no hace nada (no rompe la compra).
export const ADMIN_MAIL = 'formaconcept.ba@gmail.com';
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const ars = n => '$' + Math.round(+n || 0).toLocaleString('es-AR');

export function layout(titulo, cuerpo) {
  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#141414;max-width:560px;margin:auto;padding:28px 24px;background:#F7F7F5">
  <div style="font-size:24px;font-weight:500;letter-spacing:-.02em;margin-bottom:28px">forma</div>
  <h1 style="font-size:22px;font-weight:400;margin:0 0 16px">${titulo}</h1>${cuerpo}
  <p style="color:#77756F;font-size:12px;margin-top:32px;border-top:1px solid #DDDBD6;padding-top:14px">FORMA Concept · DEL GRUPPO S.R.L. · WhatsApp +54 11 3944 3055 · formaconceptba.com</p></div>`;
}
export function tablaItems(items) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #DDDBD6">${i.q} × ${esc(i.nombre)}${i.color ? ' · ' + esc(i.color) : ''}</td><td style="padding:8px 0;border-bottom:1px solid #DDDBD6;text-align:right">${ars(i.precio * i.q)}</td></tr>`).join('')}</table>`;
}
export async function sendMail({ to, subject, html, replyTo, attachments }) {
  const RK = process.env.RESEND_API_KEY;
  if (!RK || !to) return { ok: false, skipped: true };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + RK, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'FORMA Concept <hola@formaconceptba.com>', to: Array.isArray(to) ? to : [to], reply_to: replyTo || ADMIN_MAIL, subject, html, ...(attachments ? { attachments } : {}) })
    });
    if (!r.ok) console.error('resend', await r.text());
    return { ok: r.ok };
  } catch (e) { console.error('resend', e); return { ok: false }; }
}

// Plantillas editables desde el panel (tabla mail_plantillas). Texto plano con {variables}; párrafos separados por línea en blanco.
// {detalle}, {datos_transferencia} y {seguimiento} son HTML armado por el sistema. Si la plantilla no existe se usa el texto de respaldo.
const SBU = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const HTMLV = ['detalle', 'datos_transferencia', 'seguimiento'];
export async function plantilla(clave, vars = {}) {
  const KEY = process.env.SUPABASE_SECRET_KEY;
  let p = null;
  try { const r = await fetch(`${SBU}/rest/v1/mail_plantillas?select=asunto,cuerpo,activo&clave=eq.${clave}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }); [p] = await r.json(); } catch (e) { console.error('plantilla', e); }
  if (!p) return null;
  if (!p.activo) return { skip: true };
  const txt = s => String(s).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null && !HTMLV.includes(k) ? String(vars[k]) : '');
  const pars = String(p.cuerpo).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const html = pars.slice(1).map(par => {
    const solo = par.match(/^\{(\w+)\}$/);
    if (solo && HTMLV.includes(solo[1])) return vars[solo[1]] || '';
    return `<p style="font-size:14px;line-height:1.6">${esc(par).replace(/\{(\w+)\}/g, (m, k) => HTMLV.includes(k) ? (vars[k] || '') : esc(vars[k] ?? '')).replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return { subject: txt(p.asunto), html: layout(esc(txt(pars[0] || '')), html) };
}
// Manda con plantilla; si no hay plantilla, con el respaldo { subject, html }.
export async function sendPlantilla(clave, to, vars, respaldo) {
  if (!to) return { ok: false };
  const t = await plantilla(clave, vars);
  if (t && t.skip) return { ok: false, skipped: true };
  const m = t || respaldo; if (!m) return { ok: false };
  return sendMail({ to, subject: m.subject, html: m.html });
}
