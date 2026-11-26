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
 ['Contenedor y flete',[['flete20','Flete contenedor 20’ (USD)','DATO','usd'],['cbm20','Capacidad 20’ (m³)','DATO','num'],['flete40','Flete contenedor 40’ (USD)','DATO','usd'],['cbm40','Capacidad 40’ (m³)','DATO','num'],['fleteHQ','Flete contenedor 40’ HQ (USD)','DATO','usd'],['cbmHQ','Capacidad real 40’ HQ (m³), la que confirma el proveedor','DATO','num']]],
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
  if(!master.length||master[0].moq===undefined)await loadMaster();
  ECO.par=Object.assign({},PAR_DEF,{tc:ST.tc||PAR_DEF.tc},(pr&&pr.par)||{});ECO.par.tc=ST.tc||ECO.par.tc;ECO.ar=(pr&&pr.aranceles)||{};ECO.ped=pe||[];ECO.it=it||[];
  const [{data:rc},{data:mv},{data:ig}]=await Promise.all([sb.from('eco_recepcion').select('*'),sb.from('eco_movimientos').select('*').order('fecha'),sb.from('eco_ingreso').select('*')]);ECO.rec=rc||[];ECO.mov=mv||[];ECO.ing=ig||[];
}
const ecoCat=()=>master.map(x=>({codigo:x.codigo,desc:x.descripcion,subcat:x.subcategoria,prov:x.proveedor,fob:x.fob_usd,cbm:x.cbm,moq:x.moq,foto:x.foto_url,medidas:x.medidas,material:x.material}));
const ecoPedido=pe=>({par:pe.par||{},items:ECO.it.filter(i=>i.pedido_id===pe.id).map(i=>({codigo:i.codigo,cant:i.cant,precioARS:i.precio_ars,markupManual:i.markup_manual}))});
/* lo que trae la orden de compra manda: FOB y m³ por pieza propios de este contenedor (el Maestro no se toca) */
const ecoCatPe=pe=>{const O={};ECO.it.forEach(i=>{if(i.pedido_id===pe.id)O[i.codigo]=i});return ecoCat().map(c=>{const o=O[c.codigo];return o&&(o.fob_oc!=null||o.cbm_oc!=null)?{...c,fob:o.fob_oc??c.fob,cbm:o.cbm_oc??c.cbm,fobM:c.fob,cbmM:c.cbm,oc:1}:c})};
/* si el pedido ya pasó a Recibido, se calcula SIEMPRE con la proyección congelada (datos, parámetros y aranceles de ese día) */
const ecoCalc=(pe,extra)=>{const S=pe.proyeccion;if(S&&S.input)return calcular({items:S.input.items,par:Object.assign({},S.input.par||{},extra||{})},S.cat,S.par,S.ar);return calcular(Object.assign(ecoPedido(pe),extra?{par:Object.assign({},pe.par||{},extra)}:{}),ecoCatPe(pe),ECO.par,ECO.ar)};
function ecoSnapshot(pe){const inp=ecoPedido(pe),cods=new Set(inp.items.map(i=>i.codigo)),cat=ecoCatPe(pe).filter(c=>cods.has(c.codigo)),r=calcular(inp,cat,ECO.par,ECO.ar);
  return {fecha:new Date().toISOString(),input:inp,cat,par:{...ECO.par},ar:{...ECO.ar},resultado:{pico:r.pico,teQueda:r.resultado,retorno:r.retorno,rindePorAno:r.anualizado,ciclo:r.ciclo+r.diasAcred,ventaNeta:r.venta,costoFinal:r.costoFinal,costoCobro:r.venta*r.cc.total,unidades:r.unidades},porProducto:r.items.map(i=>({sku:i.codigo,unidades:i.cant,precioUsd:i.precioUsd,margenU:i.margenU,netoU:i.netoU,retorno:i.retorno}))}}
/* costo puesto en el galpón por unidad (USD), del pedido más reciente que trae ese producto: lo usa Rentabilidad */
function ecoCostos(){const out={};const ord=[...ECO.ped].sort((a,b)=>(a.estado==='borrador')-(b.estado==='borrador')||b.created_at.localeCompare(a.created_at));
  ord.slice().reverse().forEach(pe=>{const r=ecoCalc(pe);r.items.forEach(i=>{if(i.cant>0&&i.costoU>0)out[i.codigo]=i.costoU})});return out}

async function drawEco(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';
  await ecoLoad();if(!prods.length)await loadProds();
  if(ECO.sel){try{ECO.V=await ventasRent()}catch(e){ECO.V=null}try{await loadSkus()}catch(e){}}
  if(ECO.sel&&!ECO.ped.find(p=>p.id===ECO.sel))ECO.sel=null;
  if(ECO.sel)return drawEcoPedido();
  if(ECO.vista==='comparar')return drawEcoComparar();
  const R=ECO.ped.map(pe=>({pe,r:ecoCalc(pe)}));
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Contenedores</b><span class="sp"></span>${R.length>1?'<button class="btn" id="ecmp">Comparar</button>':''}<button class="btn dk" id="enew">+ Nuevo pedido</button></div>
  <p class="hint" style="max-width:760px;margin:0 0 14px">Cada tarjeta es un contenedor. Cargás productos, cantidades y precios, y te dice cuánta plata hay que poner (pico de caja), cuánto queda y cuánto rinde por año. Los números en US$.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
  ${R.map(({pe,r})=>`<div class="card pad" data-ped="${pe.id}" style="cursor:pointer"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font:500 18px Outfit,sans-serif">${esc(pe.nombre)}</b><span class="hint">${ESTP[pe.estado]||pe.estado}</span></div>
   <div class="hint">${esc(pe.proveedor||'')} · ${r.unidades} unidades · ${eN(r.cbm)} m³</div>
   <div class="fb" style="margin:10px 0 4px"><i style="width:${Math.min(100,r.ocupacion*100)}%${r.sobra>0?';background:#c0392b':''}"></i></div><div class="hint${r.sobra>0?' neg':''}">${r.sobra>0?`<b>${eP(r.ocupacion,0)} · NO ENTRA: sobran ${eN(r.sobra)} m³</b>`:eP(r.ocupacion,0)} del contenedor (${[r.cont.nHQ&&r.cont.nHQ+'× 40HQ',r.cont.n40&&r.cont.n40+'× 40’',r.cont.n20&&r.cont.n20+'× 20’'].filter(Boolean).join(' + ')||'vacío'})</div>
   <div class="rw" style="margin-top:8px"><span>Plata a poner (pico)</span><b>${eU(r.pico)}</b></div><div class="rw"><span>Te queda</span><b class="${r.resultado<0?'neg':''}">${eU(r.resultado)}</b></div><div class="rw"><span>Rinde por año</span><b class="${r.anualizado>=r.p.objetivo?'pos':'neg'}">${eP(r.anualizado)}</b></div></div>`).join('')||'<p class="hint">Todavía no hay pedidos.</p>'}</div>`;
  $('#m').querySelectorAll('[data-ped]').forEach(c=>c.onclick=()=>{ECO.sel=+c.dataset.ped;ECO.vista='tablero';drawEco()});
  $('#enew').onclick=async()=>{const {data,error}=await sb.from('eco_pedidos').insert({nombre:'CONCEPT '+String(ECO.ped.length+1).padStart(2,'0')}).select().single();if(error)return toast('No se pudo crear');ECO.sel=data.id;ECO.vista='productos';drawEco()};
  const c=$('#ecmp');if(c)c.onclick=()=>{ECO.vista='comparar';ECO.cmp=ECO.ped.map(p=>p.id);drawEco()};
}

function drawEcoPedido(){
  const pe=ECO.ped.find(p=>p.id===ECO.sel),r=ecoCalc(pe),V=ECO.vista;
  const T=[['tablero','Tablero'],['oc','Orden de compra y proformas'],['productos','Productos'],['precios','Precios'],['costos','Costos'],['caja','Caja'],['ingreso','Ingreso y packing list'],['real','Real']];
  const body={ingreso:ecoIngresoV,real:ecoRealV,tablero:ecoTablero,productos:ecoProductos,precios:ecoPrecios,costos:ecoCostosV,caja:ecoCaja,oc:ecoOC}[V]||ecoTablero;
  $('#m').innerHTML=`<div class="bar"><button class="btn" id="eback">← Contenedores</button><input id="enom" value="${esc(pe.nombre)}" style="font:500 20px Outfit,sans-serif;border:0;background:none;width:200px"><input id="eprov" value="${esc(pe.proveedor||'')}" placeholder="proveedor" style="width:150px">
   <select id="eest">${Object.entries(ESTP).map(([k,l])=>`<option value="${k}" ${pe.estado===k?'selected':''}>${l}</option>`).join('')}</select><span class="sp"></span><button class="btn" id="edup">Duplicar</button><button class="btn" id="edel">Borrar</button></div>
  <div class="bar" style="gap:6px">${T.map(([k,l])=>`<button class="btn ${V===k?'dk':''}" data-ev="${k}">${l}</button>`).join('')}</div>
  <div class="card pad eco-que"><b>${(T.find(t=>t[0]===(body===ecoTablero?'tablero':V))||T[0])[1]}:</b> ${ECO_QUE[body===ecoTablero?'tablero':V]||''}</div>
  <div id="ebody">${body(pe,r)}</div>`;
  const upd=async(f,v)=>{pe[f]=v;const {error}=await sb.from('eco_pedidos').update({[f]:v}).eq('id',pe.id);toast(error?'No se pudo guardar':'Guardado')};
  $('#eback').onclick=()=>{ECO.sel=null;drawEco()};
  $('#enom').onchange=e=>upd('nombre',e.target.value.trim()||pe.nombre);$('#eprov').onchange=e=>upd('proveedor',e.target.value.trim());$('#eest').onchange=async e=>{const v=e.target.value;if(['recibido','cerrado'].includes(v)&&!pe.proyeccion){if(!confirm('Al pasar a Recibido se congela la proyección: los supuestos de este pedido quedan fijos para comparar contra lo real. No se puede deshacer. ¿Seguimos?')){e.target.value=pe.estado;return}const s=ecoSnapshot(pe);const {error}=await sb.from('eco_pedidos').update({estado:v,proyeccion:s}).eq('id',pe.id);if(error)return toast('No se pudo guardar');pe.estado=v;pe.proyeccion=s;const ni=await ingresarAlStock(pe);toast(ni?'Proyección congelada y '+ni+' tipos de caja entraron al stock':'Proyección congelada');drawEcoPedido();return}if(v==='confirmado'&&typeof v3Orden==='function'){const L=v3Orden(pe,ecoCalc(pe));if(L.length){if(!confirm('La proforma manda. En '+L.length+' producto(s) el Maestro tiene otro packing o m³ que la proforma:\n\n'+L.map(x=>'· '+x.m.codigo+(x.dev!=null?' (m³ '+(x.dev>0?'+':'')+Math.round(x.dev*100)+'%)':' (packing distinto)')).join('\n')+'\n\nActualizo el Maestro con lo de la proforma (queda en el historial) y confirmo el contenedor. ¿Seguimos?')){e.target.value=pe.estado;return}
   for(const x of L){const it=ECO.it.find(i=>i.pedido_id===pe.id&&i.codigo===x.m.codigo)||{},cbm=it.cbm_oc?+it.cbm_oc:(x.cbmPieza?Math.round(x.cbmPieza*1000)/1000:null);const {error}=await sb.rpc('master_packing_desde_orden',{p_codigo:x.m.codigo,p_origen:'Proforma '+pe.nombre,p_piezas:x.p,p_cajas:x.c,p_pack:x.pack||x.m.cajas_pack||null,p_cbm:cbm});if(!error)Object.assign(x.m,{piezas_por_caja:x.p,cajas_por_unidad:x.c},cbm!=null?{cbm}:{})}}}upd('estado',v)};
  $('#m').querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{ECO.vista=b.dataset.ev;drawEcoPedido()});
  $('#edel').onclick=async()=>{if(!confirm(`¿Borrar ${pe.nombre} y todos sus productos? No se puede deshacer.`))return;const {error}=await sb.from('eco_pedidos').delete().eq('id',pe.id);if(error)return toast('No se pudo borrar');ECO.sel=null;drawEco()};
  $('#edup').onclick=async()=>{const {data,error}=await sb.from('eco_pedidos').insert({nombre:pe.nombre+' (copia)',proveedor:pe.proveedor,notas:pe.notas,par:pe.par}).select().single();if(error)return toast('No se pudo duplicar');
    const its=ECO.it.filter(i=>i.pedido_id===pe.id).map(i=>({pedido_id:data.id,codigo:i.codigo,cant:i.cant,precio_ars:i.precio_ars,markup_manual:i.markup_manual,orden:i.orden}));if(its.length)await sb.from('eco_items').insert(its);ECO.sel=data.id;toast('Duplicado');drawEco()};
  ({productos:bindProductos,precios:bindPrecios,tablero:bindTablero,caja:bindCaja,ingreso:bindIngreso,oc:bindOC})[V]?.(pe,r);
}

/* ---- Tablero: 8 bloques ---- */
const GLBL={merma:'Merma (roturas)',liquidacion:'Liquidación y no vendido',marketing:'Marketing',entrega:'Entrega al cliente',comisionVenta:'Comisión de vendedores',estructura:'Tu sueldo / estructura',web:'Web',prepPedidos:'Preparación de pedidos',seguroDeposito:'Seguro del depósito',cobro:'Costo de cobrar',garantia:'Garantía y devoluciones'};
const fila=(t,v,extra='',cls='')=>`<tr class="${cls}"><td>${t}</td><td class="n"><b class="${v<-0.5&&cls?'neg':''}">${eU(v)}</b></td>${extra}</tr>`;
function ecoTablero(pe,r){
  const p=r.p,A=alertasPedido(r).concat(ECO.V?ecoAlertasReales(pe):[]),dV=Math.round(p.meses*30.42),neto=r.items.reduce((a,i)=>a+i.netoT,0);
  const subs={};r.items.forEach(i=>{const s=subs[i.subcat||'Sin subcategoría']||(subs[i.subcat||'Sin subcategoría']={u:0,cbm:0,fob:0,v:0,n:0});s.u+=i.cant;s.cbm+=i.cbmT;s.fob+=i.fobT;s.v+=i.ventaT;s.n+=i.netoT});
  const top=[...r.items].sort((a,b)=>b.netoT-a.netoT).slice(0,5);
  const M=[1,2,3,4,6,8,10,12,18,24].map(m=>({m,x:ecoCalc(pe,{meses:m})}));
  const gs=Object.entries(r.g).filter(([k,v])=>Math.abs(v)>0.5).sort((a,b)=>a[1]-b[1]);
  const sup=PAR_META.flatMap(g=>g[1]).filter(x=>x[2]==='SUPUESTO');
  return `<div class="card pad" style="margin-bottom:12px"><h4>1 · La decisión</h4>
   <div class="kps">${[['Plata a poner (pico de caja)',eU(r.pico),'lo máximo que hay que tener puesto'],['Te queda',eU(r.resultado),'neto de todo, después de Ganancias'],['Retorno',eP(r.retorno),'te queda ÷ pico'],['Rinde por año',`<span class="${r.anualizado>=p.objetivo?'pos':'neg'}">${eP(r.anualizado)}</span>`,`objetivo ${eP(p.objetivo,0)} · ${r.anualizado>=p.objetivo?'lo supera':'no llega'}`],['Ciclo',r.ciclo+r.diasAcred+' días',`${r.diaNac} hasta el galpón + ${dV} vendiendo + ${r.diasAcred} cobrando`],['Después del costo de oportunidad',eU(r.resultado-r.costoOport),`la plata quieta al ${eP(p.costoOportunidad,0)} anual costaría ${eU(r.costoOport)}`]].map(([t,v,s])=>`<div class="card kp"><span>${t}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div></div>
  <div class="card pad" style="margin-bottom:12px"><h4>2 · Qué mirar</h4>${A.length?A.map(a=>`<div style="padding:7px 10px;margin:5px 0;border-left:3px solid ${a.g==='bad'?'#c0392b':a.g==='good'?'#1baf7a':'#d68910'};background:${a.g==='bad'?'rgba(192,57,43,.07)':a.g==='good'?'rgba(27,175,122,.08)':'rgba(214,137,16,.08)'}">${a.g==='bad'?'<b>Grave:</b> ':a.g==='good'?'<b>Bien:</b> ':''}${esc(a.t)}</div>`).join(''):'<p class="hint">Nada para revisar.</p>'}</div>
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
  const cat=ecoCat(),it0=c=>ECO.it.find(x=>x.pedido_id===pe.id&&x.codigo===c);const REC=['recibido','cerrado'].includes(pe.estado);
  const rk=i=>i.margenT>0?i.cbmT/i.margenT:1e9+i.cbmT;const L=ECO.ordP==='m3mg'?[...r.items].sort((a,b)=>rk(b)-rk(a)):r.items;let ac=0;L.forEach(i=>{ac+=i.cbmT;i._acu=ac});const pp=pe.par||{};
  return `<div class="card pad" style="margin-bottom:12px"><div class="bar" style="margin:0;gap:14px;flex-wrap:wrap"><label style="margin:0">Contenedores 40HQ contratados <input class="num" id="pchq" style="width:50px" value="${pp.contHQ??''}" placeholder="auto" inputmode="numeric"></label><span class="hint" style="flex:1;min-width:220px">Contratados: fija la capacidad (${eN(r.p.cbmHQ,0)} m³ por 40HQ) y avisa si sobra. Vacío = el sistema elige los contenedores.</span></div>
  <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)"><b>Costos extra del pedido</b> <span class="hint">(no están en el precio de cada producto; se reparten entre todos para ver el costo real)</span>
   <div class="bar" style="margin:8px 0 0;gap:14px;flex-wrap:wrap">
    <label style="margin:0">Flete interno hasta el puerto US$ <input class="num" data-px="fleteInterno" style="width:80px" value="${pp.fleteInterno??''}" placeholder="0" inputmode="decimal"></label>
    <label style="margin:0">Consolidación US$ <input class="num" data-px="consolidacion" style="width:80px" value="${pp.consolidacion??''}" placeholder="0" inputmode="decimal"></label>
    <label style="margin:0">Otros en origen US$ <input class="num" id="porg" style="width:80px" value="${pp.origenUSD??''}" placeholder="0" inputmode="decimal"></label>
    <label style="margin:0">Comisión del agente de compra % <input class="num" data-px="comisionCompra" data-pct="1" style="width:60px" value="${pp.comisionCompra!=null?+(pp.comisionCompra*100).toFixed(2):''}" placeholder="0" inputmode="decimal"></label></div>
   <p class="hint" style="margin:6px 0 0">Flete interno, consolidación y otros: se suman al flete y se reparten por m³. Comisión: es un % del FOB y se reparte por valor; en Caja se paga junto con el saldo.${pp.comisionCompra?` Hoy: ${eU(r.fob*pp.comisionCompra)}.`:''}</p></div>${r.sobra>0?`<p class="neg" style="margin:8px 0 0"><b>No entra: sobran ${eN(r.sobra)} m³.</b> Ordená por rendimiento y sacá desde arriba hasta que el acumulado quede abajo de ${eN(r.capacidad,0)}.</p>`:''}</div>
  <div class="bar"><button class="btn ${ECO.ordP!=='m3mg'?'dk':''}" data-op="pedido">Orden del pedido</button><button class="btn ${ECO.ordP==='m3mg'?'dk':''}" data-op="m3mg">Lo que menos rinde por m³ primero</button></div>
  <div class="bar"><input id="eadd" list="ecatl" placeholder="Buscar en el catálogo por código o nombre y Enter para sumar…" style="flex:1;min-width:240px"><datalist id="ecatl">${cat.filter(c=>!(byCod(c.codigo)||{}).archivado).map(c=>`<option value="${esc(c.codigo)}">${esc(c.desc||'')} · ${esc(c.subcat||'')}</option>`).join('')}</datalist></div>
  <div class="card wrap"><table class="big"><thead><tr><th></th><th>Producto</th><th class="n">Cant.</th><th class="n">MOQ</th>${REC?'<th class="n">Recibidas</th><th class="n">Rotas</th>':''}<th class="n">m³ u.</th><th class="n">m³ total</th><th class="n">% cont.</th><th class="n">m³ acumulado</th><th class="n" title="Cuántos m³ ocupa por cada US$ 1.000 de margen. Más alto = rinde menos por metro: es lo primero que conviene sacar">m³ por US$ 1.000 de margen</th><th class="n">FOB u.</th><th class="n">FOB total</th><th class="n">Costo u.</th><th class="n">Costo total</th><th></th></tr></thead><tbody>
  ${L.map(i=>`<tr><td>${i.foto?`<img src="${esc(src(i.foto))}" alt="">`:''}</td><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.desc)}${i.subcat?' · '+esc(i.subcat):''}</div></td>
   <td class="n"><input class="num" style="width:64px" data-cant="${esc(i.codigo)}" value="${i.cant}" inputmode="numeric"></td><td class="n ${i.bajoMoq?'neg':''}">${i.moq||'—'}</td>${REC?(()=>{const x=ECO.rec.find(z=>z.pedido_id===pe.id&&z.codigo===i.codigo)||{};return `<td class="n"><input class="num" style="width:56px" data-rcv="${esc(i.codigo)}" value="${x.recibidas??''}" placeholder="${i.cant}" inputmode="numeric"></td><td class="n"><input class="num" style="width:48px" data-rot="${esc(i.codigo)}" value="${x.rotas??''}" placeholder="0" inputmode="numeric"></td>`})():''}<td class="n">${(()=>{const o=it0(i.codigo),m=byCod(i.codigo)||{};return REC?eN(i.cbmU,3):`<input class="num n${o&&o.cbm_oc!=null?' ocv':''}" style="width:68px" data-ocbm="${esc(i.codigo)}" value="${o&&o.cbm_oc!=null?o.cbm_oc:''}" placeholder="${m.cbm??''}" inputmode="decimal" title="m³ por pieza. Vacío = el del Maestro (${m.cbm??'—'})">`})()}</td>
<td class="n">${eN(i.cbmT)}</td><td class="n">${eP(r.capacidad?i.cbmT/r.capacidad:null)}</td><td class="n ${r.capacidad&&i._acu>r.capacidad?'neg':''}">${eN(i._acu)}</td><td class="n">${i.margenT>0?eN(i.cbmT/i.margenT*1000,2):'<span class="neg">sin margen</span>'}</td>
   <td class="n">${(()=>{const o=it0(i.codigo),m=byCod(i.codigo)||{};return REC?eN(i.fobU):`<input class="num n${o&&o.fob_oc!=null?' ocv':''}" style="width:68px" data-ofob="${esc(i.codigo)}" value="${o&&o.fob_oc!=null?o.fob_oc:''}" placeholder="${m.fob_usd??''}" inputmode="decimal" title="FOB US$ por pieza. Vacío = el del Maestro (${m.fob_usd??'—'})">`})()}</td><td class="n">${eU(i.fobT)}</td>
<td class="n">${eN(i.costoU)}</td><td class="n">${eU(i.costoT)}</td><td><button class="btn" data-del="${esc(i.codigo)}" title="Sacar del pedido">×</button></td></tr>`).join('')}</tbody></table></div>
  <div class="kps" style="margin-top:12px">${[['m³ cargados',eN(r.cbm)],['Capacidad contratada',eN(r.capacidad,0)+' m³'],['Ocupación',eP(r.ocupacion)],['Flete',eU(r.flete)],['Flete por m³',eU(r.cbm?r.flete/r.cbm:null)],['Unidades',r.unidades]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>`;
}
function bindProductos(pe){
  $('#m').querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{ECO.ordP=b.dataset.op;drawEcoPedido()});
  const sp=async(k,v)=>{pe.par=Object.assign({},pe.par||{},{[k]:v});if(v==null)delete pe.par[k];const {error}=await sb.from('eco_pedidos').update({par:pe.par}).eq('id',pe.id);toast(error?'No se pudo guardar':'Guardado');drawEcoPedido()};
  $('#pchq').onchange=e=>{const v=Math.round(eNum(e.target.value)||0);sp('contHQ',v>0?v:null)};$('#porg').onchange=e=>{const v=eNum(e.target.value);sp('origenUSD',v>0?v:null)};$('#m').querySelectorAll('[data-px]').forEach(i=>i.onchange=()=>{let v=eNum(i.value);if(v!=null&&i.dataset.pct)v=v/100;sp(i.dataset.px,v>0?v:null)});
  const rcv=async(c,k,v)=>{const x=ECO.rec.find(z=>z.pedido_id===pe.id&&z.codigo===c);const row={pedido_id:pe.id,codigo:c,recibidas:x?x.recibidas:0,rotas:x?x.rotas:0,fecha:x?x.fecha:new Date().toISOString().slice(0,10),[k]:v};const {data,error}=await sb.from('eco_recepcion').upsert(row,{onConflict:'pedido_id,codigo'}).select().single();if(error)return toast('No se pudo guardar');ECO.rec=ECO.rec.filter(z=>z!==x).concat(data);toast('Guardado')};
  $('#m').querySelectorAll('[data-rcv]').forEach(x=>x.onchange=()=>rcv(x.dataset.rcv,'recibidas',Math.max(0,Math.round(eNum(x.value)||0))));
  $('#m').querySelectorAll('[data-rot]').forEach(x=>x.onchange=()=>rcv(x.dataset.rot,'rotas',Math.max(0,Math.round(eNum(x.value)||0))));
  const it=c=>ECO.it.find(i=>i.pedido_id===pe.id&&i.codigo===c);
  $('#m').querySelectorAll('[data-cant]').forEach(x=>x.onchange=async()=>{const i=it(x.dataset.cant),v=Math.max(0,Math.round(eNum(x.value)||0));i.cant=v;const {error}=await sb.from('eco_items').update({cant:v}).eq('id',i.id);if(error)toast('No se pudo guardar');drawEcoPedido()});
  /* FOB y m³ propios del contenedor (vacío = vuelve al Maestro) */
  const ocSet=async(c,f,raw)=>{const i=it(c),v=eNum(raw);const val=v!=null&&v>0?v:null;i[f]=val;const {error}=await sb.from('eco_items').update({[f]:val}).eq('id',i.id);toast(error?'No se pudo guardar: '+error.message:val==null?'Vuelve al valor del Maestro':'Guardado para este contenedor');drawEcoPedido()};
  $('#m').querySelectorAll('[data-ocbm]').forEach(x=>x.onchange=()=>ocSet(x.dataset.ocbm,'cbm_oc',x.value));
  $('#m').querySelectorAll('[data-ofob]').forEach(x=>x.onchange=()=>ocSet(x.dataset.ofob,'fob_oc',x.value));
  $('#m').querySelectorAll('[data-del]').forEach(x=>x.onclick=async()=>{const i=it(x.dataset.del);const {error}=await sb.from('eco_items').delete().eq('id',i.id);if(error)return toast('No se pudo sacar');ECO.it=ECO.it.filter(z=>z!==i);drawEcoPedido()});
  const a=$('#eadd');if(!ECO.it.some(i=>i.pedido_id===pe.id))a.focus();a.onkeydown=async e=>{if(e.key!=='Enter')return;const q=a.value.trim().toUpperCase();const m=master.find(x=>x.codigo===q)||master.find(x=>(x.codigo+' '+(x.descripcion||'')).toUpperCase().includes(q));if(!m)return toast('No está en el catálogo');if(it(m.codigo))return toast('Ya está en el pedido');
    const {data,error}=await sb.from('eco_items').insert({pedido_id:pe.id,codigo:m.codigo,cant:m.moq||1,orden:ECO.it.filter(i=>i.pedido_id===pe.id).length+1}).select().single();if(error)return toast('No se pudo sumar');ECO.it.push(data);toast('Sumado: '+m.codigo);drawEcoPedido()};
}

/* ---- Precios (reemplaza la hoja PRICING) ---- */
/* el pedido trabaja por pieza; la tienda vende la caja completa (precio × piezas por caja) */
const pzEco=c=>+((byCod(c)||{}).piezas_por_caja)||1;
function ecoTienda(r){const PB=Object.fromEntries(prods.map(p=>[p.id,p]));return r.items.filter(i=>i.precioARS>0&&PB[i.codigo]&&(+PB[i.codigo].precio_lista!==Math.round(i.precioARS*pzEco(i.codigo))||PB[i.codigo].precio_preventa)).map(i=>({i,p:PB[i.codigo]}))}
function ecoPrecios(pe,r){
  const L=r.items,cc=r.cc,p=r.p,tc=p.tc,A=v=>ars(v*tc);
  const GV=[['Cobro: comisiones de tarjeta y cuotas + descuento por transferencia (según la mezcla de pagos)',cc.total],['Ingresos Brutos',p.iibb],['Marketing (anuncios)',p.marketing],['Envío / entrega',p.entrega],['Garantía y roturas',p.garantia]].concat(p.comisionVenta?[['Comisión de venta',p.comisionVenta]]:[]);
  const gvar=GV.reduce((a,x)=>a+x[1],0);
  const EST={ok:'<span class="pos">bien</span>',warn:'<span style="color:#d68910">deja poco</span>',bad:'<span class="neg"><b>pierde plata</b></span>'};
  const D=ecoTienda(r);
  const tienda=D.length?`<div class="card pad" style="margin-bottom:12px;border-color:#d68910"><h4 style="margin-top:0">Paso 3 · ${D.length} precio${D.length>1?'s':''} todavía no ${D.length>1?'están':'está'} en la tienda</h4>
   <div class="wrap"><table><thead><tr><th>Producto</th><th class="n">Lo que ve hoy el cliente</th><th class="n">Lo que pusiste acá</th></tr></thead><tbody>${D.map(({i,p:pp})=>`<tr><td><b>${esc(pp.tipo)} ${esc(pp.nombre)}</b><div class="hint">${esc(i.codigo)}</div></td><td class="n">${ars(pp.precio_lista)}</td><td class="n"><b>${ars(i.precioARS*pzEco(i.codigo))}</b>${pzEco(i.codigo)>1?`<div class="hint">caja de ${pzEco(i.codigo)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>
   <button class="btn dk" id="etienda" style="margin-top:10px">Pasar estos precios a la tienda</button> <span class="hint">Las ventas ya hechas no cambian: quedan con el precio que pagó el cliente.</span></div>`
   :`<p class="pos" style="margin:0 0 12px">✓ La tienda ya usa los precios de este contenedor.</p>`;
  const filas=L.map((i,k)=>{const P=i.precioARSef,V=i.precioUsd,antes=i.margenU-V*gvar-i.almacenajeU;
    const cuentas=[['Precio de lista (con IVA)',P,'b'],['− IVA ('+eP(p.iva,0)+')',-(P-V*tc)],['= Venta sin IVA',V*tc,'b'],['− Costo del producto puesto en el galpón (FOB, flete, seguro, aduana, impuestos; detalle en la pestaña Costos)',-i.costoU*tc]]
      .concat(GV.map(([t,x])=>['− '+t+' ('+eP(x,1)+')',-V*x*tc]))
      .concat([['− Galpón mientras se vende',-i.almacenajeU*tc],['= Ganancia antes de impuestos',antes*tc,'b'],['− Impuesto a las Ganancias ('+eP(p.ganancias,0)+')',-Math.max(0,antes)*p.ganancias*tc],['= Te queda limpio por unidad',i.netoU*tc,'b']]);
    return `<tr${i.alerta==='bad'?' style="background:#fdecec"':''}><td>${i.foto?`<img src="${esc(src(i.foto))}" alt="">`:''}</td><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.desc)}</div></td><td class="n">${i.cant}</td>
     <td class="n">${A(i.costoU)}</td><td class="n neg">${ars(i.minSinPerderARS)}</td><td class="n">${ars(i.sugeridoARS)}</td>
     <td class="n"><input class="num" style="width:110px;font-weight:600" data-pr="${esc(i.codigo)}" value="${i.precioARS?Math.round(i.precioARS).toLocaleString('es-AR'):''}" placeholder="${Math.round(i.sugeridoARS).toLocaleString('es-AR')}" inputmode="numeric">${pzEco(i.codigo)>1?`<div class="hint" style="color:#2c6ecb;white-space:nowrap">por unidad · se vende de a ${pzEco(i.codigo)}:<br>en la tienda <b>${ars(i.precioARSef*pzEco(i.codigo))}</b></div>`:''}</td>
     <td class="n">${ars(i.precioContadoARS)}</td><td class="n"><b class="${i.netoU<0?'neg':''}">${A(i.netoU)}</b></td><td class="n">${eP(i.retorno,0)}</td><td>${EST[i.alerta]||''}</td><td><button class="lnk" data-cu="${k}">Ver cuentas</button></td></tr>
     <tr hidden data-cur="${k}"><td></td><td colspan="11"><div class="card pad" style="max-width:640px;margin:4px 0 10px">${cuentas.map(([t,v,b])=>`<div class="rw"${b?' style="border-top:1px solid var(--line);padding-top:4px"':''}><span>${b?`<b>${t}</b>`:t}</span>${b?`<b>${ars(v)}</b>`:`<span>${v<0?"−"+ars(-v):ars(v)}</span>`}</div>`).join('')}
      <div class="rw" style="margin-top:8px"><span class="hint">Plata que ponés por unidad (incluye el IVA y las percepciones de la aduana, que después recuperás)</span><span>${A(i.desembolsoU)}</span></div>
      <div class="rw"><span><b>Retorno</b> = te queda limpio ÷ plata que ponés</span><b>${eP(i.retorno,0)}</b></div></div></td></tr>`}).join('');
  const vt=L.reduce((a,i)=>a+i.ventaT,0),nt=L.reduce((a,i)=>a+i.netoT,0);
  return `${tienda}
  <div class="card pad" style="margin-bottom:12px;max-width:980px"><b>Cómo se arma el precio</b>
   <ol style="margin:6px 0 0 18px;padding:0;line-height:1.6">
    <li><b>El sistema calcula dos números por producto.</b> <span class="neg">Mínimo sin perder</span>: abajo de eso perdés plata. <b>Sugerido</b>: cubre <b>todos</b> los costos (el producto puesto en el galpón + cobro y cuotas + Ingresos Brutos + marketing + envío + garantía + galpón + Ganancias) y además te deja un retorno de ${eP(p.retornoMinProd,0)} sobre la plata que ponés.</li>
    <li><b>Vos escribís el precio en PRECIO LISTA</b> (con IVA, el que ve el cliente). Si lo dejás vacío, se usa el sugerido. <b>Siempre por unidad</b>: si el producto se vende de a 2 (ej. sillas en caja de 2), ponés el precio de 1 silla y la tienda muestra el de la caja (× 2). Con "Ver cuentas" ves de dónde sale cada peso.</li>
    <li><b>Lo pasás a la tienda</b> con el botón de arriba. Transferencia, cuotas y profesionales se calculan solos.</li></ol>
   <p class="hint" style="margin:8px 0 0">Los % de gastos (cuotas ${eP(cc.total,1)} en promedio, marketing ${eP(p.marketing,0)}, envío ${eP(p.entrega,0)}, IIBB ${eP(p.iibb,1)}, garantía ${eP(p.garantia,0)}) son una <b>proyección</b>: se cambian en Importación → Parámetros de importación. Lo que de verdad se gastó se ve en la pestaña <b>Real</b>.</p></div>
  <div class="card wrap"><table class="big"><thead><tr><th></th><th>Producto</th><th class="n">Cant.</th><th class="n">Costo en galpón<div class="hint">por unidad, sin IVA</div></th><th class="n">Mínimo sin perder<div class="hint">con IVA</div></th><th class="n">Sugerido<div class="hint">con IVA</div></th><th class="n">PRECIO LISTA<div class="hint">con IVA, por unidad</div></th><th class="n">Con transferencia</th><th class="n">Te queda limpio<div class="hint">por unidad</div></th><th class="n">Retorno</th><th>Estado</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>
  <p class="hint">Si vendés todo a estos precios: venta sin IVA ${A(vt)} · te queda limpio ${A(nt)}.</p>`;
}
function bindPrecios(pe){
  const et=$('#etienda');if(et)et.onclick=()=>ecoPasarTienda(pe);$('#m').querySelectorAll('[data-cu]').forEach(b=>b.onclick=()=>{const t=$('#m').querySelector('[data-cur="'+b.dataset.cu+'"]');t.hidden=!t.hidden;b.textContent=t.hidden?'Ver cuentas':'Ocultar'});
  const it=c=>ECO.it.find(i=>i.pedido_id===pe.id&&i.codigo===c);
  $('#m').querySelectorAll('[data-pr]').forEach(x=>{x.oninput=()=>{const d=x.value.replace(/\D/g,'');x.value=d?(+d).toLocaleString('es-AR'):''};x.onchange=async()=>{const i=it(x.dataset.pr),d=x.value.replace(/\D/g,''),v=d?+d:null;i.precio_ars=v;const {error}=await sb.from('eco_items').update({precio_ars:v}).eq('id',i.id);toast(error?'No se pudo guardar':'Guardado en el contenedor. Para que lo vea el cliente: "Pasar estos precios a la tienda" (arriba)');drawEcoPedido()}});
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
/* pasa el precio de lista del pedido a la tienda (única fuente del precio) */
async function ecoPasarTienda(pe){
  const D=ecoTienda(ecoCalc(pe));if(!D.length)return;
  if(!confirm(`¿Pasar ${D.length} precio${D.length>1?'s':''} a la tienda? Los clientes van a ver los precios nuevos al instante.`))return;
  let ok=0;for(const {i,p} of D){const v=Math.round(i.precioARS*pzEco(i.codigo));const {error}=await sb.from('products').update({precio_lista:v,precio_preventa:null}).eq('id',p.id);if(!error){p.precio_lista=v;p.precio_preventa=null;ok++}}
  toast(ok===D.length?'Listo: la tienda ya usa estos precios':`Se pasaron ${ok} de ${D.length}`);drawEcoPedido();
}

/* ======== Lo real contra lo proyectado ======== */
/* muestras mínimas: por debajo NO se recalibra nada (se muestra "midiendo n de N") */
const MIN={dias:30,u:20,ped:15,skuU:5};
const grupoPago=v=>v.mp==='transferencia'?'transf':v.mp==='credit_card'&&v.cuotas>1?'cuotas':'unPago';
function ecoReal(pe){
  const r0=ecoCalc(pe),p0=r0.p,cods=new Set(r0.items.map(i=>i.codigo)),desde=new Date(pe.created_at),now=Date.now(),tc=ST.tc||p0.tc,dt=ST.desc_transf??0.15;
  const rec=(ECO.rec||[]).filter(x=>x.pedido_id===pe.id),recib=rec.reduce((a,x)=>a+x.recibidas,0),rotas=rec.reduce((a,x)=>a+x.rotas,0);
  const fRec=pe.proyeccion?new Date(pe.proyeccion.fecha):null,dias=fRec?Math.max(0,(now-fRec)/DIA):null;
  const L=[],PED=[];(ECO.V||[]).filter(v=>new Date(v.f)>=desde).forEach(v=>{const tot=v.its.reduce((s,i)=>s+(i.p||0)*i.q,0)||1;let any=false;
    v.its.forEach(i=>{if(!cods.has(i.id))return;any=true;const sh=(i.p||0)*i.q/tot;L.push({f:v.f,sku:i.id,u:i.q,precio:i.p||0,canal:v.canal,pago:grupoPago(v),com:v.com*sh,cobrado:v.total*sh,neta:v.venta*sh,desc:/transferencia/.test(i.r||'')||v.mp==='transferencia'?(i.p||0)*i.q*(1/(1-dt)-1):0})});if(any)PED.push(v)});
  const u=L.reduce((a,x)=>a+x.u,0),nP=PED.length,cobr=L.reduce((a,x)=>a+x.cobrado,0),neta=L.reduce((a,x)=>a+x.neta,0);
  const total=r0.items.reduce((a,i)=>{const x=rec.find(z=>z.codigo===i.codigo);return a+(x?x.recibidas-x.rotas:i.cant)},0);
  const C={};const add=(k,label,proj,real,n,N,ok,fmt,mejor)=>C[k]={label,proj,real,n,N,ok,fmt,mejor};
  /* rotación */
  const okRot=dias!=null&&dias>=MIN.dias&&u>=MIN.u,vel=dias?u/dias:0;
  add('meses','Meses para vender',p0.meses,okRot?dias/30.42+((total-u)/vel)/30.42:null,dias==null?0:`${Math.floor(dias)} días · ${u} u.`,`${MIN.dias} días y ${MIN.u} u.`,okRot,x=>eN(x,1),-1);
  /* mezcla de pago, ponderada por monto */
  const okMix=nP>=MIN.ped,sh=k=>cobr?L.filter(x=>x.pago===k).reduce((a,x)=>a+x.cobrado,0)/cobr:0;
  add('mixTransf','Pagan con transferencia',p0.mixTransf,okMix?sh('transf'):null,nP,MIN.ped,okMix,x=>eP(x,0),0);
  add('mixUnPago','Pagan con tarjeta en 1 pago',p0.mixUnPago,okMix?sh('unPago'):null,nP,MIN.ped,okMix,x=>eP(x,0),0);
  add('unidPorVenta','Unidades por venta',p0.unidPorVenta,okMix?u/nP:null,nP,MIN.ped,okMix,x=>eN(x,2),1);
  /* costo de cobrar: comisión real + descuento por transferencia, sobre la venta sin IVA a precio lleno */
  const dsc=L.reduce((a,x)=>a+x.desc,0),costoCob=neta?((L.reduce((a,x)=>a+x.com,0)+dsc)/(1+p0.iva))/(neta+dsc/(1+p0.iva)):null;
  add('cobro','Costo de cobrar',r0.cc.total,okMix?costoCob:null,nP,MIN.ped,okMix,x=>eP(x,1),-1);
  add('merma','Merma (roturas)',p0.merma,recib?rotas/recib:null,recib?`${recib} recibidas`:0,'la recepción',!!recib,x=>eP(x,1),-1);
  add('entrega','Entrega al cliente',p0.entrega,null,0,'el costo real de cada envío',false,x=>eP(x,1),-1);
  /* precio efectivo por producto */
  const SKU={};L.forEach(x=>{const s=SKU[x.sku]||(SKU[x.sku]={u:0,m:0,ult:null});s.u+=x.u;s.m+=x.precio*x.u;if(!s.ult||new Date(x.f)>s.ult)s.ult=new Date(x.f)});
  /* proyección al cierre: el mismo cálculo con lo medido (sólo lo que pasó la muestra mínima) */
  const over={};if(okRot)over.meses=C.meses.real;if(okMix){over.mixTransf=C.mixTransf.real;over.mixUnPago=C.mixUnPago.real;over.unidPorVenta=C.unidPorVenta.real}if(recib)over.merma=C.merma.real;
  const S=pe.proyeccion,inp=S&&S.input?S.input:ecoPedido(pe);
  const items=inp.items.map(it=>{const s=SKU[it.codigo];return s&&s.u>=MIN.skuU?{...it,precioARS:s.m/s.u}:it});
  const r1=calcular({items,par:Object.assign({},inp.par||{},over)},S?S.cat:ecoCatPe(pe),S?S.par:ECO.par,S?S.ar:ECO.ar);
  return {r0,r1,C,L,PED,u,nP,dias,fRec,recib,rotas,total,SKU,cobr,neta,tc};
}
function ecoAlertasReales(pe){
  const X=ecoReal(pe),A=[],p=X.r0.p;if(!X.fRec)return A;
  X.r0.items.forEach(i=>{const s=X.SKU[i.codigo];if(!s&&X.dias>90)A.push({g:'bad',t:`${i.codigo} no vendió ninguna unidad en ${Math.floor(X.dias)} días desde que se recibió.`})});
  const mitad=X.u>=X.total/2||X.dias>=p.meses*30.42/2;if(mitad&&X.r1.anualizado<p.objetivo)A.push({g:'bad',t:`A mitad de camino, el rinde por año proyectado con lo real es ${eP(X.r1.anualizado)}, debajo del objetivo de ${eP(p.objetivo,0)}.`});
  if(X.C.cobro.ok&&X.C.cobro.real>X.C.cobro.proj+0.02)A.push({g:'warn',t:`Cobrar cuesta ${eP(X.C.cobro.real)} contra ${eP(X.C.cobro.proj)} supuesto: se está vendiendo más en cuotas de lo previsto.`});
  if(X.C.meses.ok&&X.C.meses.real>p.meses+4)A.push({g:'warn',t:`Al ritmo actual se vende todo en ${eN(X.C.meses.real,1)} meses: ${eN(X.C.meses.real-p.meses,1)} meses de atraso contra lo supuesto.`});
  X.r0.items.forEach(i=>{const s=X.SKU[i.codigo];if(s&&s.u>=MIN.skuU&&s.m/s.u<i.precioARSef*0.9)A.push({g:'warn',t:`${i.codigo} se vende en promedio a ${ars(s.m/s.u)}, ${eP(1-(s.m/s.u)/i.precioARSef,0)} abajo de la lista del pedido (${ars(i.precioARSef)}).`})});
  if(X.C.meses.ok&&X.C.meses.real<p.meses)A.push({g:'good',t:`El pedido va adelantado: al ritmo actual se vende todo en ${eN(X.C.meses.real,1)} meses contra ${p.meses} supuestos. Sirve para decidir cuándo pedir el próximo.`});
  return A;
}
/* pestaña Real: proyectado · real / proyección al cierre · desvío (el color depende de si más es mejor o peor) */
function ecoRealV(pe){
  if(!ECO.V)return '<p class="hint">No se pudieron leer las ventas.</p>';
  const X=ecoReal(pe),r0=X.r0,r1=X.r1,S=pe.proyeccion;
  const dv=(a,b,mejor,pts)=>{if(a==null||b==null||!isFinite(a)||!isFinite(b))return '—';const d=pts?(b-a)*100:a?(b-a)/Math.abs(a)*100:0;if(Math.abs(d)<0.05)return '<span class="hint">igual</span>';const bueno=mejor>0?d>0:d<0;return `<b class="${bueno?'pos':'neg'}">${d>0?'+':'−'}${Math.abs(d).toFixed(1).replace('.',',')}${pts?' pts':'%'}</b>`};
  const F=[['Venta sin IVA',r0.venta,r1.venta,eU,1],['Costo de cobrar',r0.venta*r0.cc.total,r1.venta*r1.cc.total,eU,-1],['Meses para vender',r0.p.meses,r1.p.meses,x=>eN(x,1),-1],['Te queda',r0.resultado,r1.resultado,eU,1],['Plata a poner (pico)',r0.pico,r1.pico,eU,-1],['Rinde por año',r0.anualizado,r1.anualizado,x=>eP(x),1,1]];
  return `<div class="card pad" style="margin-bottom:12px">${S?`<p class="hint">Proyección congelada el ${new Date(S.fecha).toLocaleDateString('es-AR')}. Los supuestos de este pedido ya no cambian: lo real se mide contra eso.</p>`:`<p class="hint"><b>El pedido está en ${ESTP[pe.estado]||pe.estado}.</b> La comparación arranca cuando pase a <b>Recibido</b>: ahí se congela la proyección y empieza a contar la rotación. Mientras tanto ya se ven las ventas de preventa.</p>`}
   <div class="kps">${[['Vendidas',`${X.u} de ${X.total}`],['Pedidos',X.nP],['Cobrado',ars(X.cobr)],['Días desde que se recibió',X.dias==null?'—':Math.floor(X.dias)]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
   <div class="wrap"><table><thead><tr><th></th><th class="n">Proyectado</th><th class="n">Real / proyección al cierre</th><th class="n">Desvío</th></tr></thead><tbody>${F.map(([t,a,b,fm,m,pts])=>`<tr><td>${t}</td><td class="n">${fm(a)}</td><td class="n"><b>${fm(b)}</b></td><td class="n">${dv(a,b,m,pts)}</td></tr>`).join('')}</tbody></table></div>
   <p class="hint">La proyección al cierre es el mismo cálculo del tablero, pero con lo que ya se midió en lugar de los supuestos (sólo lo que llegó a la muestra mínima).</p></div>
  <div class="card pad" style="margin-bottom:12px"><h4>Supuestos: lo que se dijo contra lo que se mide</h4><div class="wrap"><table><thead><tr><th>Supuesto</th><th class="n">Se dijo</th><th class="n">Se mide</th><th>Estado</th></tr></thead><tbody>
   ${Object.values(X.C).map(c=>`<tr><td>${c.label}</td><td class="n">${c.fmt(c.proj)}</td><td class="n">${c.ok&&c.real!=null?`<b>${c.fmt(c.real)}</b>`:'—'}</td><td>${c.ok?'<span class="pos">recalibrado</span>':`<span class="hint">midiendo (${c.n||0} de ${c.N})</span>`}</td></tr>`).join('')}</tbody></table></div>
   <p class="hint">Por debajo de la muestra mínima no se recalibra nada: con 3 ventas la proyección saltaría de 12 meses a 2 y de vuelta.</p></div>
  <div class="card pad"><h4>Por producto</h4><div class="wrap"><table><thead><tr><th>Producto</th><th class="n">Vendidas / ${X.recib?'recibidas':'pedidas'}</th><th class="n">Precio efectivo</th><th class="n">Lista del pedido</th><th class="n">Retorno<br><small>proyectado → real</small></th><th class="n">Días sin vender</th></tr></thead><tbody>
   ${r0.items.map(i=>{const s=X.SKU[i.codigo],rc=(ECO.rec||[]).find(z=>z.pedido_id===pe.id&&z.codigo===i.codigo),i1=r1.items.find(z=>z.codigo===i.codigo),ok=s&&s.u>=MIN.skuU,ult=s?s.ult:X.fRec;return `<tr><td><b>${esc(i.codigo)}</b><div class="hint">${esc(i.desc)}</div></td><td class="n">${s?s.u:0} / ${rc?rc.recibidas-rc.rotas:i.cant}</td>
    <td class="n">${s?ars(s.m/s.u):'—'}${s&&!ok?`<div class="hint">midiendo (${s.u} de ${MIN.skuU})</div>`:''}</td><td class="n">${ars(i.precioARSef)}${ok?`<div class="${s.m/s.u<i.precioARSef*0.9?'neg':'hint'}">${eP(s.m/s.u/i.precioARSef-1,0)}</div>`:''}</td>
    <td class="n">${eP(i.retorno,0)} → ${i1?`<b>${eP(i1.retorno,0)}</b>`:'—'}</td><td class="n">${ult?Math.floor((Date.now()-ult)/DIA):'—'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

/* ======== Caja: lo proyectado y lo real, en dos columnas (nunca se pisan) ======== */
const CONC=[['anticipo','Anticipo al proveedor',0],['saldo','Saldo al proveedor',1],['flete','Flete',2],['seguro','Seguro',2],['despacho','Despacho y terminal',3],['honorarios','Honorarios del despachante',3],['aranceles','Aranceles',4],['iva','IVA y percepciones',5],['deposito','Depósito fiscal',6],['recepcion','Recepción en el fulfillment',7],['galpon','Alquiler de galpón (mensual)',8]];
function ecoCaja(pe,r){
  const MV=(ECO.mov||[]).filter(m=>m.pedido_id===pe.id),X=ECO.V?ecoReal(pe):null;
  const real=r.flujo.map(()=>null);MV.forEach(m=>{const c=CONC.find(x=>x[0]===m.concepto);if(c)real[c[2]]=(real[c[2]]||0)-Math.abs(+m.monto_usd)});
  if(X&&X.cobr)real[9]=X.cobr/X.tc;
  let sp=0,sr=0;const rows=r.flujo.map((f,i)=>{sp+=f.m;if(real[i]!=null)sr+=real[i];return {...f,real:real[i],sp,sr}});
  const picoReal=Math.abs(Math.min(0,...rows.filter(x=>x.real!=null).map(x=>x.sr))),egP=r.flujo.slice(0,9).reduce((a,f)=>a+Math.min(0,f.m),0),egR=real.slice(0,9).reduce((a,v)=>a+(v||0),0);
  const minP=Math.min(...rows.map(x=>x.sp));
  return `<div class="kps">${[['Pico proyectado',eU(r.pico)],['Pico real hasta hoy',eU(picoReal)],['Ya pusiste',eU(-egR)],['Falta poner (según lo proyectado)',eU(Math.max(0,-egP+egR))]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
  <div class="card wrap"><table><thead><tr><th class="n">Día</th><th>Concepto</th><th class="n">Proyectado</th><th class="n">Real</th><th class="n">Saldo proyectado</th><th class="n">Saldo real</th></tr></thead><tbody>
  ${rows.map(f=>{const sobre=f.real!=null&&f.m<0&&Math.abs(f.real)>Math.abs(f.m)*1.1;return `<tr${f.sp===minP?' style="background:rgba(192,57,43,.08)"':''}><td class="n">${f.dia}</td><td>${esc(f.c)}${f.sp===minP?' <b class="neg">← pico</b>':''}${sobre?`<div class="neg hint">el real supera al proyectado en ${eP(Math.abs(f.real)/Math.abs(f.m)-1,0)}</div>`:''}</td><td class="n ${f.m<0?'neg':'pos'}">${eU(f.m)}</td><td class="n">${f.real==null?'<span class="hint">—</span>':`<b class="${f.real<0?'neg':'pos'}">${eU(f.real)}</b>`}</td><td class="n">${eU(f.sp)}</td><td class="n">${f.real==null?'':eU(f.sr)}</td></tr>`}).join('')}
  <tr class="tot"><td></td><td>Impuesto a las Ganancias</td><td class="n neg">${eU(-r.impGanancias)}</td><td></td><td class="n"><b>${eU(r.resultado)}</b></td><td></td></tr></tbody></table></div>
  <p class="hint">Los pagos grandes se cargan a mano abajo. Los cobros no: salen solos de las ventas de los productos de este contenedor. Los gastos de venta van después del cobro porque se pagan a medida que vendés.</p>
  <div class="card pad" style="margin-top:12px"><h4>Cargar un pago real</h4><div class="bar" style="flex-wrap:wrap;gap:8px">
   <input type="date" id="mv_f" value="${new Date().toISOString().slice(0,10)}"><select id="mv_c">${CONC.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join('')}</select>
   <input id="mv_m" class="num" placeholder="monto" style="width:120px" inputmode="decimal"><select id="mv_mo"><option value="usd">US$</option><option value="ars">$ pesos</option></select>
   <input id="mv_tc" class="num" style="width:80px" value="${ST.tc||''}" title="tipo de cambio" inputmode="decimal"><input id="mv_cp" placeholder="comprobante (n° o link)" style="width:180px"><input id="mv_n" placeholder="nota" style="width:160px"><button class="btn dk" id="mv_ok">Agregar</button></div>
   ${MV.length?`<div class="wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th class="n">US$</th><th class="n">Pesos</th><th class="n">TC</th><th>Comprobante</th><th></th></tr></thead><tbody>${MV.map(m=>`<tr><td>${new Date(m.fecha+'T12:00').toLocaleDateString('es-AR')}</td><td>${esc((CONC.find(c=>c[0]===m.concepto)||[0,m.concepto])[1])}${m.nota?`<div class="hint">${esc(m.nota)}</div>`:''}</td><td class="n">${eU(m.monto_usd)}</td><td class="n">${m.monto_ars?ars(m.monto_ars):'—'}</td><td class="n">${m.tc||'—'}</td><td class="hint">${esc(m.comprobante||'')}</td><td><button class="btn" data-mvx="${m.id}">×</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Todavía no cargaste pagos. Podés empezar por el anticipo al proveedor.</p>'}</div>`;
}
function bindCaja(pe){
  $('#mv_ok').onclick=async()=>{const m=eNum($('#mv_m').value),tc=eNum($('#mv_tc').value)||ST.tc,enArs=$('#mv_mo').value==='ars';if(!m||!isFinite(m))return toast('Poné el monto');
    const row={pedido_id:pe.id,fecha:$('#mv_f').value,concepto:$('#mv_c').value,monto_usd:enArs?Math.round(m/tc*100)/100:m,monto_ars:enArs?m:Math.round(m*tc),tc,comprobante:$('#mv_cp').value.trim()||null,nota:$('#mv_n').value.trim()||null};
    const {data,error}=await sb.from('eco_movimientos').insert(row).select().single();if(error)return toast('No se pudo guardar');ECO.mov.push(data);toast('Pago cargado');drawEcoPedido()};
  $('#m').querySelectorAll('[data-mvx]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Borrar este pago?'))return;const {error}=await sb.from('eco_movimientos').delete().eq('id',+b.dataset.mvx);if(error)return toast('No se pudo borrar');ECO.mov=ECO.mov.filter(m=>m.id!==+b.dataset.mvx);drawEcoPedido()});
}
