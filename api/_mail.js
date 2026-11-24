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
