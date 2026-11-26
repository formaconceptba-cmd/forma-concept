// Crea el pedido en Supabase y la preferencia de pago en Mercado Pago.
// Variables de entorno (Vercel): MP_ACCESS_TOKEN, SUPABASE_SECRET_KEY
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const SITE = 'https://www.formaconceptba.com';
import { sendMail, layout, tablaItems, ars, esc, ADMIN_MAIL, plantilla, sendPlantilla } from './_mail.js';

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
      direccion: clean(b.direccion, 240), cp: clean(b.cp || body.cp, 12), dni: clean(b.dni, 20).replace(/\D/g, '')
    };

    const lines = (body.items || []).slice(0, 30).map(l => ({ id: clean(l.id, 40), color: clean(l.color, 60), sku: clean(l.sku, 30).toUpperCase() || null, q: Math.max(1, Math.min(20, parseInt(l.q) || 1)) }));
    if (!lines.length) return res.status(400).json({ error: 'El carrito está vacío.' });

    // Precios y stock salen de la base, nunca del navegador.
    // ¿Compra un profesional aprobado? Se valida con su sesión, nunca con datos del navegador.
    let prof = null, descProf = 0.5, minProf = 1;
    const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (tok) { const u = await fetch(SB + '/auth/v1/user', { headers: { apikey: PUB, Authorization: 'Bearer ' + tok } }); if (u.ok) { const uj = await u.json(); const [pp] = await (await sb(`profesionales?select=email,nombre,estudio,telefono,tipo,estado&email=eq.${encodeURIComponent(String(uj.email || '').toLowerCase())}`)).json(); if (pp && pp.estado === 'aprobado' && pp.tipo === 'profesional') { prof = pp; const st = await (await sb('settings?select=key,value&key=in.(desc_profesional,min_profesional)')).json(); for (const s of st) { if (s.key === 'desc_profesional') descProf = +s.value; if (s.key === 'min_profesional') minProf = +s.value } } } }
    const ids = [...new Set(lines.map(l => l.id))];
    const pr = await sb(`products?select=id,tipo,nombre,linea,categoria,disponibilidad,precio_lista,min_profesional,unidades,vendidas,activo&id=in.(${ids.map(encodeURIComponent).join(',')})`);
    const prods = Object.fromEntries((await pr.json()).map(p => [p.id, p]));
    // Todos los precios salen de una sola función de la base (reglas de precio), nunca del navegador.
    const PC = Object.fromEntries((await (await sb('rpc/precios_calc', { method: 'POST', body: '{}' })).json()).map(x => [x.id, x]));
    const transf = body.medio === 'transferencia';
    // Promociones por tiempo (automáticas) y código de descuento: se valida acá, nunca se confía en el navegador. No se suman: se usa la mayor.
    let PROMOS = [], cup = null;
    try { const pj = await (await sb('rpc/promo_vigente', { method: 'POST', body: '{}' })).json(); if (Array.isArray(pj)) PROMOS = pj; } catch (e) {}
    const cupTxt = clean(body.cupon, 40);
    if (cupTxt && !prof) { try { const cj = await (await sb('rpc/cupon_validar', { method: 'POST', body: JSON.stringify({ p_codigo: cupTxt }) })).json(); if (Array.isArray(cj) && cj[0]) cup = cj[0]; } catch (e) {} if (!cup) return res.status(400).json({ error: 'El código de descuento no es válido o ya venció.' }); }
    const enAlc = (x, p) => x.alcance === 'todo' || (x.alcance === 'categoria' && (x.alcance_valor || []).includes(p.categoria)) || (x.alcance === 'producto' && (x.alcance_valor || []).includes(p.id));
    let descuento = 0;
    // Stock: sale de los contenedores (y descuenta lo reservado por pedidos sin pagar y reservas mayoristas).
    const STK = Object.fromEntries((await (await sb('rpc/stock_calc', { method: 'POST', body: '{}' })).json()).map(x => [x.id, x]));
    // SKU de venta (producto + color): tiene que ser de ese producto y no estar discontinuado; si ya hay stock por caja, se controla por color.
    const skus = [...new Set(lines.map(l => l.sku).filter(Boolean))];
    const VAR = skus.length ? Object.fromEntries((await (await sb(`variantes?select=sku,codigo_master,estado&sku=in.(${skus.map(encodeURIComponent).join(',')})`)).json()).map(v => [v.sku, v])) : {};
    const SV = skus.length ? Object.fromEntries((await (await sb('rpc/stock_variantes', { method: 'POST', body: '{}' })).json()).map(x => [x.sku, x])) : {};
    // Productos con error (ej. stock negativo): ocultos en la tienda, tampoco se pueden comprar.
    let BLQ = new Set(); try { const bj = await (await sb('rpc/productos_bloqueados', { method: 'POST', body: '{}' })).json(); if (Array.isArray(bj)) BLQ = new Set(bj.map(x => x.id)); } catch (e) {}
    const items = [];
    for (const l of lines) {
      const p = prods[l.id];
      if (!p || !p.activo || BLQ.has(l.id) || !p.precio_lista || p.disponibilidad === 'sin_stock') return res.status(400).json({ error: 'Un producto ya no está disponible.' });
      const libre = (STK[l.id] ? STK[l.id].disponible : (p.unidades || 0) - (p.vendidas || 0)) - lines.filter(x => x.id === l.id && x !== l).reduce((a, x) => a + x.q, 0);
      if (l.q > libre) return res.status(409).json({ error: `No queda stock suficiente de ${p.tipo} ${p.nombre}.` });
      if (prof) { const mn = p.min_profesional || minProf || 1; const tot = lines.filter(x => x.id === l.id).reduce((s, x) => s + x.q, 0); if (tot < mn) return res.status(400).json({ error: `La compra mínima profesional de ${p.tipo} ${p.nombre} es de ${mn} unidades.` }); }
      const c = PC[l.id]; if (!c) return res.status(400).json({ error: 'Un producto ya no está disponible.' });
      const v = l.sku ? VAR[l.sku] : null;
      if (l.sku && (!v || v.codigo_master !== l.id || v.estado === 'discontinuado')) return res.status(400).json({ error: `El color elegido de ${p.tipo} ${p.nombre} ya no está disponible.` });
      if (v && SV[l.sku] && SV[l.sku].con_datos && l.q > SV[l.sku].disponible - lines.filter(x => x.sku === l.sku && x !== l).reduce((a, x) => a + x.q, 0)) return res.status(409).json({ error: `No queda stock de ${p.tipo} ${p.nombre} en ${l.color || 'ese color'}.` });
      const base = prof ? (transf ? c.prof_transf : c.prof) : (transf ? c.transf : c.publico);
      let pct = 0, promo = null;
      if (!prof) { for (const x of PROMOS) if (enAlc(x, p) && +x.pct > pct) { pct = +x.pct; promo = x.nombre; } if (cup && enAlc(cup, p) && +cup.pct > pct) { pct = +cup.pct; promo = 'Código ' + cup.codigo; } }
      const precio = pct ? Math.round(base * (1 - pct)) : base;
      descuento += (base - precio) * l.q;
      items.push({ p, q: l.q, color: l.color, sku: v ? l.sku : null, precio, lista: c.lista, promo, regla: [prof ? 'profesional' : c.regla, transf ? 'transferencia' : '', promo ? promo + ' −' + Math.round(pct * 100) + '%' : ''].filter(Boolean).join(' + ') });
    }
    const ENVIOS = { gratis: 'Envío gratis (día a coordinar)', express: 'Envío express 24 h', retiro: 'Retiro en depósito (Lanús)', interior: 'Envío al interior (a cotizar)', domicilio: 'Envío a domicilio' };
    const cpN = parseInt(body.cp, 10), zona = cpN >= 1000 && cpN <= 9999 ? (cpN < 1500 ? 'caba' : cpN < 1900 ? 'gba' : 'int') : null;
    let envio = ENVIOS[body.envio] ? body.envio : 'gratis';
    if (zona === 'int' && (envio === 'gratis' || envio === 'express')) envio = 'interior';
    if (zona && zona !== 'int' && envio === 'interior') envio = 'gratis';
    const ST = Object.fromEntries((await (await sb('settings?select=key,value&key=in.(envio_express,cuotas_max)')).json()).map(s => [s.key, +s.value]));
    let costoEnvio = 0;
    if (envio === 'express') costoEnvio = Math.round(ST.envio_express || 35000);
    // Bultos y volumen de la venta: 1 unidad de venta = su caja (o el kit tapa + base). El envío se cotiza por volumen, no por peso.
    const M = Object.fromEntries((await (await sb(`master_productos?select=codigo,cbm,piezas_por_caja,cajas_por_unidad&codigo=in.(${ids.map(encodeURIComponent).join(',')})`)).json()).map(m => [m.codigo, m]));
    const KJ = skus.length ? await (await sb(`cajas?select=sku,cbm&sku=in.(${skus.map(encodeURIComponent).join(',')})`)).json() : [];
    let bultos = 0, m3 = 0;
    for (const i of items) {
      const K = i.sku ? KJ.filter(k => k.sku === i.sku) : [], m = M[i.p.id] || {};
      bultos += i.q * (K.length || m.cajas_por_unidad || 1);
      m3 += i.q * (K.length && K.every(k => k.cbm) ? K.reduce((a, k) => a + +k.cbm, 0) : (+m.cbm || 0) * (m.piezas_por_caja || 1));
    }
    // Envío por volumen: queda apagado hasta que se carguen las tarifas de Pailos (config_tienda.envio_m3_activo = 1 y tabla envio_tarifas)
    const CT = Object.fromEntries((await (await sb('config_tienda?select=key,value')).json()).map(x => [x.key, x.value]));
    if (CT.envio_m3_activo === '1' && (envio === 'gratis' || envio === 'interior') && cpN) {
      const [t] = await (await sb(`envio_tarifas?select=*&activo=eq.true&desde_cp=lte.${cpN}&hasta_cp=gte.${cpN}&order=orden&limit=1`)).json();
      if (t && t.precio_m3 != null) { costoEnvio = Math.round(Math.max(+t.minimo || 0, m3 * +t.precio_m3)); envio = 'domicilio'; }
    }
    if (prof) { buyer.nombre = buyer.nombre || prof.nombre; buyer.email = buyer.email || prof.email; buyer.telefono = buyer.telefono || prof.telefono || ''; }
    // Factura B: nombre, DNI, mail y dirección obligatorios (la dirección no, si retira)
    if (!buyer.nombre || !/^\d{7,8}$/.test(buyer.dni) || !/\S+@\S+\.\S+/.test(buyer.email) || buyer.telefono.replace(/\D/g, '').length < 8 || (envio !== 'retiro' && buyer.direccion.length < 5))
      return res.status(400).json({ error: 'Completá nombre, DNI, mail, teléfono y dirección de entrega.' });
    if (envio === 'retiro') buyer.direccion = '';
    const total = items.reduce((a, i) => a + i.precio * i.q, 0) + costoEnvio;
    // Datos de seguimiento capturados en el navegador antes del pago (después ya no existen). event_id = id del pedido.
    const tk = body.tracking || {}, cl = (s, n) => String(s ?? '').slice(0, n);
    const tracking = { fbp: cl(tk.fbp, 120) || null, fbc: cl(tk.fbc, 300) || null, ga_client_id: cl(tk.ga_client_id, 80) || null, gclid: cl(tk.gclid, 200) || null, ttclid: cl(tk.ttclid, 200) || null, landing_url: cl(tk.landing_url, 1000) || null, referrer: cl(tk.referrer, 500) || null, utm: tk.utm && typeof tk.utm === 'object' ? Object.fromEntries(Object.entries(tk.utm).slice(0, 6).map(([k, v]) => [cl(k, 20), cl(v, 200)])) : null, clic_ts: +tk.clic_ts || null, checkout_url: cl(tk.checkout_url, 500) || null, ip: cl((req.headers['x-forwarded-for'] || '').split(',')[0].trim(), 60), user_agent: cl(req.headers['user-agent'], 400) };

    const or = await sb('orders', { method: 'POST', body: JSON.stringify({ ...buyer, ...(prof ? { email: buyer.email || prof.email, nombre: buyer.nombre || (prof.nombre + (prof.estudio ? ' (' + prof.estudio + ')' : '')), telefono: buyer.telefono || prof.telefono || '' } : {}), canal: prof ? 'profesional' : 'publico', tracking, ...(transf ? { medio_pago: 'transferencia', cuotas: 1, comision_real: 0 } : {}), envio: ENVIOS[envio], costo_envio: costoEnvio, total, bultos, cupon: cup ? cup.codigo : null, descuento: descuento || null, visitante: clean(body.visitante, 64) || null }) });
    if (!or.ok) throw new Error('orders ' + (await or.text()));
    const [order] = await or.json();
    const ir = await sb('order_items', { method: 'POST', body: JSON.stringify(items.map(i => ({ order_id: order.id, product_id: i.p.id, color: i.color, cantidad: i.q, precio: i.precio, precio_lista_momento: i.lista, regla: i.regla, sku: i.sku, promo: i.promo || null }))) });
    if (!ir.ok) throw new Error('items ' + (await ir.text()));
    if (cup) { try { await sb('rpc/cupon_usar', { method: 'POST', body: JSON.stringify({ p_codigo: cup.codigo }) }); } catch (e) {} }
    // La reserva arranca acá (pedido pendiente). Si otro cliente reservó lo mismo en el mismo instante, el stock queda negativo: el último se cae.
    const STK2 = Object.fromEntries((await (await sb('rpc/stock_calc', { method: 'POST', body: '{}' })).json()).map(x => [x.id, x]));
    const SV2 = skus.length ? Object.fromEntries((await (await sb('rpc/stock_variantes', { method: 'POST', body: '{}' })).json()).map(x => [x.sku, x])) : {};
    const pasado = items.find(i => (STK2[i.p.id] && STK2[i.p.id].disponible < 0) || (i.sku && SV2[i.sku] && SV2[i.sku].con_datos && SV2[i.sku].disponible < 0));
    if (pasado) {
      await sb('order_items?order_id=eq.' + order.id, { method: 'DELETE' }); await sb('orders?id=eq.' + order.id, { method: 'DELETE' });
      return res.status(409).json({ error: `Justo se reservó la última unidad de ${pasado.p.tipo} ${pasado.p.nombre}. Probá con otra cantidad o color.` });
    }

    // Transferencia: no pasa por Mercado Pago. Le damos los datos y lo confirmás en el panel cuando llega la plata.
    if (transf) {
      const [d] = await (await sb('cobro_transf?select=titular,cuit,banco,alias,cbu,horas&id=eq.1')).json();
      const datos = d || {};
      const its = items.map(i => ({ q: i.q, precio: i.precio, color: i.color, nombre: i.p.tipo + ' ' + i.p.nombre }));
      const caja = `<table style="font-size:14px;line-height:1.7">${[['Titular', datos.titular], ['CUIT', datos.cuit], ['Banco', datos.banco], ['Alias', datos.alias], ['CBU', datos.cbu]].filter(x => x[1]).map(([k, v]) => `<tr><td style="color:#77756F;padding-right:14px">${k}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>`;
      try {
        const vars = { nombre: buyer.nombre.split(' ')[0], pedido: order.id, total: ars(total), horas: datos.horas || 48, datos_transferencia: caja + `<p style="font-size:14px">En el concepto poné: <b>Pedido ${order.id}</b></p>`, detalle: tablaItems(its) };
        if (await plantilla('recibido_transf', vars)) await sendPlantilla('recibido_transf', buyer.email, vars);
        else await sendMail({ to: buyer.email, subject: `Tu pedido #${order.id} · datos para transferir`, html: layout(`¡Gracias, ${esc(buyer.nombre.split(' ')[0])}! Reservamos tu pedido`, `<p style="font-size:14px;line-height:1.6">Transferí <b>${ars(total)}</b> a esta cuenta dentro de las próximas <b>${datos.horas || 48} horas</b> y respondé este mail con el comprobante (o mandalo por WhatsApp). Cuando la veamos acreditada te confirmamos la compra.</p>${caja}<p style="font-size:14px">En el concepto poné: <b>Pedido ${order.id}</b></p>${tablaItems(its)}`) });
        await sendMail({ to: ADMIN_MAIL, subject: `Pedido #${order.id} por transferencia · ${ars(total)} (esperando el pago)`, html: layout(`Pedido #${order.id} por transferencia`, `<p style="font-size:14px">${esc(buyer.nombre)} · ${esc(buyer.email)} · ${esc(buyer.telefono)}<br>Cuando llegue la plata, marcalo como <b>Pagado</b> en el panel.</p>${tablaItems(its)}<p><a href="https://www.formaconceptba.com/admin">Abrir el panel</a></p>`) });
      } catch (e) { console.error('mail', e); }
      return res.status(200).json({ transfer: { order: order.id, total, ...datos } });
    }

    const [nom, ...ape] = (buyer.nombre || '').split(' ');
    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json', 'X-Idempotency-Key': 'order-' + order.id },
      body: JSON.stringify({
        items: items.map(i => ({ id: i.p.id, title: `${i.p.tipo} ${i.p.nombre}${i.color ? ' · ' + i.color : ''}`, quantity: i.q, unit_price: i.precio, currency_id: 'ARS' })).concat(costoEnvio ? [{ id: 'envio', title: ENVIOS[envio], quantity: 1, unit_price: costoEnvio, currency_id: 'ARS' }] : []),
        ...(buyer.email ? { payer: { name: nom, surname: ape.join(' '), email: buyer.email, identification: { type: 'DNI', number: buyer.dni } } } : {}),
        external_reference: String(order.id),
        back_urls: { success: SITE + '/?pago=ok', pending: SITE + '/?pago=pendiente', failure: SITE + '/?pago=error' },
        auto_return: 'approved',
        notification_url: SITE + '/api/mp-webhook',
        payment_methods: { installments: Math.max(1, Math.min(12, ST.cuotas_max || 12)), default_installments: 1 },
        statement_descriptor: 'FORMA CONCEPT'
      })
    });
    const pref = await mp.json();
    if (!mp.ok) throw new Error('mp ' + JSON.stringify(pref));
    await sb('orders?id=eq.' + order.id, { method: 'PATCH', body: JSON.stringify({ mp_preference: pref.id }) });
    return res.status(200).json({ url: pref.init_point, order: order.id, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No pudimos iniciar el pago. Probá de nuevo o escribinos por WhatsApp.' });
  }
}
