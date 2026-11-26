/* ---------- 6. Gastos: todos los gastos reales del negocio en un solo lugar ----------
   · Gastos fijos (cada mes: sueldos, alquiler, contador, programas…) y puntuales (una vez: una sesión de fotos, un flete…).
   · Depósito Pailos: se calcula solo, día a día, con los m³ que hay guardados (stock real × medidas de cada caja) × la tarifa.
     Con más ventas hay menos m³ y el mes sale más barato. También cuenta las cajas que entran y salen.
   · Costo de la mercadería: el de cada contenedor (sale del cálculo del contenedor) y por producto.
   Inicio usa esto para la ganancia real: gastos fijos + depósito (por mes, proporcional al período) + puntuales del período.
   La tarifa de Pailos también alimenta el cálculo de precios (Configuración → Costos y parámetros: galpón por m³ y por movimiento). */
(function(){
const CATS=['Sueldos y honorarios','Alquiler y oficina','Contador y estudio','Programas y suscripciones','Servicios (luz, internet, teléfono)','Marketing (fuera de los anuncios)','Fotos y contenido','Envíos y fletes','Depósito (extras)','Bancos y comisiones','Impuestos fijos','Otros'];
let G=[],TAR={},DEP=null,VISTA='todo';
const hoyISO=()=>new Date().toISOString().slice(0,10);
const mesTxt=d=>new Date(d+'T12:00').toLocaleDateString('es-AR',{month:'long',year:'numeric'});
const activoEn=(g,d)=>g.tipo==='fijo'&&(!g.desde||g.desde<=d)&&(!g.hasta||g.hasta>=d);
const fijosMes=d=>G.filter(g=>activoEn(g,d)).reduce((a,g)=>a+(+g.monto),0);

/* m³ guardados en Pailos día por día, a partir de los movimientos de stock */
async function deposito(){if(!CAJAS.length)await loadSkus();if(typeof master!=='undefined'&&!master.length)await loadMaster();
  const {data:M}=await sb.from('stock_mov').select('sku_caja,piezas,fecha').order('fecha').limit(50000);
  const K=Object.fromEntries(CAJAS.map(k=>{const v=VARS.find(x=>x.sku===k.sku),m=v&&typeof byCod==='function'?byCod(v.codigo_master):null;
    const cb=+k.cbm||(m&&+m.cbm?(+m.cbm)*(+k.piezas||1)/Math.max(1,CAJAS.filter(z=>z.sku===k.sku).length):0);return [k.sku_caja,{cbm:cb,pz:+k.piezas||1}]}));
  const dia=s=>String(s).slice(0,10),porDia={},movDia={};let sinMedida=new Set();
  (M||[]).forEach(x=>{const k=K[x.sku_caja];if(!k)return;if(!k.cbm)sinMedida.add(x.sku_caja);const d=dia(x.fecha);porDia[d]=(porDia[d]||0)+(x.piezas/k.pz)*k.cbm;movDia[d]=(movDia[d]||0)+Math.abs(x.piezas/k.pz)});
  const dias=Object.keys(porDia).sort();if(!dias.length)return {serie:[],hoy:0,sinMedida:[...sinMedida]};
  const serie=[];let acc=0,i=0;for(let d=new Date(dias[0]+'T12:00');dia(d.toISOString())<=hoyISO();d.setDate(d.getDate()+1)){const s=dia(d.toISOString());if(porDia[s])acc+=porDia[s];serie.push({d:s,m3:Math.max(0,acc),mov:movDia[s]||0})}
  return {serie,hoy:serie.length?serie[serie.length-1].m3:0,sinMedida:[...sinMedida]}}
const costoDep=(rows)=>rows.reduce((a,x)=>a+x.m3*(+TAR.pailos_m3_mes||0)/30+x.mov*(+TAR.pailos_mov_caja||0),0);
function depMes(ym){const R=DEP.serie.filter(x=>x.d.startsWith(ym));return {dias:R.length,m3prom:R.length?R.reduce((a,x)=>a+x.m3,0)/R.length:0,cajas:R.reduce((a,x)=>a+x.mov,0),costo:costoDep(R)+(R.length?(+TAR.pailos_fijo_mes||0)*R.length/new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate():0)}}

async function cargar(){const [{data:g},{data:s}]=await Promise.all([sb.from('gastos').select('*').order('created_at',{ascending:false}),sb.from('settings').select('key,value').in('key',['pailos_m3_mes','pailos_fijo_mes','pailos_mov_caja','tc'])]);
  G=g||[];TAR=Object.fromEntries((s||[]).map(x=>[x.key,+x.value]));DEP=await deposito()}

/* lo que usa Inicio: gastos fijos por mes = fijos activos + depósito proyectado del mes */
async function sincronizar(){const ym=hoyISO().slice(0,7),dm=depMes(ym),diasMes=new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate();
  const depProy=(+TAR.pailos_fijo_mes||0)+DEP.hoy*(+TAR.pailos_m3_mes||0)+(dm.dias?dm.cajas/dm.dias*diasMes*(+TAR.pailos_mov_caja||0):0);
  const v=Math.round(fijosMes(hoyISO())+depProy);if(typeof ST!=='undefined'&&Math.round(+ST.gastos_fijos_mes||0)===v)return;
  await sb.from('settings').upsert({key:'gastos_fijos_mes',value:v,nota:'Se calcula solo en 6. Gastos: fijos del mes + depósito Pailos'});if(typeof ST!=='undefined')ST.gastos_fijos_mes=v}

function html(){const hoy=hoyISO(),ym=hoy.slice(0,7),dm=depMes(ym),fij=fijosMes(hoy),diasMes=new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate();
  const depProy=(+TAR.pailos_fijo_mes||0)+DEP.hoy*(+TAR.pailos_m3_mes||0)+(dm.dias?dm.cajas/dm.dias*diasMes*(+TAR.pailos_mov_caja||0):0);
  const U=G.filter(g=>g.tipo==='unico'),u30=U.filter(g=>g.fecha&&(Date.now()-new Date(g.fecha))<30*864e5).reduce((a,g)=>a+(+g.monto),0);
  const F=G.filter(g=>g.tipo==='fijo');
  const meses=[...new Set(DEP.serie.map(x=>x.d.slice(0,7)))].slice(-6).reverse();
  return `<p class="hint" style="max-width:900px;margin:0 0 14px">Acá van <b>todos los gastos reales</b> del negocio que no son el costo de cada producto. Con esto, <b>Inicio</b> calcula la ganancia de verdad (se suman a las comisiones, envíos, impuestos y anuncios que ya se cuentan solos en cada venta). Los <b>anuncios</b> se cargan en Estadísticas → Anuncios por campaña.</p>
  <div class="kps">${[['Gastos fijos por mes',ars(fij)],['Depósito Pailos este mes',ars(depProy),`proyectado · hoy ${eN(DEP.hoy,1)} m³`],['Puntuales últimos 30 días',ars(u30)],['Total por mes (fijos + depósito)',ars(fij+depProy)]].map(([t,v,h])=>`<div class="card kp"><span>${t}</span><b>${v}</b>${h?`<small class="hint">${h}</small>`:''}</div>`).join('')}</div>
  <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Gastos fijos (todos los meses)</h4><span class="sp"></span><button class="btn dk" data-gnew="fijo">+ Gasto fijo</button></div>
   ${F.length?`<div class="wrap"><table><thead><tr><th>Qué</th><th>Categoría</th><th class="n">Por mes</th><th>Desde</th><th>Hasta</th><th></th></tr></thead><tbody>${F.map(g=>`<tr${activoEn(g,hoy)?'':' class="off"'}><td><b>${esc(g.descripcion||g.categoria)}</b>${g.nota?`<div class="hint">${esc(g.nota)}</div>`:''}</td><td class="hint">${esc(g.categoria)}</td><td class="n"><b>${ars(g.monto)}</b></td><td class="hint">${g.desde?mesTxt(g.desde):'—'}</td><td class="hint">${g.hasta?mesTxt(g.hasta):'sigue'}</td><td style="white-space:nowrap"><button class="lnk" data-ged="${g.id}">Editar</button> · <button class="lnk" data-gdel="${g.id}">Borrar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Todavía no cargaste ninguno. Ej.: sueldos, alquiler, contador, programas (Shopify, Google, etc.).</p>'}</div>
  <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Depósito Pailos</h4><span class="sp"></span></div>
   <p class="hint" style="margin:0 0 10px">Se calcula solo, <b>día a día</b>, con los m³ que hay guardados (el stock real de cada caja × sus medidas). Cuanto más vendés, menos m³ y menos pagás. Cargá la tarifa que te cobra Pailos:</p>
   <div class="bar" style="gap:16px;flex-wrap:wrap;margin:0 0 10px"><label style="margin:0">Por m³ por mes $ <input class="num" data-tar="pailos_m3_mes" style="width:100px" value="${TAR.pailos_m3_mes?Math.round(TAR.pailos_m3_mes).toLocaleString('es-AR'):''}" inputmode="numeric"></label><label style="margin:0">Fijo por mes $ <input class="num" data-tar="pailos_fijo_mes" style="width:100px" value="${TAR.pailos_fijo_mes?Math.round(TAR.pailos_fijo_mes).toLocaleString('es-AR'):''}" inputmode="numeric"></label><label style="margin:0">Por caja que entra o sale $ <input class="num" data-tar="pailos_mov_caja" style="width:90px" value="${TAR.pailos_mov_caja?Math.round(TAR.pailos_mov_caja).toLocaleString('es-AR'):''}" inputmode="numeric"></label></div>
   ${!TAR.pailos_m3_mes&&!TAR.pailos_fijo_mes?'<p class="hint neg" style="margin:0 0 8px">Sin tarifa cargada: el depósito cuenta $0.</p>':''}
   ${DEP.sinMedida.length?`<p class="hint" style="margin:0 0 8px;color:#b26a00">${DEP.sinMedida.length} caja(s) sin medidas: no suman m³ (cargalas en Maestro → Colores y cajas): ${DEP.sinMedida.slice(0,6).map(esc).join(', ')}${DEP.sinMedida.length>6?'…':''}</p>`:''}
   ${meses.length?`<div class="wrap"><table><thead><tr><th>Mes</th><th class="n">m³ promedio</th><th class="n">Cajas que entraron/salieron</th><th class="n">Costo</th></tr></thead><tbody>${meses.map(m=>{const x=depMes(m);return `<tr><td>${mesTxt(m+'-01')}${m===ym?' <span class="hint">(hasta hoy)</span>':''}</td><td class="n">${eN(x.m3prom,1)}</td><td class="n">${Math.round(x.cajas)}</td><td class="n"><b>${ars(x.costo)}</b></td></tr>`}).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay mercadería en Pailos: empieza a contar cuando el contenedor pasa a "Recibido".</p>'}
   <p class="hint" style="margin:8px 0 0">La misma tarifa se usa para calcular el precio de cada producto (lo que cuesta tenerlo guardado mientras se vende).</p></div>
  <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Gastos puntuales</h4><span class="sp"></span><button class="btn dk" data-gnew="unico">+ Gasto puntual</button></div>
   ${U.length?`<div class="wrap"><table><thead><tr><th>Fecha</th><th>Qué</th><th>Categoría</th><th class="n">Monto</th><th></th></tr></thead><tbody>${U.sort((a,b)=>String(b.fecha).localeCompare(a.fecha)).map(g=>`<tr><td class="hint">${g.fecha?new Date(g.fecha+'T12:00').toLocaleDateString('es-AR'):'—'}</td><td><b>${esc(g.descripcion||g.categoria)}</b>${g.nota?`<div class="hint">${esc(g.nota)}</div>`:''}</td><td class="hint">${esc(g.categoria)}</td><td class="n"><b>${ars(g.monto)}</b></td><td style="white-space:nowrap"><button class="lnk" data-ged="${g.id}">Editar</button> · <button class="lnk" data-gdel="${g.id}">Borrar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Ej.: una sesión de fotos, un flete especial, una compra de muestras.</p>'}</div>
  <div class="card pad" id="gmerc"><h4 style="margin:0 0 8px">Costo de la mercadería</h4><p class="hint">Calculando…</p></div>`}

async function mercaderia(){const w=$('#m').querySelector('#gmerc');if(!w)return;try{if(!ECO.ped||!ECO.ped.length)await ecoLoad();await MG.cargar()}catch(e){}if(!w.isConnected)return;
  const P=(ECO.ped||[]).filter(p=>p.estado!=='cerrado');const tc=(ECO.par&&ECO.par.tc)||TAR.tc||1;
  w.innerHTML=`<h4 style="margin:0 0 8px">Costo de la mercadería</h4><p class="hint" style="margin:0 0 8px">Lo que cuesta cada contenedor puesto en el galpón (FOB, flete, seguro, aduana, impuestos y extras). El costo de cada producto vendido se descuenta solo en cada venta (Inicio → "Costo de los productos").</p>
   ${P.length?`<div class="wrap"><table><thead><tr><th>Contenedor</th><th>Estado</th><th class="n">Unidades</th><th class="n">Costo total</th><th class="n">Plata a poner (con IVA y percepciones)</th><th></th></tr></thead><tbody>${P.map(pe=>{const r=ecoCalc(pe);return `<tr><td><b>${esc(pe.nombre)}</b></td><td class="hint">${esc(pe.estado)}</td><td class="n">${r.unidades}</td><td class="n"><b>${eU(r.costoFinal)}</b><div class="hint">${ars(r.costoFinal*tc)}</div></td><td class="n">${eU(r.desembolso)}</td><td><button class="lnk" data-gpe="${pe.id}">Ver costos por producto</button></td></tr>`}).join('')}</tbody></table></div>`:'<p class="hint">No hay contenedores.</p>'}`;
  w.querySelectorAll('[data-gpe]').forEach(b=>b.onclick=()=>{tab='eco';ECO.sel=+b.dataset.gpe;ECO.vista='costos';draw()})}

function editar(g,tipo){g=g||{tipo,categoria:CATS[0],monto:'',desde:hoyISO().slice(0,8)+'01',fecha:hoyISO()};const F=g.tipo==='fijo';
  const d=document.createElement('dialog');d.style.maxWidth='520px';document.body.appendChild(d);
  d.innerHTML=`<div class="dh"><h2>${g.id?'Editar':'Nuevo'} gasto ${F?'fijo':'puntual'}</h2><button class="btn" data-x>Cerrar</button></div><div class="db">
   <label>Qué es</label><input id="g_d" value="${esc(g.descripcion||'')}" placeholder="${F?'ej. Sueldo Juan, Alquiler oficina':'ej. Sesión de fotos noviembre'}">
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
  sincronizar();mercaderia();
  m.querySelectorAll('[data-gnew]').forEach(b=>b.onclick=()=>editar(null,b.dataset.gnew));
  m.querySelectorAll('[data-ged]').forEach(b=>b.onclick=()=>editar(G.find(x=>x.id==b.dataset.ged)));
  m.querySelectorAll('[data-gdel]').forEach(b=>b.onclick=async()=>{const g=G.find(x=>x.id==b.dataset.gdel);if(!confirm(`¿Borrar "${g.descripcion||g.categoria}"?${g.tipo==='fijo'?' Si dejó de pagarse, mejor editalo y poné "Hasta": así queda en los meses anteriores.':''}`))return;const {error}=await sb.from('gastos').delete().eq('id',g.id);toast(error?'No se pudo':'Borrado');pintar()});
  m.querySelectorAll('[data-tar]').forEach(i=>i.onchange=async()=>{const v=+String(i.value).replace(/\D/g,'')||0;await sb.from('settings').upsert({key:i.dataset.tar,value:v,nota:'Tarifa del depósito Pailos'});TAR[i.dataset.tar]=v;
    /* la misma tarifa en el cálculo de precios del contenedor (en US$) */
    try{if(!ECO.par||!Object.keys(ECO.par).length)await ecoLoad();const tc=ECO.par.tc||TAR.tc||1;if(i.dataset.tar==='pailos_m3_mes')ECO.par.galponMes=Math.round(v/tc*100)/100;if(i.dataset.tar==='pailos_mov_caja')ECO.par.movimientoARS=v;
      if(['pailos_m3_mes','pailos_mov_caja'].includes(i.dataset.tar))await sb.from('eco_param').upsert({id:1,par:ECO.par,aranceles:ECO.ar,updated_at:new Date().toISOString()});if(window.MG)MG.ok=false}catch(e){console.warn(e)}
    toast('Tarifa guardada: el depósito y los precios ya la usan');pintar()})}

if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='gastos'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
if(window.AYUDA)AYUDA.gastos='Todos los gastos reales: fijos de cada mes, puntuales, el depósito Pailos (se calcula solo por m³ guardados día a día) y el costo de la mercadería de cada contenedor. Inicio los usa para la ganancia real.';
})();
