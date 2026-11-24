// Cola de facturas: toma las pendientes (o con error cuyo reintento ya llegó), pide el CAE a ARCA, guarda el PDF y lo manda al cliente.
// Sólo emite en producción (ARCA_ENV=prod). En homologación la cola no toca nada: se prueba con /api/facturar (botón "Factura de prueba").
import { sb, entornoActual, tieneClave, ultimoNumero, consultar, solicitarCAE, armarPDF, datosPedido, configFactura, nroComp, tipoCbte, hoy, PTO_VTA } from './_arca.js';
import { sendMail, sendPlantilla, layout, esc, ADMIN_MAIL } from './_mail.js';
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const ESPERA_MIN = [5, 15, 60, 180, 720]; // minutos entre reintentos (después, cada 12 h)
const patch = (id, body) => sb(`facturas?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
const nombreComp = (tipo, numero) => `${tipo === 'NC-B' ? 'Nota de crédito B' : 'Factura B'} ${nroComp(PTO_VTA, numero)}`;

export async function guardarPDF(path, buf) {
  const r = await fetch(`${SB}/storage/v1/object/facturas/${path}`, { method: 'POST', headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: buf });
  if (!r.ok) throw new Error('No se pudo guardar el PDF: ' + (await r.text()).slice(0, 200));
  return path;
}

async function emitirUna(f, ent, cfg) {
  const t = tipoCbte(f.tipo);
  let asoc = null;
  if (f.tipo === 'NC-B') {
    const [b] = await (await sb(`facturas?id=eq.${f.factura_ref}`)).json();
    if (!b || b.estado === 'anulada') { await patch(f.id, { estado: 'anulada', procesando_at: null, error: null }); return 'anulada'; }
    if (!['emitida', 'manual'].includes(b.estado) || !b.numero) {
      await patch(f.id, { estado: 'pendiente', procesando_at: null, proximo_intento: new Date(Date.now() + 15 * 60e3).toISOString(), error: 'Espera que salga la factura B del pedido' });
      return 'espera';
    }
    asoc = { ptoVta: b.pto_vta || PTO_VTA, numero: b.numero, fecha: b.cbte_fch || String(b.emitida_at || b.created_at).slice(0, 10) };
  }
  const d = await datosPedido(f.order_id);
  const total = +f.total;
  let numero = null, fecha = null, res = null;
  // si un intento anterior se cortó después de pedir el número, primero se fija en ARCA si ese comprobante ya salió
  if (f.numero && f.entorno === ent) {
    const ex = await consultar(ent, t, f.numero);
    if (ex && ex.doc_nro === d.docNro && Math.abs(ex.total - total) < 0.01) { numero = f.numero; fecha = ex.fecha; res = { ok: true, cae: ex.cae, cae_vto: ex.cae_vto, neto: Math.round(total / 1.21 * 100) / 100 }; res.iva = Math.round((total - res.neto) * 100) / 100; }
  }
  if (!res) {
    numero = (await ultimoNumero(ent, t)) + 1; fecha = hoy();
    await patch(f.id, { numero, pto_vta: PTO_VTA, entorno: ent, cbte_fch: fecha, doc_tipo: d.docTipo, doc_nro: d.docNro });
    res = await solicitarCAE(ent, { tipo: f.tipo, numero, fecha, total, docTipo: d.docTipo, docNro: d.docNro, asoc });
    if (!res.ok) { const e = new Error(res.error); e.rechazo = true; throw e; }
  }
  await patch(f.id, { estado: 'emitida', numero, pto_vta: PTO_VTA, entorno: ent, cbte_fch: fecha, cae: res.cae, cae_vto: res.cae_vto, neto: res.neto, iva: res.iva, doc_tipo: d.docTipo, doc_nro: d.docNro, emitida_at: new Date().toISOString(), error: null, procesando_at: null });
  // PDF + mail: si fallan, la factura igual quedó emitida (se avisa en el panel)
  try {
    const lineas = f.tipo === 'NC-B' ? [{ q: 1, unit: total, desc: (f.devolucion_id ? 'Devolución' : 'Anulación de la compra') + ` - pedido web #${f.order_id}` }] : d.lineas;
    const pdf = await armarPDF({ ent, tipo: f.tipo, numero, fecha, cae: res.cae, cae_vto: res.cae_vto, total, docTipo: d.docTipo, docNro: d.docNro, cliente: d.cliente, lineas, asoc, pedido: f.order_id, medio: d.medio, cfg });
    const archivo = `${f.tipo === 'NC-B' ? 'NC-B' : 'FB'}-${nroComp(PTO_VTA, numero)}.pdf`;
    await guardarPDF(`${ent}/${archivo}`, pdf);
    await patch(f.id, { pdf_url: `${ent}/${archivo}` });
    if (ent === 'prod' && d.o.email && !f.mail_at) {
      const nombre = (d.o.nombre || '').split(' ')[0], comp = nombreComp(f.tipo, numero);
      const r = await sendPlantilla('factura', d.o.email, { nombre, pedido: f.order_id, comprobante: comp },
        { subject: `Tu factura · Pedido #${f.order_id}`, html: layout('Tu factura', `<p style="font-size:14px;line-height:1.6">${esc(nombre)}, te adjuntamos el comprobante de tu pedido #${f.order_id}: ${esc(comp)}.</p>`) },
        [{ filename: archivo, content: pdf.toString('base64') }]);
      if (r.ok) await patch(f.id, { mail_at: new Date().toISOString() });
    }
  } catch (e) { console.error('pdf/mail', e); await patch(f.id, { error: 'Emitida con CAE, pero falló el PDF o el mail: ' + String(e.message || e).slice(0, 300) }); }
  return 'emitida';
}

// Procesa la cola. orderId: sólo las de ese pedido (se usa justo después de un pago o una cancelación).
export async function procesarCola({ orderId, limite = 8 } = {}) {
  const ent = entornoActual();
  if (ent !== 'prod') return { entorno: ent, procesadas: 0, aviso: 'Modo prueba: la cola no emite comprobantes reales' };
  const cfg = await configFactura();
  if (cfg.fact_activa === '0') return { entorno: ent, procesadas: 0, aviso: 'Facturación pausada desde el panel' };
  if (!tieneClave(ent)) return { entorno: ent, procesadas: 0, aviso: 'Falta ARCA_KEY_PROD en Vercel' };
  // intentos que quedaron colgados a mitad (más de 10 min "procesando"): vuelven a la cola, y antes de reintentar se verifica en ARCA
  await sb(`facturas?estado=eq.procesando&procesando_at=lt.${encodeURIComponent(new Date(Date.now() - 10 * 60e3).toISOString())}`, { method: 'PATCH', body: JSON.stringify({ estado: 'error', error: 'Se cortó a mitad; se verifica en ARCA antes de reintentar', procesando_at: null }) });
  const filtro = orderId ? `&order_id=eq.${+orderId}` : `&proximo_intento=lte.${encodeURIComponent(new Date().toISOString())}`;
  const lista = await (await sb(`facturas?estado=in.(pendiente,error)${filtro}&order=tipo.asc,id.asc&limit=${limite}`)).json();
  const out = [];
  for (const f0 of Array.isArray(lista) ? lista : []) {
    const [f] = await (await sb(`facturas?id=eq.${f0.id}&estado=in.(pendiente,error)`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ estado: 'procesando', procesando_at: new Date().toISOString() }) })).json();
    if (!f) continue; // la tomó otro proceso
    try { out.push({ id: f.id, r: await emitirUna(f, ent, cfg) }); }
    catch (e) {
      const intentos = (f.intentos || 0) + 1, msg = String(e.message || e).slice(0, 500);
      await patch(f.id, { estado: 'error', error: msg, intentos, procesando_at: null, proximo_intento: new Date(Date.now() + ESPERA_MIN[Math.min(intentos - 1, ESPERA_MIN.length - 1)] * 60e3).toISOString(), ...(e.rechazo ? { numero: null } : {}) });
      if (intentos === 1) { try { await sendMail({ to: ADMIN_MAIL, subject: `ARCA no emitió la ${f.tipo === 'NC-B' ? 'nota de crédito' : 'factura'} del pedido #${f.order_id}`, html: layout('Factura con error', `<p style="font-size:14px">Pedido #${f.order_id} · ${esc(f.tipo)}<br><b>${esc(msg)}</b></p><p style="font-size:14px">Se reintenta solo. Si el error es de datos, corregilo y tocá "Reintentar" en el panel (Ventas → Facturas).</p>`) }); } catch (x) { console.error(x); } }
      out.push({ id: f.id, r: 'error', error: msg });
    }
  }
  return { entorno: ent, procesadas: out.length, detalle: out };
}
