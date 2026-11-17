// Aviso de Mercado Pago: confirma el pago consultando a MP y marca el pedido como pagado.
import { sendMail, layout, tablaItems, ars, esc, ADMIN_MAIL } from './_mail.js';
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

    const [order] = await (await sb(`orders?select=id,estado,total,email,nombre,telefono&id=eq.${orderId}`)).json();
    if (!order) return res.status(200).send('pedido inexistente');

    if (pay.status === 'approved') {
      if (order.estado !== 'pendiente') return res.status(200).send('ya procesado');
      if (Math.round(pay.transaction_amount) < order.total) return res.status(200).send('monto distinto');
      // Marcar pagado sólo si sigue pendiente (evita sumar ventas dos veces).
      const up = await sb(`orders?id=eq.${orderId}&estado=eq.pendiente`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ estado: 'pagado', mp_payment: String(pay.id), ...datosPagador(pay, order) })
      });
      const changed = await up.json();
      if (!changed.length) return res.status(200).send('ya procesado');
      const items = await (await sb(`order_items?select=product_id,cantidad&order_id=eq.${orderId}`)).json();
      for (const it of items) {
        const [p] = await (await sb(`products?select=vendidas&id=eq.${encodeURIComponent(it.product_id)}`)).json();
        if (p) await sb(`products?id=eq.${encodeURIComponent(it.product_id)}`, { method: 'PATCH', body: JSON.stringify({ vendidas: (p.vendidas || 0) + it.cantidad }) });
      }
      // Mails: confirmación al cliente y aviso a FORMA
      try {
        const [o] = await (await sb(`orders?select=*,order_items(cantidad,precio,color,products(tipo,nombre))&id=eq.${orderId}`)).json();
        const its = (o.order_items || []).map(i => ({ q: i.cantidad, precio: i.precio, color: i.color, nombre: i.products ? i.products.tipo + ' ' + i.products.nombre : '' }));
        const det = tablaItems(its) + `<p style="font-size:14px;margin:12px 0">Envío: ${esc(o.envio || 'a coordinar')}${o.costo_envio ? ' · ' + ars(o.costo_envio) : ''}<br><b>Total pagado: ${ars(o.total)}</b></p>`;
        const nombre = (o.nombre || '').split(' ')[0];
        if (o.email) await sendMail({ to: o.email, subject: `Recibimos tu compra · Pedido #${o.id}`, html: layout(`¡Gracias${nombre ? ', ' + esc(nombre) : ''}! Recibimos tu compra`, `<p style="font-size:14px;line-height:1.6">Tu pedido <b>#${o.id}</b> está confirmado. Los productos de la preventa tienen entrega estimada en <b>marzo 2027</b>. Te vamos a escribir por WhatsApp para coordinar el día.</p>${det}<p style="font-size:13px;color:#77756F">¿Dudas? Respondé este mail o escribinos por WhatsApp.</p>`) });
        await sendMail({ to: ADMIN_MAIL, subject: `Nuevo pedido pagado #${o.id} · ${ars(o.total)}`, html: layout(`Nuevo pedido #${o.id}`, `<p style="font-size:14px">${esc(o.nombre || '')} · ${esc(o.email || '')} · ${esc(o.telefono || '')}<br>CP ${esc(o.cp || '')}</p>${det}<p><a href="https://www.formaconceptba.com/admin">Abrir el panel</a></p>`) });
      } catch (e) { console.error('mail', e); }
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(pay.status) && order.estado === 'pendiente') {
      await sb(`orders?id=eq.${orderId}`, { method: 'PATCH', body: JSON.stringify({ mp_payment: String(pay.id) + ' (' + pay.status + ')' }) });
    }
    return res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    return res.status(500).send('error');
  }
}

// Completa nombre, mail y teléfono del cliente con los datos que cargó en Mercado Pago (si no los teníamos).
function datosPagador(pay, order) {
  const p = pay.payer || {}, ai = (pay.additional_info && pay.additional_info.payer) || {};
  const nombre = [p.first_name || ai.first_name, p.last_name || ai.last_name].filter(Boolean).join(' ');
  const tel = (p.phone && (p.phone.area_code || '') + (p.phone.number || '')) || (ai.phone && (ai.phone.area_code || '') + (ai.phone.number || '')) || '';
  const out = {};
  if (!order.email && p.email) out.email = p.email;
  if (!order.nombre && nombre) out.nombre = nombre;
  if (!order.telefono && tel) out.telefono = tel;
  return out;
}
