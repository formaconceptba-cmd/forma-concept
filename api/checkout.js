// Crea el pedido en Supabase y la preferencia de pago en Mercado Pago.
// Variables de entorno (Vercel): MP_ACCESS_TOKEN, SUPABASE_SECRET_KEY
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const SITE = 'https://www.formaconceptba.com';
const PRE = 0.45;

const sb = (path, opts = {}) => fetch(SB + '/rest/v1/' + path, {
  ...opts,
  headers: {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(opts.headers || {})
  }
});

const clean = (s, n = 200) => String(s ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.MP_ACCESS_TOKEN || !process.env.SUPABASE_SECRET_KEY)
    return res.status(503).json({ error: 'El pago todavía no está configurado.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const b = body.buyer || {};
    const buyer = {
      nombre: clean(b.nombre, 120), email: clean(b.email, 160), telefono: clean(b.telefono, 40),
      direccion: clean(b.direccion, 240), cp: clean(b.cp || body.cp, 12)
    };

    const lines = (body.items || []).slice(0, 30).map(l => ({ id: clean(l.id, 40), color: clean(l.color, 60), q: Math.max(1, Math.min(20, parseInt(l.q) || 1)) }));
    if (!lines.length) return res.status(400).json({ error: 'El carrito está vacío.' });

    // Precios y stock salen de la base, nunca del navegador.
    const ids = [...new Set(lines.map(l => l.id))];
    const pr = await sb(`products?select=id,tipo,nombre,precio_lista,precio_preventa,unidades,vendidas,activo&id=in.(${ids.map(encodeURIComponent).join(',')})`);
    const prods = Object.fromEntries((await pr.json()).map(p => [p.id, p]));
    const items = [];
    for (const l of lines) {
      const p = prods[l.id];
      if (!p || !p.activo || !p.precio_lista) return res.status(400).json({ error: 'Un producto ya no está disponible.' });
      const libre = (p.unidades || 0) - (p.vendidas || 0) - lines.filter(x => x.id === l.id && x !== l).reduce((a, x) => a + x.q, 0);
      if (l.q > libre) return res.status(409).json({ error: `No queda stock suficiente de ${p.tipo} ${p.nombre}.` });
      items.push({ p, q: l.q, color: l.color, precio: p.precio_preventa || Math.ceil(p.precio_lista * (1 - PRE) / 1000) * 1000 });
    }
    const ENVIOS = { gratis: 'Envío gratis (día a coordinar)', express: 'Envío express 24 h', retiro: 'Retiro en Buenos Aires', interior: 'Envío al interior (a cotizar)' };
    const cpN = parseInt(body.cp, 10), zona = cpN >= 1000 && cpN <= 9999 ? (cpN < 1500 ? 'caba' : cpN < 1900 ? 'gba' : 'int') : null;
    let envio = ENVIOS[body.envio] ? body.envio : 'gratis';
    if (zona === 'int' && (envio === 'gratis' || envio === 'express')) envio = 'interior';
    if (zona && zona !== 'int' && envio === 'interior') envio = 'gratis';
    let costoEnvio = 0;
    if (envio === 'express') { const [s] = await (await sb('settings?select=value&key=eq.envio_express')).json(); costoEnvio = Math.round(+((s && s.value) || 35000)); }
    const total = items.reduce((a, i) => a + i.precio * i.q, 0) + costoEnvio;

    const or = await sb('orders', { method: 'POST', body: JSON.stringify({ ...buyer, envio: ENVIOS[envio], costo_envio: costoEnvio, total, visitante: clean(body.visitante, 64) || null }) });
    if (!or.ok) throw new Error('orders ' + (await or.text()));
    const [order] = await or.json();
    const ir = await sb('order_items', { method: 'POST', body: JSON.stringify(items.map(i => ({ order_id: order.id, product_id: i.p.id, color: i.color, cantidad: i.q, precio: i.precio }))) });
    if (!ir.ok) throw new Error('items ' + (await ir.text()));

    const [nom, ...ape] = (buyer.nombre || '').split(' ');
    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json', 'X-Idempotency-Key': 'order-' + order.id },
      body: JSON.stringify({
        items: items.map(i => ({ id: i.p.id, title: `${i.p.tipo} ${i.p.nombre}${i.color ? ' · ' + i.color : ''}`, quantity: i.q, unit_price: i.precio, currency_id: 'ARS' })).concat(costoEnvio ? [{ id: 'envio', title: 'Envío express 24 h', quantity: 1, unit_price: costoEnvio, currency_id: 'ARS' }] : []),
        ...(buyer.email ? { payer: { name: nom, surname: ape.join(' '), email: buyer.email } } : {}),
        external_reference: String(order.id),
        back_urls: { success: SITE + '/?pago=ok', pending: SITE + '/?pago=pendiente', failure: SITE + '/?pago=error' },
        auto_return: 'approved',
        notification_url: SITE + '/api/mp-webhook',
        statement_descriptor: 'FORMA CONCEPT'
      })
    });
    const pref = await mp.json();
    if (!mp.ok) throw new Error('mp ' + JSON.stringify(pref));
    await sb('orders?id=eq.' + order.id, { method: 'PATCH', body: JSON.stringify({ mp_preference: pref.id }) });
    return res.status(200).json({ url: pref.init_point, order: order.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No pudimos iniciar el pago. Probá de nuevo o escribinos por WhatsApp.' });
  }
}
