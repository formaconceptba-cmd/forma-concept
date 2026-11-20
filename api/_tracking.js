// Seguimiento del lado del servidor: Meta Conversions API y GA4 Measurement Protocol.
// La venta (Purchase) sale SIEMPRE de acá cuando el pago queda aprobado, nunca sólo de la página de gracias.
// Variables de entorno (Vercel): META_CAPI_TOKEN, GA4_API_SECRET. Los IDs públicos (pixel y GA4) están en la tabla config_pub.
// Nada de datos personales sin hashear hacia Meta, y nada de datos de tarjeta en ningún lado.
import { createHash } from 'node:crypto';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const sb = (path, opts = {}) => fetch(SB + '/rest/v1/' + path, {
  ...opts,
  headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) }
});
const h = v => v ? createHash('sha256').update(String(v)).digest('hex') : undefined;
const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const telE164 = t => { let d = String(t || '').replace(/\D/g, '').replace(/^0+/, ''); if (!d) return ''; if (!d.startsWith('54')) d = '54' + d; return d; };

let CFG = null, CFG_T = 0;
async function cfg() {
  if (CFG && Date.now() - CFG_T < 60000) return CFG;
  try { const r = await (await sb('config_pub?select=key,value')).json(); CFG = Object.fromEntries(r.map(x => [x.key, x.value])); CFG_T = Date.now(); } catch (e) { CFG = CFG || {}; }
  return CFG;
}

async function log(rows) { try { await sb('tracking_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); } catch (e) { console.error('tracking_log', e); } }

export function userData({ email, telefono, nombre, cp, ip, ua, fbp, fbc }) {
  const [fn, ...ln] = norm(nombre).split(/\s+/).filter(Boolean);
  const ud = { em: email ? [h(norm(email).replace(/\s/g, ''))] : undefined, ph: telefono ? [h(telE164(telefono))] : undefined, fn: fn ? [h(fn)] : undefined, ln: ln.length ? [h(ln.join(' '))] : undefined,
    zp: cp ? [h(norm(cp).replace(/\s/g, ''))] : undefined, country: [h('ar')], client_ip_address: ip || undefined, client_user_agent: ua || undefined, fbp: fbp || undefined, fbc: fbc || undefined };
  Object.keys(ud).forEach(k => ud[k] === undefined && delete ud[k]);
  return ud;
}

// Manda un evento a Meta. Devuelve {ok,status,respuesta}.
export async function metaEvento(ev, meta = {}) {
  const c = await cfg(), pixel = c.meta_pixel_id, token = process.env.META_CAPI_TOKEN;
  const base = { destino: 'meta', evento: ev.event_name, pedido_id: meta.pedido || null, event_id: ev.event_id, con_em: !!(ev.user_data && ev.user_data.em), con_fbc: !!(ev.user_data && ev.user_data.fbc) };
  if (!pixel || !token) { if (meta.logSinConfig) await log([{ ...base, ok: false, status: 0, respuesta: 'Meta sin configurar (falta el ID del pixel o el token)' }]); return { ok: false, status: 0 }; }
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [ev] }) });
    const t = await r.text();
    await log([{ ...base, ok: r.ok, status: r.status, respuesta: t.slice(0, 500) }]);
    return { ok: r.ok, status: r.status, respuesta: t };
  } catch (e) { await log([{ ...base, ok: false, status: -1, respuesta: String(e).slice(0, 500) }]); return { ok: false, status: -1 }; }
}

export async function ga4Evento(clientId, events, meta = {}) {
  const c = await cfg(), id = c.ga4_id, secret = process.env.GA4_API_SECRET;
  const base = { destino: 'ga4', evento: events[0] && events[0].name, pedido_id: meta.pedido || null, event_id: meta.event_id || null, con_em: false, con_fbc: false };
  if (!id || !secret) { if (meta.logSinConfig) await log([{ ...base, ok: false, status: 0, respuesta: 'GA4 sin configurar (falta el ID de medición o el API secret)' }]); return { ok: false, status: 0 }; }
  try {
    const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(secret)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId || ('srv.' + Date.now()), events }) });
    await log([{ ...base, ok: r.ok || r.status === 204, status: r.status, respuesta: (await r.text()).slice(0, 300) || 'ok' }]);
    return { ok: r.ok };
  } catch (e) { await log([{ ...base, ok: false, status: -1, respuesta: String(e).slice(0, 500) }]); return { ok: false }; }
}

// La venta: se llama cuando el pedido pasa a pagado (webhook de Mercado Pago o transferencia confirmada).
export async function enviarCompra(orderId) {
  try {
    const [o] = await (await sb(`orders?select=*,order_items(product_id,cantidad,precio)&id=eq.${orderId}`)).json();
    if (!o) return;
    const t = o.tracking || {}, items = o.order_items || [];
    const event_id = String(o.id);
    const ev = {
      event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id, action_source: 'website',
      event_source_url: t.checkout_url || 'https://www.formaconceptba.com/#checkout',
      user_data: userData({ email: o.email, telefono: o.telefono, nombre: o.nombre, cp: o.cp, ip: t.ip, ua: t.user_agent, fbp: t.fbp, fbc: t.fbc }),
      custom_data: { currency: 'ARS', value: Math.round(o.total), contents: items.map(i => ({ id: i.product_id, quantity: i.cantidad, item_price: i.precio })), content_type: 'product', order_id: event_id }
    };
    await Promise.all([
      metaEvento(ev, { pedido: o.id, logSinConfig: true }),
      ga4Evento(t.ga_client_id, [{ name: 'purchase', params: { transaction_id: event_id, currency: 'ARS', value: Math.round(o.total), items: items.map(i => ({ item_id: i.product_id, quantity: i.cantidad, price: i.precio })) } }], { pedido: o.id, event_id, logSinConfig: true })
    ]);
  } catch (e) { console.error('enviarCompra', e); }
}
