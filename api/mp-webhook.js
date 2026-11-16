// Aviso de Mercado Pago: confirma el pago consultando a MP y marca el pedido como pagado.
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';

const sb = (path, opts = {}) => fetch(SB + '/rest/v1/' + path, {
  ...opts,
  headers: {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  }
});

export default async function handler(req, res) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const type = req.query.type || req.query.topic || body.type;
    const id = req.query['data.id'] || body?.data?.id || (req.query.topic === 'payment' ? req.query.id : null);
    if (type !== 'payment' || !id) return res.status(200).send('ignorado');

    // No confiamos en el aviso: pedimos el pago directamente a Mercado Pago.
    const r = await fetch('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN }
    });
    if (!r.ok) return res.status(200).send('pago no encontrado');
    const pay = await r.json();
    const orderId = parseInt(pay.external_reference);
    if (!orderId) return res.status(200).send('sin pedido');

    const [order] = await (await sb(`orders?select=id,estado,total&id=eq.${orderId}`)).json();
    if (!order) return res.status(200).send('pedido inexistente');

    if (pay.status === 'approved') {
      if (order.estado !== 'pendiente') return res.status(200).send('ya procesado');
      if (Math.round(pay.transaction_amount) < order.total) return res.status(200).send('monto distinto');
      // Marcar pagado sólo si sigue pendiente (evita sumar ventas dos veces).
      const up = await sb(`orders?id=eq.${orderId}&estado=eq.pendiente`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ estado: 'pagado', mp_payment: String(pay.id) })
      });
      const changed = await up.json();
      if (!changed.length) return res.status(200).send('ya procesado');
      const items = await (await sb(`order_items?select=product_id,cantidad&order_id=eq.${orderId}`)).json();
      for (const it of items) {
        const [p] = await (await sb(`products?select=vendidas&id=eq.${encodeURIComponent(it.product_id)}`)).json();
        if (p) await sb(`products?id=eq.${encodeURIComponent(it.product_id)}`, { method: 'PATCH', body: JSON.stringify({ vendidas: (p.vendidas || 0) + it.cantidad }) });
      }
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(pay.status) && order.estado === 'pendiente') {
      await sb(`orders?id=eq.${orderId}`, { method: 'PATCH', body: JSON.stringify({ mp_payment: String(pay.id) + ' (' + pay.status + ')' }) });
    }
    return res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    return res.status(500).send('error');
  }
}
