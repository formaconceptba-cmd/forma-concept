// Aviso de Mercado Pago: confirma el pago consultando a MP y marca el pedido como pagado.
import { marcarPagado } from './_pagado.js';
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
      if (!(await marcarPagado(orderId, { mp_payment: String(pay.id), ...medioPago(pay), ...datosPagador(pay, order) }))) return res.status(200).send('ya procesado');
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

// Cómo pagó (tarjeta, débito, dinero en cuenta, efectivo…), en cuántas cuotas y cuánto cobró Mercado Pago de comisión.
function medioPago(pay) {
  const fee = (pay.fee_details || []).reduce((s, f) => s + (+f.amount || 0), 0);
  return { medio_pago: pay.payment_type_id || null, cuotas: pay.installments || 1, comision_real: fee ? Math.round(fee * 100) / 100 : null };
}
