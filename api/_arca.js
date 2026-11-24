// Factura electrónica ARCA: login (WSAA), emisión (WSFE), PDF con QR y cola de reintentos.
// Entorno: ARCA_ENV = 'prod' emite de verdad; cualquier otro valor = homologación (prueba, sin validez fiscal).
// La clave privada NO está en el código: va en las variables de Vercel ARCA_KEY_HOMO / ARCA_KEY_PROD.
import forge from 'node-forge';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export const CUIT = 30712949909;
export const PTO_VTA = 3;
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const CERT = {
  homo: `-----BEGIN CERTIFICATE-----
MIIDTDCCAjSgAwIBAgIIQO/GLg4tWXswDQYJKoZIhvcNAQENBQAwODEaMBgGA1UEAwwRQ29tcHV0
YWRvcmVzIFRlc3QxDTALBgNVBAoMBEFGSVAxCzAJBgNVBAYTAkFSMB4XDTI2MTEyNDIxMDU0N1oX
DTI4MTEyMzIxMDU0N1owMjEVMBMGA1UEAwwMZm9ybWF3ZWJob21vMRkwFwYDVQQFExBDVUlUIDIw
MTQ1MDg0NTEzMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtclvlYDhTCZBk0gpm1l9
oWT12GAN8yzFy7+vAWApFLHC3RjqG6P/TBttJpMgRYMZIuM4VL7CSDQQK7NcuqnG94Hf3UKRe4UP
oCAx6d7qNdI9eKCJxVKAdv16DW1f2dh9dKEZLghbnLp7vAj8cJ34FLx9ohcoPiEbfOYvZ2XtXQLE
l6HopjG9kIEUWw88tAq6LlHw7/xrbN3HXuB5iMMMdoiLDUIoF8OhO9dRoMSREg9DL0THvSyoN7I0
iId/Vcd/c5rNsWY3eac/YBmaLIgf2NFjmUbB00Yo92zeA+320PIyrNq7qxKJuZjWNpQpVYUNFVJJ
DahXWMpZ8zVoeZlXxQIDAQABo2AwXjAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFLOy0//96bre
3o2vESGc1iB98k9vMB0GA1UdDgQWBBRuZM1G/I5DELKN6MX0YpLiSNZAUjAOBgNVHQ8BAf8EBAMC
BeAwDQYJKoZIhvcNAQENBQADggEBADigACAp8ReTAdXSxwIHei8X1eRt9XPs6yUFM3kRqIWLbQmX
V2U1Ezcd27G04p5kjRbGK/ecEEfjtlAUZruQcAxr6cbS99KaMwN9pqUmaj5uAfBdCC9t5/4oiXh7
6ksysZ+vU7NC8KeoDDvd7s/ghyBi+itjzBb+UBSp3ete8YAKHyBLc+7bC1mt8Dyro9R/hC3eF4Kn
kBg6cL4q1Z7fs6zTFjFJ867YhaFPxy2SH/NWmTRQb/SDMOVEkcZdGcI7RLDMLyWmPVaBJ4cCBlrh
eZPhRgSIH+NDO6V0ERWV419/tgueRnf/PUsThBUbsly/NddIyG778S9yqktfGhArkz4=
-----END CERTIFICATE-----`,
  prod: `-----BEGIN CERTIFICATE-----
MIIDRzCCAi+gAwIBAgIIY8MeQCBLqZMwDQYJKoZIhvcNAQENBQAwMzEVMBMGA1UEAwwMQ29tcHV0
YWRvcmVzMQ0wCwYDVQQKDARBRklQMQswCQYDVQQGEwJBUjAeFw0yNjExMjQyMTA3MTBaFw0yODEx
MjMyMTA3MTBaMDIxFTATBgNVBAMMDGZvcm1hd2VicHJvZDEZMBcGA1UEBRMQQ1VJVCAzMDcxMjk0
OTkwOTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKYwr4/RqTygc6hg8mWZrxziHmue
EolThKrGGCk7tULXnrc1G3l9kJu9uIUhO+7FH+G1u5wS1CO+8ik4L7LDbVPbcdD8RB3/7HVqDlgW
oikxgvsKqdxm4J0yvjcHfeCzfSLMs18jzeG1SWr2ox+20rk45XbfYkxFj29vXtdJRIDfcM6cksQr
ToktjZbQnTzMvlfU2MJ07DJ8mCK90gzJ49hs6lFRHJfwnrLqWgx7VAlo+hnzKQ5l5SfqMA0FG8dR
JoF95F4z5LihXcyWlpzELImW67LiIipg1gJo5Ms+aMK2Iy3uGHdB3tedO5GPKMAb2RCte9zxIYTi
hqVqfc7FRCsCAwEAAaNgMF4wDAYDVR0TAQH/BAIwADAfBgNVHSMEGDAWgBQrDS/I32H9CMlOEdA1
kwRtjlvQbjAdBgNVHQ4EFgQU/2huJBWeBVBL+oVj0rO8ccKPluYwDgYDVR0PAQH/BAQDAgXgMA0G
CSqGSIb3DQEBDQUAA4IBAQAqDPzoHNOAPWiR4mAK3qSeWpOLw7WxP9S+DqxQSmR+cF8wyB/+1p7v
UdSpYy1YlMGJTW80/XJr5sOnV26puQ+U3mfjCTs7U9GIJLc58qRGadp8MMeF02/JTcskgSdoIIVX
HLGjG/q8J/+XBcNB0ddocPLs/Bl/zx0hy7HKIICENkz3cJOz+y2EYqPumaPToOJ6t1hM8SXgr4+u
iHwezidZHto5fRtAS0IPma1tMT2KG6eHeV9gdorOnMvaXE3de0jpoSmt65VA3MrZyXtNIr0qjgNZ
nV0Dab1+yYBRJfB79jos5vnm+0rQC3mwjtlkjVufE52jRSY2XmEnXzPpa17P
-----END CERTIFICATE-----`
};
const URL = {
  homo: { wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms', wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx' },
  prod: { wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms', wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx' }
};
export const entornoActual = () => (process.env.ARCA_ENV === 'prod' ? 'prod' : 'homo');
const claveDe = ent => (ent === 'prod' ? process.env.ARCA_KEY_PROD : process.env.ARCA_KEY_HOMO) || '';
export const tieneClave = ent => /PRIVATE KEY/.test(claveDe(ent));

// ---------- base (con la clave secreta de Supabase) ----------
export const sb = (path, opts = {}) => fetch(SB + '/rest/v1/' + path, {
  ...opts,
  headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) }
});
const sbJson = async (path, opts) => { const r = await sb(path, opts); const t = await r.text(); return t ? JSON.parse(t) : null; };

// ---------- utilidades ----------
const r2 = n => Math.round((+n || 0) * 100) / 100;
const f2 = n => r2(n).toFixed(2);
const xesc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1] : null; };
const tags = (xml, t) => [...xml.matchAll(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`, 'g'))].map(m => m[1]);
const hoyAR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // AAAA-MM-DD en Argentina
const aaaammdd = iso => iso.replace(/-/g, '');
const deAaaammdd = s => s ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
export const nroComp = (pv, n) => `${String(pv).padStart(5, '0')}-${String(n).padStart(8, '0')}`;
export const tipoCbte = tipo => (tipo === 'NC-B' ? 8 : 6);

// ---------- WSAA: token de 12 h, guardado en la base para no pedir otro ----------
async function loginArca(ent) {
  const [ta] = (await sbJson(`arca_ta?entorno=eq.${ent}`)) || [];
  if (ta && new Date(ta.expira) - Date.now() > 10 * 60e3) return ta;
  const key = claveDe(ent);
  if (!/PRIVATE KEY/.test(key)) throw new Error(`Falta la clave privada de ARCA (${ent === 'prod' ? 'ARCA_KEY_PROD' : 'ARCA_KEY_HOMO'}) en Vercel`);
  const ahora = Date.now(), iso = t => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const tra = `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(ahora / 1000)}</uniqueId><generationTime>${iso(ahora - 600e3)}</generationTime><expirationTime>${iso(ahora + 600e3)}</expirationTime></header><service>wsfe</service></loginTicketRequest>`;
  const cert = forge.pki.certificateFromPem(CERT[ent]), pk = forge.pki.privateKeyFromPem(key.replace(/\\n/g, '\n'));
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({ key: pk, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [
    { type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: new Date() }] });
  p7.sign();
  const cms = forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
  const r = await fetch(URL[ent].wsaa, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
    body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>` });
  const txt = (await r.text()).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const token = tag(txt, 'token'), sign = tag(txt, 'sign'), exp = tag(txt, 'expirationTime');
  if (!token) throw new Error('ARCA (login): ' + (tag(txt, 'faultstring') || 'sin respuesta'));
  const fila = { entorno: ent, token, sign, expira: new Date(exp).toISOString(), updated_at: new Date().toISOString() };
  await sb('arca_ta?on_conflict=entorno', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(fila) });
  return fila;
}

// ---------- WSFE ----------
async function wsfe(ent, metodo, cuerpo) {
  const ta = await loginArca(ent);
  const r = await fetch(URL[ent].wsfe, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"http://ar.gov.afip.dif.FEV1/${metodo}"` },
    body: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://ar.gov.afip.dif.FEV1/"><soap:Body><${metodo}><Auth><Token>${ta.token}</Token><Sign>${ta.sign}</Sign><Cuit>${CUIT}</Cuit></Auth>${cuerpo}</${metodo}></soap:Body></soap:Envelope>` });
  const xml = await r.text();
  if (!r.ok && !xml.includes('<soap:Body>')) throw new Error(`ARCA no respondió (HTTP ${r.status})`);
  const errs = tags(tag(xml, 'Errors') || '', 'Err').map(e => `${tag(e, 'Code')}: ${tag(e, 'Msg')}`);
  return { xml, errs };
}
export async function ultimoNumero(ent, tipo) {
  const { xml, errs } = await wsfe(ent, 'FECompUltimoAutorizado', `<PtoVta>${PTO_VTA}</PtoVta><CbteTipo>${tipo}</CbteTipo>`);
  const n = tag(xml, 'CbteNro');
  if (n == null) throw new Error('ARCA (último número): ' + (errs.join(' | ') || 'sin respuesta'));
  return +n;
}
export async function consultar(ent, tipo, numero) {
  const { xml } = await wsfe(ent, 'FECompConsultar', `<FeCompConsReq><CbteTipo>${tipo}</CbteTipo><CbteNro>${numero}</CbteNro><PtoVta>${PTO_VTA}</PtoVta></FeCompConsReq>`);
  const cae = tag(xml, 'CodAutorizacion');
  return cae ? { cae, cae_vto: deAaaammdd(tag(xml, 'FchVto')), doc_nro: +tag(xml, 'DocNro'), total: +tag(xml, 'ImpTotal'), fecha: deAaaammdd(tag(xml, 'CbteFch')) } : null;
}

// Pide el CAE de un comprobante. c = { tipo:'B'|'NC-B', numero, fecha(AAAA-MM-DD), total, docTipo, docNro, asoc?:{numero, fecha} }
export async function solicitarCAE(ent, c) {
  const total = r2(c.total), neto = r2(total / 1.21), iva = r2(total - neto), t = tipoCbte(c.tipo);
  const asoc = c.asoc ? `<CbtesAsoc><CbteAsoc><Tipo>6</Tipo><PtoVta>${c.asoc.ptoVta || PTO_VTA}</PtoVta><Nro>${c.asoc.numero}</Nro><Cuit>${CUIT}</Cuit><CbteFch>${aaaammdd(c.asoc.fecha)}</CbteFch></CbteAsoc></CbtesAsoc>` : '';
  const req = `<FeCAEReq><FeCabReq><CantReg>1</CantReg><PtoVta>${PTO_VTA}</PtoVta><CbteTipo>${t}</CbteTipo></FeCabReq><FeDetReq><FECAEDetRequest>` +
    `<Concepto>1</Concepto><DocTipo>${c.docTipo}</DocTipo><DocNro>${c.docNro}</DocNro><CbteDesde>${c.numero}</CbteDesde><CbteHasta>${c.numero}</CbteHasta><CbteFch>${aaaammdd(c.fecha)}</CbteFch>` +
    `<ImpTotal>${f2(total)}</ImpTotal><ImpTotConc>0</ImpTotConc><ImpNeto>${f2(neto)}</ImpNeto><ImpOpEx>0</ImpOpEx><ImpTrib>0</ImpTrib><ImpIVA>${f2(iva)}</ImpIVA>` +
    `<MonId>PES</MonId><MonCotiz>1</MonCotiz><CondicionIVAReceptorId>5</CondicionIVAReceptorId>${asoc}` +
    `<Iva><AlicIva><Id>5</Id><BaseImp>${f2(neto)}</BaseImp><Importe>${f2(iva)}</Importe></AlicIva></Iva></FECAEDetRequest></FeDetReq></FeCAEReq>`;
  const { xml, errs } = await wsfe(ent, 'FECAESolicitar', req);
  const det = tag(xml, 'FECAEDetResponse') || '';
  const obs = tags(tag(det, 'Observaciones') || '', 'Obs').map(o => `${tag(o, 'Code')}: ${tag(o, 'Msg')}`);
  if (tag(det, 'Resultado') === 'A' && tag(det, 'CAE')) return { ok: true, cae: tag(det, 'CAE'), cae_vto: deAaaammdd(tag(det, 'CAEFchVto')), neto, iva, obs };
  return { ok: false, rechazo: true, error: [...errs, ...obs].join(' | ') || 'ARCA rechazó el comprobante sin detalle' };
}

// ---------- PDF ----------
const W = s => String(s ?? '').normalize('NFC').replace(/[^\x20-\x7E -ÿ]/g, '-'); // sólo caracteres que entiende la fuente
const plata = n => '$ ' + r2(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fechaAR = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
export async function armarPDF({ ent, tipo, numero, fecha, cae, cae_vto, total, docTipo, docNro, cliente, lineas, asoc, pedido, medio, cfg }) {
  const pdf = await PDFDocument.create(), pg = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gris = rgb(0.45, 0.45, 0.45), linea = rgb(0.75, 0.75, 0.75);
  const tx = (s, x, y, o = {}) => pg.drawText(W(s), { x, y, size: o.s || 9, font: o.b ? fb : f, color: o.c || rgb(0, 0, 0) });
  const txR = (s, xr, y, o = {}) => { const fo = o.b ? fb : f, sz = o.s || 9; tx(s, xr - fo.widthOfTextAtSize(W(s), sz), y, o); };
  const caja = (x, y, w, h) => pg.drawRectangle({ x, y, width: w, height: h, borderColor: linea, borderWidth: 0.8 });
  const nc = tipo === 'NC-B', t = tipoCbte(tipo), neto = r2(r2(total) / 1.21), iva = r2(r2(total) - neto);
  if (ent !== 'prod') tx('PRUEBA (HOMOLOGACION) - SIN VALIDEZ FISCAL', 150, 815, { b: true, s: 11, c: rgb(0.8, 0.1, 0.1) });
  // cabecera
  caja(30, 640, 535, 165); pg.drawLine({ start: { x: 297, y: 640 }, end: { x: 297, y: 770 }, thickness: 0.8, color: linea });
  caja(276, 770, 42, 35); tx('B', 288, 780, { b: true, s: 22 }); tx(`Cod. ${String(t).padStart(3, '0')}`, 281, 772, { s: 6 });
  tx('FORMA Concept', 40, 745, { b: true, s: 16 });
  tx(`Razón social: ${cfg.fact_razon || 'DEL GRUPPO S.R.L.'}`, 40, 722);
  if (cfg.fact_domicilio) { const d = W(cfg.fact_domicilio); tx('Domicilio comercial: ' + d.slice(0, 55), 40, 708); if (d.length > 55) tx(d.slice(55, 110), 40, 696); }
  tx('Condición frente al IVA: IVA Responsable Inscripto', 40, 682);
  tx(nc ? 'NOTA DE CRÉDITO' : 'FACTURA', 310, 745, { b: true, s: 16 });
  tx(`Punto de venta: ${String(PTO_VTA).padStart(5, '0')}    Comp. Nro: ${String(numero).padStart(8, '0')}`, 310, 725, { b: true });
  tx(`Fecha de emisión: ${fechaAR(fecha)}`, 310, 711);
  tx('CUIT: 30-71294990-9', 310, 697);
  tx(`Ingresos Brutos: ${cfg.fact_iibb || '30-71294990-9'}`, 310, 683);
  if (cfg.fact_inicio) tx(`Fecha de inicio de actividades: ${cfg.fact_inicio}`, 310, 669);
  // receptor
  caja(30, 575, 535, 60);
  tx(`${docTipo === 96 ? 'DNI' : 'Doc.'}: ${docTipo === 99 ? '-' : docNro}`, 40, 620);
  tx(`Apellido y nombre: ${String(cliente.nombre || 'Consumidor final').slice(0, 60)}`, 200, 620);
  tx('Condición frente al IVA: Consumidor Final', 40, 604);
  tx(`Condición de venta: ${medio || 'Contado'}`, 300, 604);
  if (cliente.direccion) tx(`Domicilio: ${String(cliente.direccion).slice(0, 90)}`, 40, 588);
  if (asoc) tx(`Comprobante asociado: Factura B ${nroComp(asoc.ptoVta || PTO_VTA, asoc.numero)} del ${fechaAR(asoc.fecha)}`, 300, 588);
  // detalle
  let y = 555;
  pg.drawRectangle({ x: 30, y: y - 4, width: 535, height: 18, color: rgb(0.93, 0.93, 0.93) });
  tx('Cant.', 38, y, { b: true }); tx('Descripción', 80, y, { b: true }); txR('Precio unit.', 455, y, { b: true }); txR('Subtotal', 557, y, { b: true });
  y -= 20;
  for (const l of lineas.slice(0, 22)) {
    tx(String(l.q), 42, y); tx(String(l.desc).slice(0, 62), 80, y); txR(plata(l.unit), 455, y); txR(plata(l.q * l.unit), 557, y); y -= 16;
  }
  pg.drawLine({ start: { x: 30, y: y + 6 }, end: { x: 565, y: y + 6 }, thickness: 0.6, color: linea });
  // totales
  caja(30, 150, 535, 70);
  txR('Importe total:', 470, 195, { b: true, s: 12 }); txR(plata(total), 557, 195, { b: true, s: 12 });
  tx('Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)', 40, 178, { b: true, s: 8 });
  tx(`IVA contenido: ${plata(iva)}`, 40, 166, { s: 8 }); tx('Otros impuestos nacionales indirectos: $ 0,00', 200, 166, { s: 8 });
  tx(`Pedido web #${pedido}`, 40, 155, { s: 8, c: gris });
  // QR de ARCA (RG 4892) + CAE
  const qrDatos = { ver: 1, fecha, cuit: CUIT, ptoVta: PTO_VTA, tipoCmp: t, nroCmp: numero, importe: r2(total), moneda: 'PES', ctz: 1, tipoDocRec: docTipo, nroDocRec: docTipo === 99 ? 0 : +docNro, tipoCodAut: 'E', codAut: +cae };
  const qrUrl = 'https://www.afip.gob.ar/fe/qr/?p=' + Buffer.from(JSON.stringify(qrDatos)).toString('base64');
  const png = await pdf.embedPng(await QRCode.toBuffer(qrUrl, { margin: 1, width: 240 }));
  pg.drawImage(png, { x: 30, y: 30, width: 100, height: 100 });
  tx('Comprobante autorizado por ARCA', 145, 105, { b: true });
  tx(`CAE N°: ${cae}`, 145, 88); tx(`Fecha de vto. de CAE: ${fechaAR(cae_vto)}`, 145, 74);
  tx('Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación.', 145, 50, { s: 6.5, c: gris });
  return Buffer.from(await pdf.save());
}

// ---------- datos del pedido para el comprobante ----------
export async function datosPedido(orderId) {
  const [o] = (await sbJson(`orders?select=*,order_items(cantidad,precio,color,products(tipo,nombre))&id=eq.${orderId}`)) || [];
  if (!o) throw new Error('Pedido no encontrado');
  const dni = String(o.dni || '').replace(/\D/g, '');
  const lineas = (o.order_items || []).map(i => ({ q: i.cantidad, unit: r2(i.precio), desc: [(i.products ? `${i.products.tipo || ''} ${i.products.nombre || ''}` : 'Producto').trim(), i.color].filter(Boolean).join(' - ') }));
  if (+o.costo_envio > 0) lineas.push({ q: 1, unit: r2(o.costo_envio), desc: 'Envío' + (o.envio ? ' - ' + o.envio : '') });
  const suma = r2(lineas.reduce((s, l) => s + l.q * l.unit, 0)), dif = r2(+o.total - suma);
  if (Math.abs(dif) >= 0.01) lineas.push({ q: 1, unit: dif, desc: dif < 0 ? (o.medio_pago === 'transferencia' ? 'Bonificación por pago con transferencia' : 'Bonificación') : 'Ajuste' });
  return { o, lineas, docTipo: /^\d{7,8}$/.test(dni) ? 96 : 99, docNro: /^\d{7,8}$/.test(dni) ? +dni : 0, medio: o.medio_pago === 'transferencia' ? 'Transferencia bancaria' : 'Mercado Pago', cliente: { nombre: o.nombre, direccion: [o.direccion, o.localidad, o.cp && 'CP ' + o.cp].filter(Boolean).join(', ') } };
}
export async function configFactura() {
  const filas = (await sbJson('config_tienda?select=key,value&key=like.fact_*')) || [];
  return Object.fromEntries(filas.map(r => [r.key, r.value]));
}
export const hoy = hoyAR;
