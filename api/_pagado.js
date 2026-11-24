// Marca un pedido como pagado (sólo si sigue pendiente), suma las unidades vendidas y manda los mails.
// Lo usan el aviso de Mercado Pago y el panel cuando llega una transferencia.
import { sendMail, sendPlantilla, layout, tablaItems, ars, esc, ADMIN_MAIL } from './_mail.js';
import { enviarCompra } from './_tracking.js';
import { procesarCola } from './_facturas.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
export const sb = (path, opts = {}) => fetch(SB + '/rest/v1/' + path, {
  ...opts,
  headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) }
});

export async function marcarPagado(orderId, extra = {}) {
  const up = await sb(`orders?id=eq.${orderId}&estado=eq.pendiente`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ estado: 'pagado', ...extra }) });
  const changed = await up.json();
  if (!Array.isArray(changed) || !changed.length) return false;
  const items = await (await sb(`order_items?select=product_id,cantidad&order_id=eq.${orderId}`)).json();
  for (const it of items) {
    const [p] = await (await sb(`products?select=vendidas&id=eq.${encodeURIComponent(it.product_id)}`)).json();
    if (p) await sb(`products?id=eq.${encodeURIComponent(it.product_id)}`, { method: 'PATCH', body: JSON.stringify({ vendidas: (p.vendidas || 0) + it.cantidad }) });
  }
  // Orden de despacho para Pailos: el SKU de venta se traduce a sus cajas y se descuenta del stock por caja.
  try { await sb('rpc/generar_despacho', { method: 'POST', body: JSON.stringify({ p_order: orderId }) }); } catch (e) { console.error('despacho', e); }
  try {
    const [o] = await (await sb(`orders?select=*,order_items(cantidad,precio,color,products(tipo,nombre))&id=eq.${orderId}`)).json();
    const its = (o.order_items || []).map(i => ({ q: i.cantidad, precio: i.precio, color: i.color, nombre: i.products ? i.products.tipo + ' ' + i.products.nombre : '' }));
    const det = tablaItems(its) + `<p style="font-size:14px;margin:12px 0">Envío: ${esc(o.envio || 'a coordinar')}${o.costo_envio ? ' · ' + ars(o.costo_envio) : ''}<br><b>Total pagado: ${ars(o.total)}</b></p>`;
    const nombre = (o.nombre || '').split(' ')[0];
    if (o.email) await sendPlantilla('pagado', o.email, { nombre, pedido: o.id, total: ars(o.total), detalle: det }, { subject: `Recibimos tu compra · Pedido #${o.id}`, html: layout(`¡Gracias${nombre ? ', ' + esc(nombre) : ''}! Recibimos tu compra`, `<p style="font-size:14px;line-height:1.6">Tu pedido <b>#${o.id}</b> está confirmado. Los productos de la preventa tienen entrega estimada en <b>marzo 2027</b>. Te vamos a escribir por WhatsApp para coordinar el día.</p>${det}<p style="font-size:13px;color:#77756F">¿Dudas? Respondé este mail o escribinos por WhatsApp.</p>`) });
    await sendMail({ to: ADMIN_MAIL, subject: `Nuevo pedido pagado #${o.id} · ${ars(o.total)}`, html: layout(`Nuevo pedido #${o.id}`, `<p style="font-size:14px">${esc(o.nombre || '')} · ${esc(o.email || '')} · ${esc(o.telefono || '')}<br>CP ${esc(o.cp || '')}${o.medio_pago === 'transferencia' ? '<br><b>Pagó con transferencia</b>' : ''}</p>${det}<p><a href="https://www.formaconceptba.com/admin">Abrir el panel</a></p>`) });
  } catch (e) { console.error('mail', e); }
  await enviarCompra(orderId);
  // factura B: se pide el CAE en el momento; si ARCA falla queda en la cola con reintentos
  try { await procesarCola({ orderId }); } catch (e) { console.error('factura', e); }
  return true;
}
