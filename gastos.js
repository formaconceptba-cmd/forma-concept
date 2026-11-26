/* ---------- 6. Gastos: todos los gastos reales del negocio en un solo lugar ----------
   · Gastos fijos (cada mes: sueldos, alquiler, contador, programas…) y puntuales (una vez: una sesión de fotos, un flete…).
   · Depósito Pailos, real y automático con las tarifas de Configuración → Costos y parámetros (las mismas que usa la proyección):
     almacenamiento = m³ en depósito al cierre de cada mes × USD por m³ (el mes en curso: m³ de hoy);
     recepción = $ por contenedor que entra; salida = m³ de las cajas despachadas × $ por m³; canon de la API por mes.
     m³ en depósito = stock real de cada caja × m³ de esa caja (sale de los movimientos de stock).
   · Costo de la mercadería por contenedor y punto de equilibrio (cuánto hay que vender por mes para cubrir los fijos).
   Inicio usa esto para la ganancia real: fijos + depósito (por mes, proporcional al período) + puntuales del período. */
(function(){
const CATS=['Sueldos y honorarios','Alquiler y oficina','Contador y estudio','Programas y suscripciones','Servicios (luz, internet, teléfono)','Marketing (fuera de los anuncios)','Fotos y contenido','Envíos y fletes','Depósito (extras)','Bancos y comisiones','Impuestos fijos','Otros'];
let G=[],DEP=null,P={};
const hoyISO=()=>new Date().toISOString().slice(0,10);
const mesTxt=d=>new Date(d+'T12:00').toLocaleDateString('es-AR',{month:'long',year:'numeric'});
const activoEn=(g,d)=>g.tipo==='fijo'&&(!g.desde||g.desde<=d)&&(!g.hasta||g.hasta>=d);
const fijosMes=d=>G.filter(g=>activoEn(g,d)).reduce((a,g)=>a+(+g.monto),0);
const TARS=[['galponMes','Almacenamiento, por m³ por mes','USD'],['recepcionARS','Recepción, por contenedor','$'],['movimientoARS','Salida de cajas, por m³ despachado','$'],['prepPedidos','Preparación, por pedido','$'],['devolucionARS','Devolución: ingreso, por pedido','$'],['apiCanonMes','Integración API, canon por mes','$'],['apiImplARS','Integración API, implementación (una vez)','$']];

/* stock en m³ por día, salidas y recepciones, a partir de los movimientos de stock */
async function deposito(){if(!CAJAS.length)await loadSkus();if(typeof master!=='undefined'&&!master.length)await loadMaster();
  const {data:M}=await sb.from('stock_mov').select('sku_caja,piezas,fecha,motivo,ref').order('fecha').limit(50000);
  const K=Object.fromEntries(CAJAS.map(k=>{const v=VARS.find(x=>x.sku===k.sku),m=v&&typeof byCod==='function'?byCod(v.codigo_master):null;
    const cb=+k.cbm||(m&&+m.cbm?(+m.cbm)*(+k.piezas||1)/Math.max(1,CAJAS.filter(z=>z.sku===k.sku).length):0);return [k.sku_caja,{cbm:cb,pz:+k.piezas||1}]}));
  const dia=s=>String(s).slice(0,10),porDia={},salDia={},rec={},sinMedida=new Set();
  (M||[]).forEach(x=>{const k=K[x.sku_caja];if(!k)return;if(!k.cbm)sinMedida.add(x.sku_caja);const d=dia(x.fecha),m3=(x.piezas/k.pz)*k.cbm;porDia[d]=(porDia[d]||0)+m3;
    if(x.motivo==='venta'||x.motivo==='anulacion')salDia[d]=(salDia[d]||0)-m3;
    if(x.motivo==='ingreso'&&x.ref&&!rec[x.ref])rec[x.ref]=d});
  const dias=Object.keys(porDia).sort(),serie=[];let acc=0;
  if(dias.length)for(let d=new Date(dias[0]+'T12:00');dia(d.toISOString())<=hoyISO();d.setDate(d.getDate()+1)){const s=dia(d.toISOString());if(porDia[s])acc+=porDia[s];serie.push({d:s,m3:Math.max(0,acc),sal:Math.max(0,salDia[s]||0)})}
  return {serie,hoy:serie.length?serie[serie.length-1].m3:0,rec:Object.values(rec),sinMedida:[...sinMedida]}}
/* costo del depósito de un mes (ym = "2026-11") */
function depMes(ym){const R=DEP.serie.filter(x=>x.d.startsWith(ym)),tc=+P.tc||1;if(!R.length)return {m3:0,sal:0,rec:0,alm:0,salida:0,recepcion:0,canon:0,total:0};
  const m3=R[R.length-1].m3,sal=R.reduce((a,x)=>a+x.sal,0),rec=DEP.rec.filter(d=>d.startsWith(ym)).length;
  const alm=m3*(+P.galponMes||0)*tc,salida=sal*(+P.movimientoARS||0)*(+P.vecesMov||1),recepcion=rec*(+P.recepcionARS||0),canon=+P.apiCanonMes||0;
  return {m3,sal,rec,alm,salida,recepcion,canon,total:alm+salida+recepcion+canon}}

async function cargar(){const [{data:g}]=await Promise.all([sb.from('gastos').select('*').order('created_at',{ascending:false}),ECO.ped&&ECO.ped.length?0:ecoLoad()]);
  G=g||[];P=ECO.par||{};DEP=await deposito()}

/* lo que usa Inicio: gastos por mes = fijos activos + depósito del mes en curso (proyectado con los m³ de hoy) */
async function sincronizar(){const v=Math.round(fijosMes(hoyISO())+depMes(hoyISO().slice(0,7)).total);if(typeof ST!=='undefined'&&Math.round(+ST.gastos_fijos_mes||0)===v)return;
  await sb.from('settings').upsert({key:'gastos_fijos_mes',value:v,nota:'Se calcula solo en 6. Gastos: fijos del mes + depósito Pailos'});if(typeof ST!=='undefined')ST.gastos_fijos_mes=v}

function html(){const hoy=hoyISO(),ym=hoy.slice(0,7),dm=depMes(ym),fij=fijosMes(hoy);
  const U=G.filter(g=>g.tipo==='unico'),u30=U.filter(g=>g.fecha&&(Date.now()-new Date(g.fecha))<30*864e5).reduce((a,g)=>a+(+g.monto),0),F=G.filter(g=>g.tipo==='fijo');
  const meses=[...new Set(DEP.serie.map(x=>x.d.slice(0,7)))].slice(-6).reverse();
  return `<p class="hint" style="max-width:900px;margin:0 0 14px">Acá van <b>todos los gastos reales</b> del negocio que no son el costo de cada producto. Con esto, <b>Inicio</b> calcula la ganancia de verdad (se suman a las comisiones, envíos, impuestos y anuncios que ya se cuentan solos en cada venta). Los <b>anuncios</b> se cargan en Estadísticas → Anuncios por campaña.</p>
  <div class="kps">${[['Gastos fijos por mes',ars(fij)],['Depósito Pailos este mes',ars(dm.total),`hoy ${eN(DEP.hoy,1)} m³ guardados`],['Puntuales últimos 30 días',ars(u30)],['Total por mes (fijos + depósito)',ars(fij+dm.total)]].map(([t,v,h])=>`<div class="card kp"><span>${t}</span><b>${v}</b>${h?`<small class="hint">${h}</small>`:''}</div>`).join('')}</div>
  <div class="card pad" id="gpe" style="margin-bottom:14px"><h4 style="margin:0 0 6px">Punto de equilibrio</h4><p class="hint">Calculando…</p></div>
  <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Gastos fijos (todos los meses)</h4><span class="sp"></span><button class="btn dk" data-gnew="fijo">+ Gasto fijo</button></div>
   ${F.length?`<div class="wrap"><table><thead><tr><th>Qué</th><th>Categoría</th><th class="n">Por mes</th><th>Desde</th><th>Hasta</th><th></th></tr></thead><tbody>${F.map(g=>`<tr${activoEn(g,hoy)?'':' class="off"'}><td><b>${esc(g.descripcion||g.categoria)}</b>${g.nota?`<div class="hint">${esc(g.nota)}</div>`:''}</td><td class="hint">${esc(g.categoria)}</td><td class="n"><b>${ars(g.monto)}</b></td><td class="hint">${g.desde?mesTxt(g.desde):'—'}</td><td class="hint">${g.hasta?mesTxt(g.hasta):'sigue'}</td><td style="white-space:nowrap"><button class="lnk" data-ged="${g.id}">Editar</button> · <button class="lnk" data-gdel="${g.id}">Borrar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Todavía no cargaste ninguno. Ej.: sueldos, alquiler, contador, programas.</p>'}</div>
  <div class="card pad" style="margin-bottom:14px"><h4 style="margin:0 0 6px">Depósito Pailos</h4>
   <p class="hint" style="margin:0 0 10px">Se calcula solo con el stock real: <b>almacenamiento</b> = m³ en el depósito al cierre del mes × tarifa (el mes en curso, con los m³ de hoy); <b>recepción</b> = por cada contenedor que entra; <b>salida</b> = m³ de las cajas que se despachan × tarifa (se cobra sólo a la salida, por volumen); más el canon de la API. Las tarifas son las mismas que usa el precio de cada producto; se editan acá o en Configuración → Costos y parámetros.</p>
   <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px 16px;margin:0 0 10px">${TARS.map(([k,t,u])=>`<label style="margin:0;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:400"><span>${t}</span><span style="white-space:nowrap">${u} <input class="num" data-par="${k}" style="width:${u==='USD'?70:100}px" value="${P[k]!=null?(u==='USD'?String(P[k]).replace('.',','):Math.round(P[k]).toLocaleString('es-AR')):''}" inputmode="decimal"></span></label>`).join('')}</div>
   <p class="hint" style="margin:0 0 10px">Tipo de cambio: ${ars(P.tc)} (Configuración → Costos y parámetros). Valores + IVA (el IVA es crédito fiscal). Reparto al cliente: tarifas guardadas en Costos y parámetros, todavía sin usar.</p>
   ${DEP.sinMedida.length?`<p class="hint" style="margin:0 0 8px;color:#b26a00">${DEP.sinMedida.length} caja(s) sin medidas: no suman m³ (cargalas en Maestro → Colores y cajas): ${DEP.sinMedida.slice(0,6).map(esc).join(', ')}${DEP.sinMedida.length>6?'…':''}</p>`:''}
   ${meses.length?`<div class="wrap"><table><thead><tr><th>Mes</th><th class="n">m³ al cierre</th><th class="n">Almacenamiento</th><th class="n">m³ despachados</th><th class="n">Salidas</th><th class="n">Recepción</th><th class="n">API</th><th class="n">Total</th></tr></thead><tbody>${meses.map(m=>{const x=depMes(m);return `<tr><td>${mesTxt(m+'-01')}${m===ym?' <span class="hint">(en curso)</span>':''}</td><td class="n">${eN(x.m3,1)}</td><td class="n">${ars(x.alm)}</td><td class="n">${eN(x.sal,2)}</td><td class="n">${ars(x.salida)}</td><td class="n">${x.rec?ars(x.recepcion):'—'}</td><td class="n">${x.canon?ars(x.canon):'—'}</td><td class="n"><b>${ars(x.total)}</b></td></tr>`}).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay mercadería en Pailos: empieza a contar cuando el contenedor pasa a "Recibido".</p>'}</div>
  <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Gastos puntuales</h4><span class="sp"></span><button class="btn dk" data-gnew="unico">+ Gasto puntual</button></div>
   ${U.length?`<div class="wrap"><table><thead><tr><th>Fecha</th><th>Qué</th><th>Categoría</th><th class="n">Monto</th><th></th></tr></thead><tbody>${U.sort((a,b)=>String(b.fecha).localeCompare(a.fecha)).map(g=>`<tr><td class="hint">${g.fecha?new Date(g.fecha+'T12:00').toLocaleDateString('es-AR'):'—'}</td><td><b>${esc(g.descripcion||g.categoria)}</b>${g.nota?`<div class="hint">${esc(g.nota)}</div>`:''}</td><td class="hint">${esc(g.categoria)}</td><td class="n"><b>${ars(g.monto)}</b></td><td style="white-space:nowrap"><button class="lnk" data-ged="${g.id}">Editar</button> · <button class="lnk" data-gdel="${g.id}">Borrar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Ej.: una sesión de fotos, un flete especial, la implementación de la API de Pailos.</p>'}</div>
  <div class="card pad" id="gmerc"><h4 style="margin:0 0 8px">Costo de la mercadería</h4><p class="hint">Calculando…</p></div>`}

/* punto de equilibrio: cuánto hay que vender por mes para cubrir los gastos fijos + depósito */
async function equilibrio(){const w=$('#m').querySelector('#gpe');if(!w)return;await MG.cargar();if(!w.isConnected)return;
  const L=(typeof prods!=='undefined'?prods:[]).filter(p=>p.activo&&+p.precio_lista>0).map(p=>MG.cuentas(p.id,+p.precio_lista,{medio:'mix'})).filter(Boolean);
  const venta=L.reduce((a,c)=>a+c.venta,0),antes=L.reduce((a,c)=>a+c.antes,0),cm=venta>0?antes/venta:0,fij=fijosMes(hoyISO())+depMes(hoyISO().slice(0,7)).total;
  const vpu=L.length?venta/L.length:0,need=cm>0?fij/cm:null;
  w.innerHTML=`<h4 style="margin:0 0 6px">Punto de equilibrio</h4>
   <p style="margin:0 0 6px">De cada $100 que vendés (sin IVA), después de pagar el producto y los gastos de cada venta (cobro, IIBB, marketing, envío, garantía, galpón) te quedan <b>$${eN(cm*100,1)}</b> para cubrir los gastos fijos.</p>
   ${fij>0&&need?`<p style="margin:0">Para cubrir <b>${ars(fij)}</b> por mes (fijos + depósito) tenés que vender <b>${ars(need)}</b> por mes sin IVA (${ars(need*1.21)} con IVA), ${Math.ceil(need/vpu)>1?`unas <b>${Math.ceil(need/vpu)}</b> unidades`:"<b>1</b> unidad"} al precio promedio. Arriba de eso, es ganancia.</p>`:'<p class="hint" style="margin:0">Cargá los gastos fijos para ver cuánto hay que vender por mes.</p>'}
   <p class="hint" style="margin:6px 0 0">Los gastos fijos no se meten en el "mínimo sin perder" de cada producto: no dependen de cuánto vendas de cada uno. Se cubren con el volumen; por eso acá ves cuánto hay que vender por mes.</p>`}

async function mercaderia(){const w=$('#m').querySelector('#gmerc');if(!w)return;
  const PE=(ECO.ped||[]).filter(p=>p.estado!=='cerrado'),tc=+P.tc||1;
  w.innerHTML=`<h4 style="margin:0 0 8px">Costo de la mercadería</h4><p class="hint" style="margin:0 0 8px">Lo que cuesta cada contenedor puesto en el galpón (FOB, flete, seguro, aduana, impuestos y extras). El costo de cada producto vendido se descuenta solo en cada venta (Inicio → "Costo de los productos").</p>
   ${PE.length?`<div class="wrap"><table><thead><tr><th>Contenedor</th><th>Estado</th><th class="n">Unidades</th><th class="n">Costo total</th><th class="n">Plata a poner (con IVA y percepciones)</th><th></th></tr></thead><tbody>${PE.map(pe=>{const r=ecoCalc(pe);return `<tr><td><b>${esc(pe.nombre)}</b></td><td class="hint">${esc(pe.estado)}</td><td class="n">${r.unidades}</td><td class="n"><b>${eU(r.costoFinal)}</b><div class="hint">${ars(r.costoFinal*tc)}</div></td><td class="n">${eU(r.desembolso)}</td><td><button class="lnk" data-gpe="${pe.id}">Ver costos por producto</button></td></tr>`}).join('')}</tbody></table></div>`:'<p class="hint">No hay contenedores.</p>'}`;
  w.querySelectorAll('[data-gpe]').forEach(b=>b.onclick=()=>{tab='eco';ECO.sel=+b.dataset.gpe;ECO.vista='costos';draw()})}

function editar(g,tipo){g=g||{tipo,categoria:CATS[0],monto:'',desde:hoyISO().slice(0,8)+'01',fecha:hoyISO()};const F=g.tipo==='fijo';
  const d=document.createElement('dialog');d.style.maxWidth='520px';document.body.appendChild(d);
  d.innerHTML=`<div class="dh"><h2>${g.id?'Editar':'Nuevo'} gasto ${F?'fijo':'puntual'}</h2><button class="btn" data-x>Cerrar</button></div><div class="db">
   <label>Qué es</label><input id="g_d" value="${esc(g.descripcion||'')}" placeholder="${F?'ej. Sueldo, Alquiler oficina':'ej. Sesión de fotos noviembre'}">
   <label style="margin-top:10px">Categoría</label><select id="g_c">${CATS.map(c=>`<option${c===g.categoria?' selected':''}>${c}</option>`).join('')}</select>
   <label style="margin-top:10px">${F?'Monto por mes':'Monto'} ($, con todo incluido)</label><input id="g_m" class="num" value="${g.monto?Math.round(g.monto).toLocaleString('es-AR'):''}" inputmode="numeric">
   ${F?`<div class="g2d" style="gap:10px;margin-top:10px"><div><label>Desde</label><input id="g_de" type="month" value="${(g.desde||'').slice(0,7)}"></div><div><label>Hasta</label><input id="g_ha" type="month" value="${(g.hasta||'').slice(0,7)}"><div class="hint">Vacío = sigue.</div></div></div>`
     :`<label style="margin-top:10px">Fecha</label><input id="g_f" type="date" value="${g.fecha||hoyISO()}">`}
   <label style="margin-top:10px">Nota (opcional)</label><input id="g_n" value="${esc(g.nota||'')}">
   <div class="bar" style="margin-top:14px"><span class="hint neg" id="g_e"></span><span class="sp"></span><button class="btn dk" id="g_ok">Guardar</button></div></div>`;
  d.querySelector('[data-x]').onclick=()=>{d.close();d.remove()};d.showModal();
  d.querySelector('#g_ok').onclick=async()=>{const q=s=>d.querySelector(s),m=+String(q('#g_m').value).replace(/\D/g,'')||0;if(!(m>0))return q('#g_e').textContent='Poné el monto.';
    const row={tipo:g.tipo,descripcion:q('#g_d').value.trim()||null,categoria:q('#g_c').value,monto:m,nota:q('#g_n').value.trim()||null};
    if(F){row.desde=q('#g_de').value?q('#g_de').value+'-01':hoyISO().slice(0,8)+'01';const h=q('#g_ha').value;row.hasta=h?new Date(+h.slice(0,4),+h.slice(5,7),0).toISOString().slice(0,10):null}else row.fecha=q('#g_f').value||hoyISO();
    const {error}=g.id?await sb.from('gastos').update(row).eq('id',g.id):await sb.from('gastos').insert(row);if(error)return q('#g_e').textContent='No se pudo: '+error.message;
    d.close();d.remove();toast('Guardado');pintar()}}

async function pintar(){if(tab!=='gastos')return;$('#m').innerHTML='<p class="hint">Cargando…</p>';await cargar();if(tab!=='gastos')return;$('#m').innerHTML=html();const m=$('#m');
  sincronizar();mercaderia();equilibrio();
  m.querySelectorAll('[data-gnew]').forEach(b=>b.onclick=()=>editar(null,b.dataset.gnew));
  m.querySelectorAll('[data-ged]').forEach(b=>b.onclick=()=>editar(G.find(x=>x.id==b.dataset.ged)));
  m.querySelectorAll('[data-gdel]').forEach(b=>b.onclick=async()=>{const g=G.find(x=>x.id==b.dataset.gdel);if(!confirm(`¿Borrar "${g.descripcion||g.categoria}"?${g.tipo==='fijo'?' Si dejó de pagarse, mejor editalo y poné "Hasta": así queda en los meses anteriores.':''}`))return;const {error}=await sb.from('gastos').delete().eq('id',g.id);toast(error?'No se pudo':'Borrado');pintar()});
  /* tarifas de Pailos: se guardan en los mismos parámetros que usa la proyección de cada contenedor */
  m.querySelectorAll('[data-par]').forEach(i=>i.onchange=async()=>{const v=typeof eNum==='function'?eNum(i.value):+String(i.value).replace(/\./g,'').replace(',','.');if(v==null||!isFinite(v))return toast('Número inválido');
    ECO.par[i.dataset.par]=v;const {error}=await sb.from('eco_param').upsert({id:1,par:ECO.par,aranceles:ECO.ar,updated_at:new Date().toISOString()});if(window.MG)MG.ok=false;
    toast(error?'No se pudo guardar':'Guardado: el depósito real y los precios ya lo usan');pintar()})}

if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='gastos'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
if(window.AYUDA)AYUDA.gastos='Todos los gastos reales: fijos de cada mes, puntuales, el depósito Pailos (se calcula solo con el stock real y las tarifas) y el costo de la mercadería. Muestra el punto de equilibrio. Inicio los usa para la ganancia real.';
})();
