// Eventos del navegador que también se mandan desde el servidor a Meta (ViewContent, AddToCart, InitiateCheckout).
// Llevan el mismo event_id que el pixel del navegador, así Meta no los cuenta dos veces.
import { metaEvento, userData } from './_tracking.js';
const OK = ['ViewContent', 'AddToCart', 'InitiateCheckout'];
const clean = (s, n = 300) => String(s ?? '').slice(0, n);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!OK.includes(b.event_name) || !b.event_id) return res.status(204).end();
    const ip = clean((req.headers['x-forwarded-for'] || '').split(',')[0].trim(), 60), ua = clean(req.headers['user-agent'], 400);
    const cd = b.custom_data || {};
    await metaEvento({
      event_name: b.event_name, event_time: Math.floor(Date.now() / 1000), event_id: clean(b.event_id, 80), action_source: 'website', event_source_url: clean(b.url, 500),
      user_data: userData({ ip, ua, fbp: clean(b.fbp, 120), fbc: clean(b.fbc, 300) }),
      custom_data: { currency: 'ARS', value: Math.round(+cd.value || 0), content_ids: (cd.content_ids || []).slice(0, 30).map(x => clean(x, 40)), content_type: 'product', num_items: +cd.num_items || undefined }
    });
    return res.status(204).end();
  } catch (e) { console.error(e); return res.status(204).end(); }
}
