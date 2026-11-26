/* ---------- Contenedor: cargar la PROFORMA FINAL (una sola, la que manda) ----------
   La proforma trae una línea por SKU de venta (producto + color, ej. MES-163-BLA) con cantidad, precio por pieza,
   cajas, m³ y pesos. Con "Usar esta orden" sobre esa proforma se actualiza TODO lo del contenedor:
   · Productos del contenedor: cantidad (suma de colores), FOB y m³ por pieza (eco_items.cant / fob_oc / cbm_oc).
   · Ingreso y packing list: cuántas cajas de cada SKU de caja llegan (eco_ingreso) → packing list para Pailos
     y stock "en camino" que ve la tienda por color.
   · Costos extra: los renglones sin código (ej. "Inland transport") van a "Flete interno hasta el puerto".
   Si la proforma no trae códigos de color, sigue funcionando la lectura de antes (por producto). */
(function(){
const SKURX=/^[A-Z]{3}-\d{3}-[A-Z]{3}$/;
const N=v=>{if(v==null||v==='')return null;if(typeof v==='number')return v;const s=String(v).replace(/[^\d.,-]/g,'');if(!s)return null;return +s.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')};
const U=s=>String(s||'').trim().toUpperCase();

/* ¿es una proforma por SKU de venta? → lee las líneas */
function piSku(A){
  let hr=-1,ci={};
  for(let i=0;i<Math.min(40,A.length);i++){const r=A[i].map(c=>String(c).toLowerCase());
    const f=(...w)=>r.findIndex(c=>w.some(x=>c.includes(x)));
    const sku=f('item ref','sku','código','codigo'),q=f('qty','cantidad','quantity'),pr=f('unit price','precio unit','price');
    if(sku>-1&&q>-1&&pr>-1){hr=i;ci={sku,q,pr,amt:f('amount','importe','total usd'),ctn:f('carton','cajas','ctn'),cbm:f('cbm','m³','m3'),nw:f('n.w','neto'),gw:f('g.w','bruto'),desc:f('description','descrip'),color:f('color')};break}}
  if(hr<0)return null;
  const L=[],X=[];
  for(const r of A.slice(hr+1)){const sku=U(r[ci.sku]),q=N(r[ci.q]),amt=ci.amt>-1?N(r[ci.amt]):null,desc=ci.desc>-1?String(r[ci.desc]||'').trim():'';
    if(/^total/i.test(String(r[0]||'').trim())||/^total/i.test(desc))break;
    if(SKURX.test(sku)&&q>0){const pr=N(r[ci.pr]);L.push({sku,q,pr:pr!=null?pr:(amt!=null?amt/q:null),amt:amt!=null?amt:(pr||0)*q,ctn:ci.ctn>-1?N(r[ci.ctn]):null,cbm:ci.cbm>-1?N(r[ci.cbm]):null,nw:ci.nw>-1?N(r[ci.nw]):null,gw:ci.gw>-1?N(r[ci.gw]):null,desc,color:ci.color>-1?String(r[ci.color]||''):''});continue}
    if(!SKURX.test(sku)&&amt>0&&desc)X.push({desc,amt,on:true})}
  return L.length>=3?{L,X}:null}

/* qué es cada línea en el panel y cuántas cajas de cada tipo llegan */
function piResolver(S){
  S.L.forEach(l=>{if(l.v===undefined){const v=VARS.find(x=>x.sku===(l.elegido||l.sku));l.v=v||null}
    const sku=l.v?l.v.sku:null,K=sku?CAJAS.filter(k=>k.sku===sku):[];
    l.cajas=K.map(k=>({sku_caja:k.sku_caja,parte:k.parte,n:Math.round(l.q/(+k.piezas||1)),ok:Number.isInteger(l.q/(+k.piezas||1))}));
    l.ctnCalc=l.cajas.reduce((a,c)=>a+c.n,0);
    l.alts=l.v?[]:VARS.filter(x=>x.sku.slice(0,8)===l.sku.slice(0,8)&&x.estado!=='discontinuado')})}

function piHtml(pe){const S=OCPREV;piResolver(S);
  const tot={q:0,amt:0,ctn:0,cbm:0};S.L.forEach(l=>{tot.q+=l.q;tot.amt+=l.amt;tot.ctn+=l.ctn||0;tot.cbm+=l.cbm||0});
  const ext=S.X.filter(x=>x.on).reduce((a,x)=>a+x.amt,0),masters=new Set(S.L.filter(l=>l.v).map(l=>l.v.codigo_master));
  const fuera=ECO.it.filter(i=>i.pedido_id===pe.id&&!masters.has(i.codigo));
  const prob=S.L.filter(l=>!l.v||!l.cajas.length||(l.ctn!=null&&l.ctnCalc!==l.ctn));
  return `<div class="card pad" style="margin-top:14px"><div class="bar" style="margin:0"><b>Proforma final: ${esc(S.nombre)}</b><span class="sp"></span><button class="btn" id="occan">Cancelar</button><button class="btn dk" id="pfok">Aplicar al contenedor</button></div>
   <div class="kps" style="margin-top:10px">${[['Líneas (colores)',S.L.length],['Piezas',tot.q],['Cajas',tot.ctn],['m³',eN(tot.cbm,2)],['FOB productos',eU(tot.amt)],['+ Costos extra',eU(ext)],['Total proforma',eU(tot.amt+ext)]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
   ${prob.length?`<div class="card pad iwarn" style="margin:10px 0"><b>${prob.length} línea(s) para revisar</b> (marcadas abajo). Se pueden aplicar igual: lo que falta se completa después.</div>`:'<p class="pos" style="margin:10px 0">Todas las líneas se reconocieron y las cajas cierran con la proforma.</p>'}
   <div class="wrap"><table><thead><tr><th>Código de la proforma</th><th>En el panel</th><th class="n">Piezas</th><th class="n">US$ u.</th><th class="n">m³</th><th class="n">Cajas proforma</th><th>Cajas para Pailos (calculadas)</th></tr></thead><tbody>
   ${S.L.map((l,i)=>{const bad=!l.v||!l.cajas.length||(l.ctn!=null&&l.ctnCalc!==l.ctn);return `<tr${bad?' style="background:#fff8e6"':''}><td><b>${esc(l.sku)}</b><div class="hint">${esc(l.desc)}${l.color?' · '+esc(l.color):''}</div></td>
    <td>${l.v?`${esc(l.v.sku)}<div class="hint">${esc(l.v.codigo_master)}</div>`:l.alts.length?`<select data-pfs="${i}"><option value="">¿Cuál es? Elegí…</option>${l.alts.map(a=>`<option value="${esc(a.sku)}">${esc(a.sku)} · ${esc(typeof colNom==='function'?colNom(a.color):a.color)}</option>`).join('')}</select><div class="hint neg">este color no existe con ese código</div>`:'<span class="neg">No existe en el panel</span><div class="hint">Crealo en Productos (+ Color) y volvé a cargar</div>'}</td>
    <td class="n">${l.q}</td><td class="n">${l.pr!=null?eN(l.pr,2):'—'}</td><td class="n">${l.cbm!=null?eN(l.cbm,3):'—'}</td><td class="n">${l.ctn??'—'}</td>
    <td>${l.cajas.length?l.cajas.map(c=>`<div class="hint" style="white-space:nowrap">${esc(c.sku_caja)} <b>${c.n}</b> (${esc(c.parte)})${c.ok?'':' <span class="neg">no da exacto</span>'}</div>`).join('')+(l.ctn!=null&&l.ctnCalc!==l.ctn?`<div class="neg hint">suman ${l.ctnCalc}, la proforma dice ${l.ctn}: revisá las piezas por caja</div>`:''):l.v?'<span class="neg hint">este color no tiene cajas cargadas</span>':'—'}</td></tr>`}).join('')}</tbody></table></div>
   ${S.X.length?`<h4 style="margin:14px 0 6px">Renglones sin código (costos extra)</h4>${S.X.map((x,i)=>`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-pfx="${i}" ${x.on?'checked':''} style="width:auto"> ${esc(x.desc)}: <b>${eU(x.amt)}</b> → va a "Flete interno hasta el puerto"</label>`).join('')}`:''}
   ${fuera.length?`<label style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="pfsacar" checked style="width:auto"> Sacar del contenedor lo que no está en la proforma: <b>${fuera.map(i=>esc(i.codigo)).join(', ')}</b></label>`:''}
   <p class="hint" style="margin-top:10px">Al aplicar: se actualizan las cantidades, el FOB y el m³ de cada producto del contenedor, las cajas de "Ingreso y packing list" (lo que va a recibir Pailos y el stock "en camino" de cada color en la tienda) y los costos extra. El Maestro no se toca.</p></div>`}

async function piAplicar(pe){const S=OCPREV;piResolver(S);
  const L=S.L.filter(l=>l.v),G={};
  L.forEach(l=>{const g=G[l.v.codigo_master]||(G[l.v.codigo_master]={q:0,amt:0,cbm:0,cbmOk:true});g.q+=l.q;g.amt+=l.amt;if(l.cbm!=null)g.cbm+=l.cbm;else g.cbmOk=false});
  for(const [cod,g] of Object.entries(G)){const u={cant:g.q,fob_oc:Math.round(g.amt/g.q*100)/100,...(g.cbmOk&&g.cbm>0?{cbm_oc:Math.round(g.cbm/g.q*10000)/10000}:{})};
    const i=ECO.it.find(x=>x.pedido_id===pe.id&&x.codigo===cod);
    if(i){const {error}=await sb.from('eco_items').update(u).eq('id',i.id);if(error)return toast('No se pudo: '+error.message);Object.assign(i,u)}
    else{const {data,error}=await sb.from('eco_items').insert({pedido_id:pe.id,codigo:cod,...u,orden:ECO.it.filter(x=>x.pedido_id===pe.id).length+1}).select().single();if(error)return toast('No se pudo sumar '+cod+': '+error.message);ECO.it.push(data)}}
  if(document.getElementById('pfsacar')?.checked){const fuera=ECO.it.filter(i=>i.pedido_id===pe.id&&!G[i.codigo]);if(fuera.length){await sb.from('eco_items').delete().in('id',fuera.map(i=>i.id));ECO.it=ECO.it.filter(i=>!fuera.includes(i))}}
  /* cajas para Pailos: se reemplaza el ingreso de este contenedor por lo que dice la proforma */
  const ING=[];L.forEach(l=>l.cajas.forEach(c=>ING.push({pedido_id:pe.id,sku_caja:c.sku_caja,cajas:c.n})));
  await sb.from('eco_ingreso').delete().eq('pedido_id',pe.id);
  if(ING.length){const {error}=await sb.from('eco_ingreso').insert(ING);if(error)return toast('Productos actualizados, pero no se pudieron guardar las cajas: '+error.message)}
  ECO.ing=(ECO.ing||[]).filter(x=>x.pedido_id!==pe.id).concat(ING);
  /* costos extra */
  const ext=S.X.filter(x=>x.on).reduce((a,x)=>a+x.amt,0),par=Object.assign({},pe.par||{});
  if(ext>0){if(+par.origenUSD>=ext&&par.consolidacion==null){par.consolidacion=Math.round((+par.origenUSD-ext)*100)/100||null;delete par.origenUSD}par.fleteInterno=ext}
  const tot=S.L.reduce((a,l)=>({q:a.q+l.q,amt:a.amt+l.amt,ctn:a.ctn+(l.ctn||0),cbm:a.cbm+(l.cbm||0)}),{q:0,amt:0,ctn:0,cbm:0});
  par.oc_aplicada={doc:S.doc,nombre:S.nombre,fecha:new Date().toISOString(),lineas:Object.keys(G).length,piezas:tot.q,cajas:tot.ctn,cbm:Math.round(tot.cbm*1000)/1000,fob:Math.round((tot.amt+ext)*100)/100};
  pe.par=par;await sb.from('eco_pedidos').update({par}).eq('id',pe.id);
  OCPREV=null;toast(`Proforma aplicada: ${Object.keys(G).length} productos, ${ING.length} tipos de caja`);ECO.vista='productos';drawEcoPedido()}

/* se engancha en la pestaña "Orden de compra y proformas" */
if(typeof ocPreparar==='function'){const _op=ocPreparar;ocPreparar=async function(pe,d,blob){
  try{if(!CAJAS.length||!VARS.length)await loadSkus();await loadXLSX();const wb=XLSX.read(await blob.arrayBuffer(),{type:'array'});
    for(const n of wb.SheetNames){const A=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true});const R=piSku(A);
      if(R){OCPREV={pe:pe.id,doc:d.id,nombre:d.nombre,modo:'sku',...R};const f=R.L.filter(l=>!VARS.some(v=>v.sku===l.sku)).length;toast(`Proforma por color: ${R.L.length} líneas${f?` · ${f} para revisar`:''}`);return}}}
  catch(e){console.error(e)}
  return _op.apply(this,arguments)}}
if(typeof ecoOC==='function'){const _h=ecoOC;ecoOC=function(pe,r){if(OCPREV&&OCPREV.pe===pe.id&&OCPREV.modo==='sku'){const k=OCPREV;OCPREV=null;let s;try{s=_h.apply(this,arguments)}finally{OCPREV=k}return s.replace(/<div id="ocprev">[\s\S]*$/,`<div id="ocprev">${piHtml(pe)}</div>`)}return _h.apply(this,arguments)}}
if(typeof bindOC==='function'){const _b=bindOC;bindOC=function(pe){const k=OCPREV&&OCPREV.modo==='sku'?OCPREV:null;if(k)OCPREV=null;let r;try{r=_b.apply(this,arguments)}finally{if(k)OCPREV=k}
  if(OCPREV&&OCPREV.pe===pe.id&&OCPREV.modo==='sku'){const m=$('#m');
    m.querySelectorAll('[data-pfs]').forEach(s=>s.onchange=()=>{const l=OCPREV.L[+s.dataset.pfs];l.elegido=s.value||null;l.v=undefined;drawEcoPedido()});
    m.querySelectorAll('[data-pfx]').forEach(c=>c.onchange=()=>{OCPREV.X[+c.dataset.pfx].on=c.checked;drawEcoPedido()});
    const ok=m.querySelector('#pfok');if(ok)ok.onclick=async()=>{ok.disabled=true;ok.textContent='Aplicando…';await piAplicar(pe)};
    const cc=m.querySelector('#occan');if(cc)cc.onclick=()=>{OCPREV=null;drawEcoPedido()}}
  return r}}
})();
