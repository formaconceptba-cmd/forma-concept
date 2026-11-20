/* ---------- Contenedores: ¿conviene traer este contenedor, y a qué precios? ----------
   Usa calcular() de eco-calc.js. Datos: eco_param (parámetros globales + aranceles), eco_pedidos, eco_items, master_productos. */
let ECO={ped:[],it:[],par:{},ar:{},sel:null,vista:'tablero',cmp:[]};
const eU=n=>n==null||!isFinite(n)?'—':(n<0?'− ':'')+'US$ '+Math.round(Math.abs(n)).toLocaleString('es-AR');
const eP=(n,d=1)=>n==null||!isFinite(n)?'—':(n*100).toFixed(d).replace('.',',')+'%';
const eN=(n,d=2)=>n==null?'—':(+n).toFixed(d).replace('.',',');
const eNum=s=>{s=String(s).trim();if(s==='')return null;return +s.replace(/\s/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')};
const ESTP={borrador:'Borrador',confirmado:'Confirmado',en_transito:'En tránsito',recibido:'Recibido',cerrado:'Cerrado'};

/* qué es cada parámetro y quién decide el número */
const PAR_META=[
 ['Tipo de cambio y objetivos',[['tc','Tipo de cambio (ARS por USD)','DATO','num'],['objetivo','Rentabilidad anual objetivo','INPUT','pct'],['costoOportunidad','Costo de oportunidad de la plata (anual)','INPUT','pct'],['markupDefault','Markup por defecto para el precio sugerido','INPUT','pct'],['retornoMinProd','Retorno mínimo por producto','INPUT','pct'],['margenMinProd','Margen mínimo por producto','INPUT','pct'],['descTransf','Descuento por pagar con transferencia','INPUT','pct']]],
 ['Contenedor y flete',[['flete20','Flete contenedor 20’ (USD)','DATO','usd'],['cbm20','Capacidad 20’ (m³)','DATO','num'],['flete40','Flete contenedor 40’ (USD)','DATO','usd'],['cbm40','Capacidad 40’ (m³)','DATO','num'],['fleteHQ','Flete contenedor 40’ HQ (USD)','DATO','usd'],['cbmHQ','Capacidad 40’ HQ (m³)','DATO','num']]],
 ['Despacho y aduana',[['seguroPct','Seguro (sobre FOB)','DATO','pct'],['honorariosPct','Honorarios del despachante (sobre FOB)','DATO','pct'],['despachoFijo','Despacho, fijo por pedido (USD)','DATO','usd'],['verificacion','Verificación (USD)','DATO','usd'],['terminal','Terminal, por contenedor (USD)','DATO','usd'],['transporte','Transporte puerto → galpón, por contenedor (USD)','DATO','usd'],['descarga','Descarga, por contenedor (USD)','DATO','usd'],['diasFiscal','Días en depósito fiscal','SUPUESTO','num'],['almacenajeDia','Depósito fiscal, por m³ y día (USD)','DATO','usd'],['resguardo','Resguardo del depósito fiscal (USD)','DATO','usd'],['imprevistos','Imprevistos (sobre el costo)','INPUT','pct']]],
 ['Impuestos',[['iva','IVA','DATO','pct'],['percepIva','Percepción de IVA en aduana','DATO','pct'],['percepGan','Percepción de Ganancias en aduana','DATO','pct'],['iibb','Ingresos Brutos sobre la venta','DATO','pct'],['ganancias','Impuesto a las Ganancias','DATO','pct']]],
 ['Galpón y fulfillment (Pailos)',[['galponMes','Galpón, por m³ y mes (USD)','DATO','usd'],['factorStock','Stock promedio en el galpón (0,5 = la mitad)','SUPUESTO','num'],['recepcionARS','Recepción del contenedor (ARS)','DATO','ars'],['movimientoARS','Movimiento, por m³ (ARS)','DATO','ars'],['vecesMov','Veces que se cobra el movimiento','DATO','num'],['prepPedidos','Preparación, por pedido (ARS)','DATO','ars'],['seguroDeposito','Seguro del depósito (USD)','DATO','usd']]],
 ['Cobro',[['comChk','Comisión Mercado Pago, 1 pago','DATO','pct'],['com3Cuotas','Costo extra de ofrecer 3 cuotas','DATO','pct'],['comTransf','Comisión por transferencia','DATO','pct'],['comPlataforma','Comisión de plataforma','DATO','pct'],['ivaComisionEsCosto','¿El IVA de la comisión es costo? (1 = sí, 0 = no)','INPUT','num'],['mixTransf','Parte que paga con transferencia','SUPUESTO','pct'],['mixUnPago','Parte que paga con tarjeta en 1 pago','SUPUESTO','pct'],['webARS','Web, por mes (ARS)','DATO','ars']]],
 ['Tiempos',[['anticipo','Anticipo al proveedor','DATO','pct'],['produccion','Días de producción','DATO','num'],['transito','Días de tránsito','SUPUESTO','num'],['nacionalizacion','Días de nacionalización','SUPUESTO','num']]],
 ['Venta',[['meses','Meses para vender todo (rotación)','SUPUESTO','num'],['unidPorVenta','Unidades por venta','SUPUESTO','num'],['merma','Merma (roturas, sobre el costo)','SUPUESTO','pct'],['marketing','Marketing (sobre la venta)','SUPUESTO','pct'],['entrega','Entrega al cliente (sobre la venta)','SUPUESTO','pct'],['garantia','Garantía y devoluciones','SUPUESTO','pct'],['comisionVenta','Comisión de vendedores','INPUT','pct'],['pctLiquidado','Parte que se liquida con descuento','SUPUESTO','pct'],['descLiquidacion','Descuento de liquidación','SUPUESTO','pct'],['pctNoVendido','Parte que no se vende','SUPUESTO','pct'],['estructuraMes','Tu sueldo / estructura, por mes (USD)','INPUT','usd'],['pctEstructura','Parte de la estructura que paga este pedido','INPUT','pct']]]];
const PAR_LBL=Object.fromEntries(PAR_META.flatMap(g=>g[1]).map(x=>[x[0],x]));
const TAGC={INPUT:'#2d6a4f',DATO:'#1d4e89',SUPUESTO:'#b5651d',AUTO:'#666'};
const tag=t=>`<span style="font:600 9.5px/1 Outfit,sans-serif;letter-spacing:.06em;padding:3px 5px;border-radius:3px;color:#fff;background:${TAGC[t]}">${t}</span>`;
const fmtPar=(k,v)=>{const m=PAR_LBL[k];if(!m)return v;return m[3]==='pct'?eP(v,2):m[3]==='usd'?eU(v):m[3]==='ars'?ars(v):eN(v,v%1?2:0)};

async function ecoLoad(){
  const [{data:pr},{data:pe},{data:it}]=await Promise.all([sb.from('eco_param').select('*').eq('id',1).maybeSingle(),sb.from('eco_pedidos').select('*').order('created_at'),sb.from('eco_items').select('*').order('orden')]);
  if(!master.length)await loadMaster();
  ECO.par=Object.assign({},PAR_DEF,{tc:ST.tc||PAR_DEF.tc},(pr&&pr.par)||{});ECO.par.tc=ST.tc||ECO.par.tc;ECO.ar=(pr&&pr.aranceles)||{};ECO.ped=pe||[];ECO.it=it||[];
}
const ecoCat=()=>master.map(x=>({codigo:x.codigo,desc:x.descripcion,subcat:x.subcategoria,prov:x.proveedor,fob:x.fob_usd,cbm:x.cbm,moq:x.moq,foto:x.foto_url,medidas:x.medidas,material:x.material}));
const ecoPedido=pe=>({par:pe.par||{},items:ECO.it.filter(i=>i.pedido_id===pe.id).map(i=>({codigo:i.codigo,cant:i.cant,precioARS:i.precio_ars,markupManual:i.markup_manual}))});
const ecoCalc=(pe,extra)=>calcular(Object.assign(ecoPedido(pe),extra?{par:Object.assign({},pe.par||{},extra)}:{}),ecoCat(),ECO.par,ECO.ar);
/* costo puesto en el galpón por unidad (USD), del pedido más reciente que trae ese producto: lo usa Rentabilidad */
function ecoCostos(){const out={};const ord=[...ECO.ped].sort((a,b)=>(a.estado==='borrador')-(b.estado==='borrador')||b.created_at.localeCompare(a.created_at));
  ord.slice().reverse().forEach(pe=>{const r=ecoCalc(pe);r.items.forEach(i=>{if(i.cant>0&&i.costoU>0)out[i.codigo]=i.costoU})});return out}

async function drawEco(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';
  await ecoLoad();
  if(ECO.sel&&!ECO.ped.find(p=>p.id===ECO.sel))ECO.sel=null;
  if(ECO.sel)return drawEcoPedido();
  if(ECO.vista==='comparar')return drawEcoComparar();
  const R=ECO.ped.map(pe=>({pe,r:ecoCalc(pe)}));
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Contenedores</b><span class="sp"></span>${R.length>1?'<button class="btn" id="ecmp">Comparar</button>':''}<button class="btn dk" id="enew">+ Nuevo pedido</button></div>
  <p class="hint" style="max-width:760px;margin:0 0 14px">Cada tarjeta es un contenedor. Cargás productos, cantidades y precios, y te dice cuánta plata hay que poner (pico de caja), cuánto queda y cuánto rinde por año. Los números en US$.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
  ${R.map(({pe,r})=>`<div class="card pad" data-ped="${pe.id}" style="cursor:pointer"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font:500 18px Outfit,sans-serif">${esc(pe.nombre)}</b><span class="hint">${ESTP[pe.estado]||pe.estado}</span></div>
   <div class="hint">${esc(pe.proveedor||'')} · ${r.unidades} unidades · ${eN(r.cbm)} m³</div>
   <div class="fb" style="margin:10px 0 4px"><i style="width:${Math.min(100,r.ocupacion*100)}%"></i></div><div class="hint">${eP(r.ocupacion,0)} del contenedor (${[r.cont.nHQ&&r.cont.nHQ+'× 40HQ',r.cont.n40&&r.cont.n40+'× 40’',r.cont.n20&&r.cont.n20+'× 20’'].filter(Boolean).join(' + ')||'vacío'})</div>
   <div class="rw" style="margin-top:8px"><span>Plata a poner (pico)</span><b>${eU(r.pico)}</b></div><div class="rw"><span>Te queda</span><b class="${r.resultado<0?'neg':''}">${eU(r.resultado)}</b></div><div class="rw"><span>Rinde por año</span><b class="${r.anualizado>=r.p.objetivo?'pos':'neg'}">${eP(r.anualizado)}</b></div></div>`).join('')||'<p class="hint">Todavía no hay pedidos.</p>'}</div>`;
  $('#m').querySelectorAll('[data-ped]').forEach(c=>c.onclick=()=>{ECO.sel=+c.dataset.ped;ECO.vista='tablero';drawEco()});
  $('#enew').onclick=async()=>{const {data,error}=await sb.from('eco_pedidos').insert({nombre:'CONCEPT '+String(ECO.ped.length+1).padStart(2,'0')}).select().single();if(error)return toast('No se pudo crear');ECO.sel=data.id;ECO.vista='productos';drawEco()};
  const c=$('#ecmp');if(c)c.onclick=()=>{ECO.vista='comparar';ECO.cmp=ECO.ped.map(p=>p.id);drawEco()};
}

function drawEcoPedido(){
  const pe=ECO.ped.find(p=>p.id===ECO.sel),r=ecoCalc(pe),V=ECO.vista;
  const T=[['tablero','Tablero'],['productos','Productos'],['precios','Precios'],['costos','Costos'],['caja','Caja']];
  const body={tablero:ecoTablero,productos:ecoProductos,precios:ecoPrecios,costos:ecoCostosV,caja:ecoCaja}[V]||ecoTablero;
  $('#m').innerHTML=`<div class="bar"><button class="btn" id="eback">← Contenedores</button><input id="enom" value="${esc(pe.nombre)}" style="font:500 20px Outfit,sans-serif;border:0;background:none;width:200px"><input id="eprov" value="${esc(pe.proveedor||'')}" placeholder="proveedor" style="width:150px">
   <select id="eest">${Object.entries(ESTP).map(([k,l])=>`<option value="${k}" ${pe.estado===k?'selected':''}>${l}</option>`).join('')}</select><span class="sp"></span><button class="btn" id="edup">Duplicar</button><button class="btn" id="edel">Borrar</button></div>
  <div class="bar" style="gap:6px">${T.map(([k,l])=>`<button class="btn ${V===k?'dk':''}" data-ev="${k}">${l}</button>`).join('')}</div>
  <div id="ebody">${body(pe,r)}</div>`;
  const upd=async(f,v)=>{pe[f]=v;const {error}=await sb.from('eco_pedidos').update({[f]:v}).eq('id',pe.id);toast(error?'No se pudo guardar':'Guardado')};
  $('#eback').onclick=()=>{ECO.sel=null;drawEco()};
  $('#enom').onchange=e=>upd('nombre',e.target.value.trim()||pe.nombre);$('#eprov').onchange=e=>upd('proveedor',e.target.value.trim());$('#eest').onchange=e=>upd('estado',e.target.value);
  $('#m').querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{ECO.vista=b.dataset.ev;drawEcoPedido()});
  $('#edel').onclick=async()=>{if(!confirm(`¿Borrar ${pe.nombre} y todos sus productos? No se puede deshacer.`))return;const {error}=await sb.from('eco_pedidos').delete().eq('id',pe.id);if(error)return toast('No se pudo borrar');ECO.sel=null;drawEco()};
  $('#edup').onclick=async()=>{const {data,error}=await sb.from('eco_pedidos').insert({nombre:pe.nombre+' (copia)',proveedor:pe.proveedor,notas:pe.notas,par:pe.par}).select().single();if(error)return toast('No se pudo duplicar');
    const its=ECO.it.filter(i=>i.pedido_id===pe.id).map(i=>({pedido_id:data.id,codigo:i.codigo,cant:i.cant,precio_ars:i.precio_ars,markup_manual:i.markup_manual,orden:i.orden}));if(its.length)await sb.from('eco_items').insert(its);ECO.sel=data.id;toast('Duplicado');drawEco()};
  ({productos:bindProductos,precios:bindPrecios,tablero:bindTablero})[V]?.(pe,r);
}

/* ---- Tablero: 8 bloques ---- */
const GLBL={merma:'Merma (roturas)',liquidacion:'Liquidación y no vendido',marketing:'Marketing',entrega:'Entrega al cliente',comisionVenta:'Comisión de vendedores',estructura:'Tu sueldo / estructura',web:'Web',prepPedidos:'Preparación de pedidos',seguroDeposito:'Seguro del depósito',cobro:'Costo de cobrar',garantia:'Garantía y devoluciones'};
const fila=(t,v,extra='',cls='')=>`<tr class="${cls}"><td>${t}</td><td class="n"><b class="${v<-0.5&&cls?'neg':''}">${eU(v)}</b></td>${extra}</tr>`;
function ecoTablero(pe,r){
  const p=r.p,A=alertasPedido(r),dV=Math.round(p.meses*30.42),neto=r.items.reduce((a,i)=>a+i.netoT,0);
  const subs={};r.items.forEach(i=>{const s=subs[i.subcat||'Sin subcategoría']||(subs[i.subcat||'Sin subcategoría']={u:0,cbm:0,fob:0,v:0,n:0});s.u+=i.cant;s.cbm+=i.cbmT;s.fob+=i.fobT;s.v+=i.ventaT;s.n+=i.netoT});
  const top=[...r.items].sort((a,b)=>b.netoT-a.netoT).slice(0,5);
  const M=[1,2,3,4,6,8,10,12,18,24].map(m=>({m,x:ecoCalc(pe,{meses:m})}));
  const gs=Object.entries(r.g).filter(([k,v])=>Math.abs(v)>0.5).sort((a,b)=>a[1]-b[1]);
  const sup=PAR_META.flatMap(g=>g[1]).filter(x=>x[2]==='SUPUESTO');
  return `<div class="card pad" style="margin-bottom:12px"><h4>1 · La decisión</h4>
   <div class="kps">${[['Plata a poner (pico de caja)',eU(r.pico),'lo máximo que hay que tener puesto'],['Te queda',eU(r.resultado),'neto de todo, después de Ganancias'],['Retorno',eP(r.retorno),'te queda ÷ pico'],['Rinde por año',`<span class="${r.anualizado>=p.objetivo?'pos':'neg'}">${eP(r.anualizado)}</span>`,`objetivo ${eP(p.objetivo,0)} · ${r.anualizado>=p.objetivo?'lo supera':'no llega'}`],['Ciclo',r.ciclo+r.diasAcred+' días',`${r.diaNac} hasta el galpón + ${dV} vendiendo + ${r.diasAcred} cobrando`],['Después del costo de oportunidad',eU(r.resultado-r.costoOport),`la plata quieta al ${eP(p.costoOportunidad,0)} anual costaría ${eU(r.costoOport)}`]].map(([t,v,s])=>`<div class="card kp"><span>${t}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div></div>
  <div class="card pad" style="margin-bottom:12px"><h4>2 · Qué mirar</h4>${A.length?A.map(a=>`<div style="padding:7px 10px;margin:5px 0;border-left:3px solid ${a.g==='bad'?'#c0392b':'#d68910'};background:${a.g==='bad'?'rgba(192,57,43,.07)':'rgba(214,137,16,.08)'}">${a.g==='bad'?'<b>Grave:</b> ':''}${esc(a.t)}</div>`).join(''):'<p class="hint">Nada para revisar.</p>'}</div>
  <div class="g2d" style="align-items:start"><div class="card pad"><h4>3 · De la venta al bolsillo</h4><div class="wrap"><table class="pl"><tbody>
   ${fila('Venta sin IVA',r.venta,'','top')}${fila('− Costo final de la mercadería',-r.costoFinal)}${fila('= Margen bruto',r.margenBruto,`<td class="n hint">${eP(r.margenPctPrecio)}</td>`,'sub')}
   ${fila('− Ingresos Brutos',-r.iibbVenta)}${fila('− Galpón (toda la rotación)',-r.galpon)}${fila('− Recepción en el fulfillment',-r.recepcion)}${fila('− Gastos operativos y de venta',r.gastos)}
   ${fila('= Base imponible',r.baseImponible,'','sub')}${fila('− Impuesto a las Ganancias',-r.impGanancias)}${fila('= Te queda',r.resultado,'','tot')}</tbody></table></div></div>
   <div class="card pad"><h4>Gastos operativos y de venta</h4><div class="wrap"><table><thead><tr><th></th><th class="n">US$</th><th class="n">% de la venta</th></tr></thead><tbody>${gs.map(([k,v])=>`<tr><td>${GLBL[k]||k}</td><td class="n">${eU(-v)}</td><td class="n">${eP(-v/r.venta)}</td></tr>`).join('')}</tbody></table></div></div></div>
  <div class="card pad" style="margin:12px 0"><h4>4 · En qué se va la plata</h4><div class="wrap"><table><thead><tr><th></th><th class="n">US$</th><th class="n">% del desembolso</th><th class="n">% del costo</th></tr></thead><tbody>
   ${[['FOB (fábrica)',r.fob],['Flete',r.flete],['Seguro',r.seguro],['Despacho, terminal, transporte',r.despachoFijo],['Honorarios del despachante',r.honorarios],['Depósito fiscal',r.fiscal],['Aranceles',r.arancel],['Imprevistos',r.imprevistos]].map(([t,v])=>`<tr><td>${t}</td><td class="n">${eU(v)}</td><td class="n">${eP(v/r.desembolso)}</td><td class="n">${eP(v/r.costoFinal)}</td></tr>`).join('')}
   <tr class="sub"><td><b>= Costo final</b></td><td class="n"><b>${eU(r.costoFinal)}</b></td><td class="n">${eP(r.costoFinal/r.desembolso)}</td><td class="n">100%</td></tr>
   <tr><td>IVA y percepción de IVA <span class="hint">(se recupera)</span></td><td class="n">${eU(r.creditoIva)}</td><td class="n">${eP(r.creditoIva/r.desembolso)}</td><td></td></tr><tr><td>Percepción de Ganancias <span class="hint">(se recupera)</span></td><td class="n">${eU(r.percepGanancias)}</td><td class="n">${eP(r.percepGanancias/r.desembolso)}</td><td></td></tr>
   <tr class="tot"><td><b>= Desembolso</b></td><td class="n"><b>${eU(r.desembolso)}</b></td><td class="n">100%</td><td></td></tr></tbody></table></div></div>
  <div class="g2d" style="align-items:start"><div class="card pad"><h4>5 · Qué se vende</h4><div class="wrap"><table><thead><tr><th>Subcategoría</th><th class="n">Unid.</th><th class="n">m³</th><th class="n">FOB</th><th class="n">Venta</th><th class="n">Neto</th></tr></thead><tbody>${Object.entries(subs).sort((a,b)=>b[1].n-a[1].n).map(([k,s])=>`<tr><td>${esc(k)}</td><td class="n">${s.u}</td><td class="n">${eN(s.cbm,1)}</td><td class="n">${eU(s.fob)}</td><td class="n">${eU(s.v)}</td><td class="n">${eU(s.n)}</td></tr>`).join('')}</tbody></table></div></div>
   <div class="card pad"><h4>Los 5 que más aportan</h4><div class="wrap"><table><tbody>${top.map(i=>`<tr><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.desc)}</div></td><td class="n">${eU(i.netoT)}</td><td class="n">${eP(neto?i.netoT/neto:null,0)}</td></tr>`).join('')}</tbody></table></div><p class="hint">Entre los 5 suman ${eP(neto?top.reduce((a,i)=>a+i.netoT,0)/neto:null,0)} del neto.</p></div></div>
  <div class="g2d" style="align-items:start;margin-top:12px"><div class="card pad"><h4>6 · Cuánto cuesta tardar</h4><div class="wrap"><table><thead><tr><th>Meses para vender</th><th class="n">Pico</th><th class="n">Te queda</th><th class="n">Rinde por año</th></tr></thead><tbody>${M.map(({m,x})=>`<tr${m===p.meses?' style="background:rgba(0,0,0,.06);font-weight:600"':''}><td>${m}${m===p.meses?' ← actual':''}</td><td class="n">${eU(x.pico)}</td><td class="n ${x.resultado<0?'neg':''}">${eU(x.resultado)}</td><td class="n ${x.anualizado>=p.objetivo?'pos':'neg'}">${eP(x.anualizado)}</td></tr>`).join('')}</tbody></table></div></div>
   <div><div class="card pad" style="margin-bottom:12px"><h4>7 · Plata para el próximo pedido</h4><div class="rw"><span>Capital que pusiste (pico)</span><b>${eU(r.pico)}</b></div><div class="rw"><span>+ Lo que te queda</span><b>${eU(r.resultado)}</b></div><div class="rw" style="border-top:1px solid var(--line);padding-top:6px"><span><b>= En la mano al cierre</b></span><b>${eU(r.pico+r.resultado)}</b></div><p class="hint">Al día ${r.diaCobro}, si todo sale según los supuestos.</p></div>
   <div class="card pad"><h4>8 · Lo que no sabe</h4><p class="hint">Estos números son supuestos: no tienen un papel atrás. Cuando haya ventas reales, varios se van a medir solos.</p>${sup.map(x=>`<div class="rw"><span>${x[1]}</span><b>${fmtPar(x[0],p[x[0]])}</b></div>`).join('')}</div></div></div>`;
}
function bindTablero(){}

/* ---- Productos ---- */
function ecoProductos(pe,r){
  const cat=ecoCat();
  return `<div class="bar"><input id="eadd" list="ecatl" placeholder="Buscar en el catálogo por código o nombre y Enter para sumar…" style="flex:1;min-width:240px"><datalist id="ecatl">${cat.map(c=>`<option value="${esc(c.codigo)}">${esc(c.desc||'')} · ${esc(c.subcat||'')}</option>`).join('')}</datalist></div>
  <div class="card wrap"><table class="big"><thead><tr><th></th><th>Producto</th><th class="n">Cant.</th><th class="n">MOQ</th><th class="n">m³ u.</th><th class="n">m³ total</th><th class="n">% cont.</th><th class="n">FOB u.</th><th class="n">FOB total</th><th class="n">Costo u.</th><th class="n">Costo total</th><th></th></tr></thead><tbody>
  ${r.items.map(i=>`<tr><td>${i.foto?`<img src="${esc(src(i.foto))}" alt="">`:''}</td><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.desc)}${i.subcat?' · '+esc(i.subcat):''}</div></td>
   <td class="n"><input class="num" style="width:64px" data-cant="${esc(i.codigo)}" value="${i.cant}" inputmode="numeric"></td><td class="n ${i.bajoMoq?'neg':''}">${i.moq||'—'}</td><td class="n">${eN(i.cbmU,3)}</td><td class="n">${eN(i.cbmT)}</td><td class="n">${eP(r.capacidad?i.cbmT/r.capacidad:null)}</td>
   <td class="n">${eN(i.fobU)}</td><td class="n">${eU(i.fobT)}</td><td class="n">${eN(i.costoU)}</td><td class="n">${eU(i.costoT)}</td><td><button class="btn" data-del="${esc(i.codigo)}" title="Sacar del pedido">×</button></td></tr>`).join('')}</tbody></table></div>
  <div class="kps" style="margin-top:12px">${[['m³ cargados',eN(r.cbm)],['Capacidad contratada',eN(r.capacidad,0)+' m³'],['Ocupación',eP(r.ocupacion)],['Flete',eU(r.flete)],['Flete por m³',eU(r.cbm?r.flete/r.cbm:null)],['Unidades',r.unidades]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>`;
}
function bindProductos(pe){
  const it=c=>ECO.it.find(i=>i.pedido_id===pe.id&&i.codigo===c);
  $('#m').querySelectorAll('[data-cant]').forEach(x=>x.onchange=async()=>{const i=it(x.dataset.cant),v=Math.max(0,Math.round(eNum(x.value)||0));i.cant=v;const {error}=await sb.from('eco_items').update({cant:v}).eq('id',i.id);if(error)toast('No se pudo guardar');drawEcoPedido()});
  $('#m').querySelectorAll('[data-del]').forEach(x=>x.onclick=async()=>{const i=it(x.dataset.del);const {error}=await sb.from('eco_items').delete().eq('id',i.id);if(error)return toast('No se pudo sacar');ECO.it=ECO.it.filter(z=>z!==i);drawEcoPedido()});
  const a=$('#eadd');if(!ECO.it.some(i=>i.pedido_id===pe.id))a.focus();a.onkeydown=async e=>{if(e.key!=='Enter')return;const q=a.value.trim().toUpperCase();const m=master.find(x=>x.codigo===q)||master.find(x=>(x.codigo+' '+(x.descripcion||'')).toUpperCase().includes(q));if(!m)return toast('No está en el catálogo');if(it(m.codigo))return toast('Ya está en el pedido');
    const {data,error}=await sb.from('eco_items').insert({pedido_id:pe.id,codigo:m.codigo,cant:m.moq||1,orden:ECO.it.filter(i=>i.pedido_id===pe.id).length+1}).select().single();if(error)return toast('No se pudo sumar');ECO.it.push(data);toast('Sumado: '+m.codigo);drawEcoPedido()};
}

/* ---- Precios (reemplaza la hoja PRICING) ---- */
function ecoPrecios(pe,r){
  const cc=r.cc,p=r.p,AL={ok:'<span class="pos">bien</span>',warn:'<span style="color:#d68910">flojo</span>',bad:'<span class="neg">pierde</span>'};
  return `<p class="hint" style="max-width:820px">El único precio que se carga es el <b>precio de lista en pesos con IVA</b>. Todo lo demás sale de ahí: el markup es un resultado, no un dato. El markup editable sólo sirve para el precio sugerido.</p>
  <div class="card wrap"><table class="big"><thead><tr><th></th><th>Producto</th><th class="n">Cant.</th><th class="n">Costo u.</th><th class="n">Desembolso u.</th><th class="n">Markup</th><th class="n">Sugerido</th><th class="n">PRECIO LISTA</th><th class="n">Transferencia</th><th class="n">US$ s/IVA</th><th class="n">Markup real</th><th class="n">Margen</th><th class="n">Te queda u.</th><th class="n">Neto u.</th><th class="n">Retorno</th><th>Alerta</th><th class="n">Mín. objetivo</th><th class="n">Mín. sin perder</th><th class="n">Venta total</th><th class="n">Neto total</th></tr></thead><tbody>
  ${r.items.map(i=>`<tr><td>${i.foto?`<img src="${esc(src(i.foto))}" alt="">`:''}</td><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.desc)}</div></td><td class="n">${i.cant}</td><td class="n">${eN(i.costoU)}</td><td class="n">${eN(i.desembolsoU)}</td>
   <td class="n"><input class="num" style="width:54px" data-mk="${esc(i.codigo)}" value="${i.markupManual!=null?Math.round(i.markupManual*100):''}" placeholder="${Math.round(p.markupDefault*100)}">%</td><td class="n">${ars(i.sugeridoARS)}</td>
   <td class="n"><input class="num" style="width:110px;font-weight:600" data-pr="${esc(i.codigo)}" value="${i.precioARS?Math.round(i.precioARS).toLocaleString('es-AR'):''}" placeholder="${Math.round(i.sugeridoARS).toLocaleString('es-AR')}" inputmode="numeric"></td>
   <td class="n">${ars(i.precioContadoARS)}</td><td class="n">${eN(i.precioUsd)}</td><td class="n">${eP(i.markupImp,0)}</td><td class="n">${eP(i.margenPct,0)}</td><td class="n">${eN(i.margenU)}</td><td class="n">${eN(i.netoU)}</td><td class="n">${eP(i.retorno,0)}</td><td>${AL[i.alerta]||''}</td>
   <td class="n">${ars(i.minObjetivoARS)}</td><td class="n">${ars(i.minSinPerderARS)}</td><td class="n">${eU(i.ventaT)}</td><td class="n">${eU(i.netoT)}</td></tr>`).join('')}</tbody></table></div>
  <p class="hint">Mín. objetivo: el precio para llegar al retorno mínimo (${eP(p.retornoMinProd,0)}). Mín. sin perder: abajo de ese precio el producto pierde plata. "Te queda u." es precio sin IVA − costo; "Neto u." además descuenta gastos de venta, galpón y Ganancias.</p>
  <div class="card pad" style="max-width:560px"><h4>Cuánto cuesta cobrar, según cómo paga el cliente</h4>
   <div class="rw"><span>Transferencia (incluye el descuento de ${eP(p.descTransf,0)})</span><b>${eP(cc.transf,2)}</b></div><div class="rw"><span>Tarjeta en 1 pago</span><b>${eP(cc.unPago,2)}</b></div><div class="rw"><span>3 cuotas sin interés</span><b>${eP(cc.cuotas,2)}</b></div>
   <div class="rw"><span class="hint">Mezcla: ${eP(p.mixTransf,0)} transferencia · ${eP(p.mixUnPago,0)} 1 pago · ${eP(cc.mixCuotas,0)} cuotas</span><span></span></div><div class="rw" style="border-top:1px solid var(--line);padding-top:6px"><span><b>Costo de cobrar promedio</b> (sobre la venta sin IVA)</span><b>${eP(cc.total,2)}</b></div></div>`;
}
function bindPrecios(pe){
  const it=c=>ECO.it.find(i=>i.pedido_id===pe.id&&i.codigo===c);
  $('#m').querySelectorAll('[data-pr]').forEach(x=>{x.oninput=()=>{const d=x.value.replace(/\D/g,'');x.value=d?(+d).toLocaleString('es-AR'):''};x.onchange=async()=>{const i=it(x.dataset.pr),d=x.value.replace(/\D/g,''),v=d?+d:null;i.precio_ars=v;const {error}=await sb.from('eco_items').update({precio_ars:v}).eq('id',i.id);toast(error?'No se pudo guardar':'Precio guardado');drawEcoPedido()}});
  $('#m').querySelectorAll('[data-mk]').forEach(x=>x.onchange=async()=>{const i=it(x.dataset.mk),n=eNum(x.value),v=n==null?null:n/100;i.markup_manual=v;const {error}=await sb.from('eco_items').update({markup_manual:v}).eq('id',i.id);if(error)toast('No se pudo guardar');drawEcoPedido()});
}

/* ---- Costos: por producto y análisis de IVA ---- */
function ecoCostosV(pe,r){
  const sc=i=>r.cbm?i.cbmT/r.cbm:0,sf=i=>r.fob?i.fobT/r.fob:0,u=(i,v)=>i.cant?v/i.cant:0;
  return `<div class="card wrap"><table><thead><tr><th>Producto</th><th class="n">FOB u.</th><th class="n">Flete u.</th><th class="n">Seguro u.</th><th class="n">Despacho u.</th><th class="n">Honorarios u.</th><th class="n">Depósito u.</th><th class="n">Arancel u.</th><th class="n">Tasa</th><th class="n">Imprevistos u.</th><th class="n">Costo u.</th></tr></thead><tbody>
  ${r.items.map(i=>{const imp=i.costoT-i.costoT/(1+r.p.imprevistos);return `<tr><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.subcat)}</div></td><td class="n">${eN(i.fobU)}</td><td class="n">${eN(u(i,r.flete*sc(i)))}</td><td class="n">${eN(u(i,r.seguro*sf(i)))}</td><td class="n">${eN(u(i,r.despachoFijo*sc(i)))}</td><td class="n">${eN(u(i,r.honorarios*sf(i)))}</td><td class="n">${eN(u(i,r.fiscal*sc(i)))}</td><td class="n">${eN(u(i,i.arancelT))}</td><td class="n">${eP(i.arancelTasa)}</td><td class="n">${eN(u(i,imp))}</td><td class="n"><b>${eN(i.costoU)}</b></td></tr>`}).join('')}</tbody></table></div>
  <p class="hint">Flete, despacho y depósito se reparten por m³; seguro y honorarios por FOB; el arancel va sobre el CIF de cada producto.</p>
  <div class="card pad" style="max-width:620px;margin-top:12px"><h4>IVA</h4>
   <div class="rw"><span>IVA + percepción de IVA que pagás en la aduana (crédito)</span><b>${eU(r.creditoIva)}</b></div><div class="rw"><span>IVA de las ventas (débito)</span><b>${eU(r.debitoIva)}</b></div>
   <div class="rw" style="border-top:1px solid var(--line);padding-top:6px"><span><b>${r.saldoIva>0?'Crédito que te sobra':'IVA a pagar'}</b></span><b class="${r.saldoIva>0?'neg':''}">${eU(Math.abs(r.saldoIva))}</b></div>
   <p class="hint">Para consumir todo el crédito de IVA hay que vender con un markup de al menos ${eP(r.markupMinIva,0)} sobre el costo. Hoy el markup efectivo es ${eP(r.markupEfectivo,0)}.</p></div>`;
}

/* ---- Caja ---- */
function ecoCaja(pe,r){
  const min=Math.min(...r.flujo.map(f=>f.saldo));
  return `<p class="hint" style="max-width:760px">Día por día, en qué momento sale y entra la plata. El saldo más negativo (en rojo) es el pico: la plata máxima que tenés que tener puesta. Los gastos de venta van después del cobro porque se pagan a medida que vendés.</p>
  <div class="card wrap"><table><thead><tr><th class="n">Día</th><th>Concepto</th><th class="n">Monto</th><th class="n">Saldo</th></tr></thead><tbody>
  ${r.flujo.map(f=>`<tr${f.saldo===min?' style="background:rgba(192,57,43,.1)"':''}><td class="n">${f.dia}</td><td>${esc(f.c)}${f.saldo===min?' <b class="neg">← pico</b>':''}</td><td class="n ${f.m<0?'neg':'pos'}">${eU(f.m)}</td><td class="n"><b class="${f.saldo<0?'neg':''}">${eU(f.saldo)}</b></td></tr>`).join('')}
  <tr class="tot"><td></td><td>Impuesto a las Ganancias</td><td class="n neg">${eU(-r.impGanancias)}</td><td class="n"><b>${eU(r.resultado)}</b></td></tr></tbody></table></div>`;
}

/* ---- Comparar ---- */
function drawEcoComparar(){
  const L=ECO.ped.filter(p=>ECO.cmp.includes(p.id)).map(pe=>({pe,r:ecoCalc(pe)}));
  const F=[['Unidades',r=>r.unidades,0,x=>x],['m³',r=>r.cbm,0,x=>eN(x)],['Ocupación',r=>r.ocupacion,1,x=>eP(x)],['Costo final',r=>r.costoFinal,0,eU],['Desembolso',r=>r.desembolso,0,eU],['Venta sin IVA',r=>r.venta,1,eU],['Plata a poner (pico)',r=>r.pico,-1,eU],['Te queda',r=>r.resultado,1,eU],['Retorno',r=>r.retorno,1,x=>eP(x)],['Rinde por año',r=>r.anualizado,1,x=>eP(x)],['Ciclo (días)',r=>r.ciclo+r.diasAcred,-1,x=>x],['Alertas graves',r=>alertasPedido(r).filter(a=>a.g==='bad').length,-1,x=>x]];
  $('#m').innerHTML=`<div class="bar"><button class="btn" id="eback">← Contenedores</button><b style="font:500 20px Outfit,sans-serif">Comparar</b><span class="sp"></span>${ECO.ped.map(p=>`<label style="margin:0 6px 0 0;white-space:nowrap"><input type="checkbox" data-cm="${p.id}" ${ECO.cmp.includes(p.id)?'checked':''}> ${esc(p.nombre)}</label>`).join('')}</div>
  <div class="card wrap"><table><thead><tr><th></th>${L.map(x=>`<th class="n">${esc(x.pe.nombre)}</th>`).join('')}</tr></thead><tbody>
  ${F.map(([t,f,best,fm])=>{const v=L.map(x=>f(x.r)),b=best?(best>0?Math.max(...v):Math.min(...v)):null;return `<tr><td>${t}</td>${v.map(x=>`<td class="n">${best&&L.length>1&&x===b?`<b class="pos">${fm(x)} ★</b>`:fm(x)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div><p class="hint">★ el mejor de cada fila.</p>`;
  $('#eback').onclick=()=>{ECO.vista='tablero';drawEco()};
  $('#m').querySelectorAll('[data-cm]').forEach(c=>c.onchange=()=>{const id=+c.dataset.cm;ECO.cmp=c.checked?[...ECO.cmp,id]:ECO.cmp.filter(x=>x!==id);drawEcoComparar()});
}

/* ---- Parámetros ---- */
async function drawEcoPar(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';await ecoLoad();const p=ECO.par;
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Parámetros de importación</b></div>
  <p class="hint" style="max-width:780px">Valen para todos los contenedores. Cada uno dice quién decide el número: ${tag('INPUT')} lo decidís vos · ${tag('DATO')} lo cobra un tercero y hay un papel atrás · ${tag('SUPUESTO')} inventado, hay que validarlo. Los porcentajes se cargan en decimales (0,035 = 3,5%).</p>
  ${PAR_META.map(([g,L])=>`<div class="card pad" style="margin-bottom:12px"><h4>${g}</h4>${L.map(([k,l,t,f])=>`<div class="rw" style="gap:10px"><span>${tag(t)} ${l}</span><span style="white-space:nowrap"><input class="num" style="width:100px" data-pk="${k}" value="${p[k]!=null?String(p[k]).replace('.',','):''}" inputmode="decimal"> <small class="hint" style="display:inline-block;min-width:70px">${f==='pct'?eP(p[k],2):''}</small></span></div>`).join('')}</div>`).join('')}
  <div class="card pad" style="margin-bottom:12px"><h4>Aranceles por subcategoría <small class="hint">— sobre el CIF de cada producto. Hoy todos 23,5% (DIE 18% + tasa estadística 3% + IIBB 2,5%) hasta que el despachante confirme los NCM.</small></h4>
   ${SUBCATS.map(s=>`<div class="rw"><span>${tag('SUPUESTO')} ${s}</span><span><input class="num" style="width:100px" data-ark="${esc(s)}" value="${String(ECO.ar[s]??ARANCEL_DEF).replace('.',',')}" inputmode="decimal"> <small class="hint">${eP(ECO.ar[s]??ARANCEL_DEF)}</small></span></div>`).join('')}</div>`;
  const save=async()=>{const {error}=await sb.from('eco_param').upsert({id:1,par:ECO.par,aranceles:ECO.ar,updated_at:new Date().toISOString()});toast(error?'No se pudo guardar':'Guardado')};
  $('#m').querySelectorAll('[data-pk]').forEach(i=>i.onchange=async()=>{const v=eNum(i.value);if(v==null||!isFinite(v))return toast('Número inválido');const k=i.dataset.pk;ECO.par[k]=v;i.nextElementSibling.textContent=PAR_LBL[k][3]==='pct'?eP(v,2):'';
    if(k==='tc'){ST.tc=v;await sb.from('settings').upsert({key:'tc',value:v,nota:'Tipo de cambio ARS por USD'})}await save()});
  $('#m').querySelectorAll('[data-ark]').forEach(i=>i.onchange=async()=>{const v=eNum(i.value);if(v==null||!isFinite(v))return toast('Número inválido');ECO.ar[i.dataset.ark]=v;i.nextElementSibling.textContent=eP(v);await save()});
}
