/* ---------- Contenedor: la PROFORMA FINAL manda ----------
   La proforma trae una línea por color (SKU de venta, ej. MES-166-NEG = mesa 166 negra) con piezas, precio, cajas y m³.
   "Revisar y aplicar" muestra la vista previa (es la autorización) y al aplicar:
   · Colores: si un color de la proforma no existe en el panel, se crea solo (con sus cajas). Los colores de esos
     productos que no vienen en ningún contenedor se sacan de la tienda.
   · Cajas: las piezas por caja salen de la proforma (piezas ÷ cajas). Si el panel decía otra cosa, se corrige.
   · Contenedor: cantidades, FOB y m³ (eco_items) + cajas que llegan (eco_ingreso = packing list para Pailos y
     stock "en camino" de la tienda) + costos extra (renglones sin código → flete interno).
   · Maestro: FOB, m³ por pieza y packing se actualizan con la proforma (queda en el historial). */
(function(){
const SKURX=/^[A-Z]{3}-\d{3}-[A-Z]{3}$/;
const N=v=>{if(v==null||v==='')return null;if(typeof v==='number')return v;const s=String(v).replace(/[^\d.,-]/g,'');if(!s)return null;return +s.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')};
const U=s=>String(s||'').trim().toUpperCase();
const cajaDe=(sku,parte)=>{const p=U(parte);return p==='COMPLETA'||p==='UNICA'||p==='ÚNICA'?sku:p==='TAPA'?sku+'-T':p==='BASE'?sku+'-B':sku+'-'+p[0]};
const numDe=c=>(String(c).match(/-(\d{3,})-/)||[])[1];
const nomCol=c=>typeof colNom==='function'?colNom(c):c;

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

/* qué es cada línea: color existente, color nuevo (se crea), o no se reconoce; y cuántas cajas llegan */
function piResolver(S){
  const CC=(((typeof ECO!=='undefined'&&ECO.ped||[]).find(p=>p.id===S.pe)||{}).par||{}).cambios_color||[];
  S.L.forEach(l=>{
    /* un "Cambiar color" hecho a mano manda sobre la proforma */
    if(l.elegido===undefined){const c=[...CC].reverse().find(z=>z.de===l.sku);if(c){l.elegido=c.a;l.cambioManual=true}}
    l.v=VARS.find(x=>x.sku===(l.elegido&&l.elegido!=='__nuevo'?l.elegido:l.sku))||null;
    l.m=l.v?(byCod(l.v.codigo_master)||{codigo:l.v.codigo_master}):master.find(m=>m.codigo.slice(0,3)===l.sku.slice(0,3)&&numDe(m.codigo)===l.sku.slice(4,7))||null;
    l.colCod=l.sku.slice(8);l.col=PAL.find(c=>c.codigo===l.colCod)||null;
    l.nuevo=!l.v&&!!l.m&&!!l.col;
    l.alts=l.m?VARS.filter(x=>x.codigo_master===l.m.codigo&&x.sku!==l.sku&&x.estado!=='discontinuado'):[];
    const sku=l.v?l.v.sku:l.sku;
    let K=l.v?CAJAS.filter(k=>k.sku===l.v.sku):[];l.sinCajas=!!l.v&&!K.length;
    if(!K.length&&l.m){const her=VARS.find(x=>x.codigo_master===l.m.codigo&&CAJAS.some(k=>k.sku===x.sku));K=her?CAJAS.filter(k=>k.sku===her.sku):[{parte:'COMPLETA',piezas:+l.m.piezas_por_caja||1}]}
    K=[...K].sort((a,b)=>(a.orden||0)-(b.orden||0));
    /* piezas por caja según la proforma: cajas de cada parte = cajas totales ÷ cantidad de partes */
    let pz=null;if(l.ctn>0&&K.length){const porParte=l.ctn/K.length;if(Number.isInteger(porParte)&&porParte>0&&Number.isInteger(l.q/porParte))pz=l.q/porParte}
    l.cajas=(l.v||l.nuevo)?K.map(k=>{const p=pz||+k.piezas||1;return {sku_caja:k.sku_caja&&l.v&&!l.sinCajas?k.sku_caja:cajaDe(sku,k.parte),parte:k.parte,piezas:p,antes:l.v&&!l.sinCajas?+k.piezas:null,n:Math.round(l.q/p),ok:Number.isInteger(l.q/p),base:k}}):[];
    l.ctnCalc=l.cajas.reduce((a,c)=>a+c.n,0)});
  /* colores de estos productos que no vienen en esta proforma ni en otro contenedor */
  const otros=new Set((ECO.ing||[]).filter(x=>x.pedido_id!==S.pe).map(x=>x.sku_caja)),usados=new Set(S.L.map(l=>l.v?l.v.sku:l.sku));
  const ms=new Set(S.L.filter(l=>l.m).map(l=>l.m.codigo));
  S.sobran=VARS.filter(v=>ms.has(v.codigo_master)&&!usados.has(v.sku)&&v.estado!=='discontinuado'&&!CAJAS.some(k=>k.sku===v.sku&&otros.has(k.sku_caja)))}

function piHtml(pe){const S=OCPREV;piResolver(S);
  const tot={q:0,amt:0,ctn:0,cbm:0};S.L.forEach(l=>{tot.q+=l.q;tot.amt+=l.amt;tot.ctn+=l.ctn||0;tot.cbm+=l.cbm||0});
  const ext=S.X.filter(x=>x.on).reduce((a,x)=>a+x.amt,0),masters=new Set(S.L.filter(l=>l.m&&(l.v||l.nuevo)).map(l=>l.m.codigo));
  const fuera=ECO.it.filter(i=>i.pedido_id===pe.id&&!masters.has(i.codigo));
  const mal=l=>!(l.v||l.nuevo)||!l.cajas.length||(l.ctn!=null&&l.ctnCalc!==l.ctn);
  const prob=S.L.filter(mal),nuevos=S.L.filter(l=>l.nuevo),fix=S.L.filter(l=>l.v&&l.cajas.some(c=>c.antes!=null&&c.antes!==c.piezas));
  return `<div class="card pad" style="margin-top:14px"><div class="bar" style="margin:0"><b>Revisar y autorizar: ${esc(S.nombre)}</b><span class="sp"></span><button class="btn" id="occan">Cancelar</button><button class="btn dk" id="pfok">Autorizar y aplicar</button></div>
   <p class="hint" style="margin:6px 0 0">Esto es lo que dice la proforma. <b>La proforma manda</b>: al autorizar, el contenedor, los colores, las cajas para Pailos, el stock "en camino" de la tienda y el Maestro quedan como dice acá.</p>
   <div class="kps" style="margin-top:10px">${[['Líneas (colores)',S.L.length],['Piezas',tot.q],['Cajas',tot.ctn],['m³',eN(tot.cbm,2)],['FOB productos',eU(tot.amt)],['+ Costos extra',eU(ext)],['Total proforma',eU(tot.amt+ext)]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
   ${nuevos.length?`<div class="card pad" style="margin:10px 0;border-color:#2c6ecb"><b>${nuevos.length} color(es) nuevo(s)</b>: no existían en el panel y se crean solos al autorizar: ${nuevos.map(l=>`${esc(l.sku)} (${esc(nomCol(l.colCod))})`).join(', ')}.</div>`:''}
   ${fix.length?`<div class="card pad" style="margin:10px 0;border-color:#2c6ecb"><b>Piezas por caja corregidas con la proforma</b>: ${fix.map(l=>`${esc(l.sku)} (${l.cajas[0].antes} → ${l.cajas[0].piezas} por caja)`).join(', ')}.</div>`:''}
   ${prob.length?`<div class="card pad iwarn" style="margin:10px 0"><b>${prob.length} línea(s) que no se pueden resolver solas</b> (en amarillo). Se aplica el resto; esas quedan afuera hasta corregirlas.</div>`:'<p class="pos" style="margin:10px 0">Todas las líneas se reconocieron y las cajas cierran con la proforma.</p>'}
   <div class="wrap"><table><thead><tr><th>Código en la proforma</th><th>Qué es en el panel</th><th class="n">Piezas</th><th class="n">US$ u.</th><th class="n">m³</th><th class="n">Cajas</th><th>Cajas para Pailos</th></tr></thead><tbody>
   ${S.L.map((l,i)=>{const bad=mal(l);const sel=l.alts.length?`<div style="margin-top:4px"><select data-pfs="${i}" style="font-size:12px;padding:3px 6px"><option value="">${l.nuevo||!l.v?'Es un color nuevo':'Es este color'}</option>${l.alts.map(a=>`<option value="${esc(a.sku)}"${l.elegido===a.sku?' selected':''}>No: es ${esc(a.sku)} · ${esc(nomCol(a.color))}</option>`).join('')}</select></div>`:'';
    return `<tr${bad?' style="background:#fff8e6"':''}><td><b>${esc(l.sku)}</b><div class="hint">${esc(l.desc)}${l.color?' · '+esc(l.color):''}</div></td>
    <td>${l.v?`<b>${esc(nomCol(l.v.color))}</b> ${l.cambioManual?'<span class="hint" style="color:#2c6ecb">cambiado a mano</span>':'<span class="hint">ya existe</span>'}<div class="hint">${esc(l.v.codigo_master)}</div>${l.elegido?sel:''}`:l.nuevo?`<b style="color:#2c6ecb">+ ${esc(nomCol(l.colCod))}</b> <span class="hint">color nuevo, se crea</span><div class="hint">${esc(l.m.codigo)}</div>${sel}`:!l.m?`<span class="neg">No hay ningún producto ${esc(l.sku.slice(0,7))} en el Maestro</span><div class="hint">Cargalo en el Maestro y volvé a revisar</div>`:`<span class="neg">El color "${esc(l.colCod)}" no existe</span><div class="hint">Crealo en Productos → Colores (código ${esc(l.colCod)}) y volvé a revisar</div>${sel}`}</td>
    <td class="n">${l.q}</td><td class="n">${l.pr!=null?eN(l.pr,2):'—'}</td><td class="n">${l.cbm!=null?eN(l.cbm,3):'—'}</td><td class="n">${l.ctn??'—'}</td>
    <td>${l.cajas.length?l.cajas.map(c=>`<div class="hint" style="white-space:nowrap">${esc(c.sku_caja)}: <b>${c.n}</b> caja${c.n>1?'s':''} ${c.parte==='COMPLETA'?'':'('+esc(c.parte.toLowerCase())+') '}de ${c.piezas} pieza${c.piezas>1?'s':''}${c.antes!=null&&c.antes!==c.piezas?` <span style="color:#2c6ecb">(antes ${c.antes})</span>`:''}${c.ok?'':' <span class="neg">no da exacto</span>'}</div>`).join('')+(l.ctn!=null&&l.ctnCalc!==l.ctn?`<div class="neg hint">suman ${l.ctnCalc} y la proforma dice ${l.ctn}</div>`:''):'—'}</td></tr>`}).join('')}</tbody></table></div>
   ${S.X.length?`<h4 style="margin:14px 0 6px">Renglones sin código (costos extra)</h4>${S.X.map((x,i)=>`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-pfx="${i}" ${x.on?'checked':''} style="width:auto"> ${esc(x.desc)}: <b>${eU(x.amt)}</b> → va a "Flete interno hasta el puerto"</label>`).join('')}`:''}
   ${fuera.length?`<label style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="pfsacar" checked style="width:auto"> Sacar del contenedor los productos que no están en la proforma: <b>${fuera.map(i=>esc(i.codigo)).join(', ')}</b></label>`:''}
   ${S.sobran.length?`<label style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="pfsobran" checked style="width:auto"> Sacar los colores que no vienen en ningún contenedor: <b>${S.sobran.map(v=>`${esc(v.sku)} (${esc(nomCol(v.color))})`).join(', ')}</b></label><div class="hint" style="margin-left:26px">Eran colores de prueba o de una cotización vieja. Si nunca se movieron, se borran; si tienen movimientos de stock, sólo se ocultan de la tienda.</div>`:''}
   <p class="hint" style="margin-top:10px">Al autorizar: se crean los colores nuevos, se corrigen las piezas por caja, se actualizan las cantidades, el FOB y el m³ del contenedor, las cajas de "Ingreso y packing list" (lo que recibe Pailos y el stock "en camino" de cada color en la tienda), los costos extra y el Maestro (FOB, m³ y packing, con historial).</p></div>`}

async function piAplicar(pe){const S=OCPREV;piResolver(S);const org='Proforma '+pe.nombre;let nNuevos=0,nFix=0,nM=0;
  /* 1) colores nuevos y sus cajas */
  for(const l of S.L.filter(x=>x.nuevo)){
    const {data:nv,error}=await sb.from('variantes').insert({sku:'',codigo_master:l.m.codigo,color:l.colCod,descripcion:l.m.descripcion||null,orden:VARS.filter(v=>v.codigo_master===l.m.codigo).length+1,publicado:true}).select().single();
    if(error){toast('No se pudo crear '+l.sku+': '+error.message);continue}
    const filas=l.cajas.map((c,j)=>{const b=c.base||{};return {sku_caja:'',sku:nv.sku,parte:c.parte,piezas:c.piezas,largo_cm:b.largo_cm??null,ancho_cm:b.ancho_cm??null,alto_cm:b.alto_cm??null,peso_bruto:b.peso_bruto??null,peso_neto:b.peso_neto??null,orden:b.orden||j+1}});
    const {data:nk,error:ek}=await sb.from('cajas').insert(filas).select();if(ek){toast('Se creó '+nv.sku+' pero no sus cajas: '+ek.message);continue}
    VARS.push(nv);CAJAS.push(...nk);l.v=nv;l.cajas.forEach((c,j)=>c.sku_caja=(nk.find(k=>k.parte===c.parte)||nk[j]||{}).sku_caja||c.sku_caja);nNuevos++}
  for(const l of S.L.filter(x=>x.v&&x.sinCajas&&x.cajas.length)){const filas=l.cajas.map((c,j)=>{const b=c.base||{};return {sku_caja:'',sku:l.v.sku,parte:c.parte,piezas:c.piezas,largo_cm:b.largo_cm??null,ancho_cm:b.ancho_cm??null,alto_cm:b.alto_cm??null,peso_bruto:b.peso_bruto??null,peso_neto:b.peso_neto??null,orden:b.orden||j+1}});
    const {data:nk,error}=await sb.from('cajas').insert(filas).select();if(error){toast('No se pudieron crear las cajas de '+l.v.sku);l.cajas=[]}else CAJAS.push(...nk)}
  /* 2) piezas por caja que corrige la proforma */
  for(const l of S.L.filter(x=>x.v&&!x.nuevo))for(const c of l.cajas)if(c.antes!=null&&c.antes!==c.piezas){const {error}=await sb.from('cajas').update({piezas:c.piezas}).eq('sku_caja',c.sku_caja);if(!error){const k=CAJAS.find(x=>x.sku_caja===c.sku_caja);if(k)k.piezas=c.piezas;nFix++}}
  /* 3) productos del contenedor */
  const L=S.L.filter(l=>l.v&&l.m&&l.cajas.length),G={};
  L.forEach(l=>{const g=G[l.m.codigo]||(G[l.m.codigo]={q:0,amt:0,cbm:0,cbmOk:true,pz:1,partes:1});g.q+=l.q;g.amt+=l.amt;if(l.cbm!=null)g.cbm+=l.cbm;else g.cbmOk=false;g.pz=Math.max(g.pz,...l.cajas.map(c=>c.piezas));g.partes=Math.max(g.partes,l.cajas.length)});
  for(const [cod,g] of Object.entries(G)){const u={cant:g.q,fob_oc:Math.round(g.amt/g.q*100)/100,...(g.cbmOk&&g.cbm>0?{cbm_oc:Math.round(g.cbm/g.q*10000)/10000}:{})};
    const i=ECO.it.find(x=>x.pedido_id===pe.id&&x.codigo===cod);
    if(i){const {error}=await sb.from('eco_items').update(u).eq('id',i.id);if(error)return toast('No se pudo: '+error.message);Object.assign(i,u)}
    else{const {data,error}=await sb.from('eco_items').insert({pedido_id:pe.id,codigo:cod,...u,orden:ECO.it.filter(x=>x.pedido_id===pe.id).length+1}).select().single();if(error)return toast('No se pudo sumar '+cod+': '+error.message);ECO.it.push(data)}
    /* 4) el Maestro toma lo de la proforma */
    const m=byCod(cod);if(m){const cbm=g.cbmOk&&g.cbm>0?Math.round(g.cbm/g.q*1000)/1000:null;
      const {error:e1}=await sb.rpc('master_packing_desde_orden',{p_codigo:cod,p_origen:org,p_piezas:g.pz,p_cajas:g.partes,p_pack:m.cajas_pack||null,p_cbm:cbm});
      const fob=u.fob_oc;const {error:e2}=fob>0&&+m.fob_usd!==fob?await sb.from('master_productos').update({fob_usd:fob}).eq('codigo',cod):{};
      if(!e1&&!e2){Object.assign(m,{piezas_por_caja:g.pz,cajas_por_unidad:g.partes},cbm!=null?{cbm}:{},fob>0?{fob_usd:fob}:{});nM++}}}
  if(document.getElementById('pfsacar')?.checked){const fuera=ECO.it.filter(i=>i.pedido_id===pe.id&&!G[i.codigo]);if(fuera.length){await sb.from('eco_items').delete().in('id',fuera.map(i=>i.id));ECO.it=ECO.it.filter(i=>!fuera.includes(i))}}
  /* 5) cajas para Pailos: el ingreso de este contenedor pasa a ser lo que dice la proforma */
  const ING=[];L.forEach(l=>l.cajas.forEach(c=>ING.push({pedido_id:pe.id,sku_caja:c.sku_caja,cajas:c.n})));
  await sb.from('eco_ingreso').delete().eq('pedido_id',pe.id);
  if(ING.length){const {error}=await sb.from('eco_ingreso').insert(ING);if(error)return toast('Productos actualizados, pero no se pudieron guardar las cajas: '+error.message)}
  ECO.ing=(ECO.ing||[]).filter(x=>x.pedido_id!==pe.id).concat(ING);
  /* 6) colores que no vienen en ningún contenedor */
  let nOut=0;if(document.getElementById('pfsobran')?.checked)for(const v of S.sobran){
    const K=CAJAS.filter(k=>k.sku===v.sku).map(k=>k.sku_caja);const {count}=K.length?await sb.from('stock_mov').select('id',{count:'exact',head:true}).in('sku_caja',K):{count:0};
    const {error}=!count&&v.estado==='borrador'?await sb.from('variantes').delete().eq('sku',v.sku):{error:true};
    if(error)await sb.from('variantes').update({publicado:false}).eq('sku',v.sku);nOut++}
  /* 7) costos extra y marca de "aplicada" */
  const ext=S.X.filter(x=>x.on).reduce((a,x)=>a+x.amt,0),par=Object.assign({},pe.par||{});
  if(ext>0){if(+par.origenUSD>=ext&&par.consolidacion==null){par.consolidacion=Math.round((+par.origenUSD-ext)*100)/100||null;delete par.origenUSD}par.fleteInterno=ext}
  const tot=S.L.reduce((a,l)=>({q:a.q+l.q,amt:a.amt+l.amt,ctn:a.ctn+(l.ctn||0),cbm:a.cbm+(l.cbm||0)}),{q:0,amt:0,ctn:0,cbm:0});
  par.oc_aplicada={doc:S.doc,nombre:S.nombre,fecha:new Date().toISOString(),lineas:Object.keys(G).length,piezas:tot.q,cajas:tot.ctn,cbm:Math.round(tot.cbm*1000)/1000,fob:Math.round((tot.amt+ext)*100)/100,colores_nuevos:nNuevos,fuera:S.L.length-L.length};
  pe.par=par;await sb.from('eco_pedidos').update({par}).eq('id',pe.id);
  try{await loadSkus();if(typeof loadEnPedido==='function')await loadEnPedido()}catch(e){}
  OCPREV=null;toast(`Proforma aplicada: ${L.length} colores${nNuevos?` (${nNuevos} nuevos)`:''}, ${ING.length} tipos de caja${nFix?`, ${nFix} cajas corregidas`:''}, Maestro actualizado en ${nM}${nOut?`, ${nOut} colores sacados`:''}`);ECO.vista='productos';drawEcoPedido()}

/* se engancha en la pestaña "Orden de compra y proformas" */
if(typeof ocPreparar==='function'){const _op=ocPreparar;ocPreparar=async function(pe,d,blob){
  try{if(!CAJAS.length||!VARS.length||!PAL.length)await loadSkus();if(!master.length||master[0].piezas_por_caja===undefined)await loadMaster();await loadXLSX();const wb=XLSX.read(await blob.arrayBuffer(),{type:'array'});
    for(const n of wb.SheetNames){const A=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true});const R=piSku(A);
      if(R){OCPREV={pe:pe.id,doc:d.id,nombre:d.nombre,modo:'sku',...R};toast(`Proforma por color: ${R.L.length} líneas. Revisala abajo y autorizá.`);return}}}
  catch(e){console.error(e)}
  return _op.apply(this,arguments)}}
const fch=s=>{try{return new Date(s).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'})}catch(e){return ''}};
if(typeof ecoOC==='function'){const _h=ecoOC;ecoOC=function(pe,r){let s;
  if(OCPREV&&OCPREV.pe===pe.id&&OCPREV.modo==='sku'){const k=OCPREV;OCPREV=null;try{s=_h.apply(this,arguments)}finally{OCPREV=k}s=s.replace(/<div id="ocprev">[\s\S]*$/,`<div id="ocprev">${piHtml(pe)}</div>`)}
  else s=_h.apply(this,arguments);
  const a=(pe.par||{}).oc_aplicada;
  s=s.replace(/<b>Usar esta orden<\/b>/g,'<b>Revisar y aplicar</b>');
  if(a&&a.doc!=null)s=s.replace(new RegExp(`(data-ocusar="${a.doc}">)<b>Revisar y aplicar</b>`),`$1Volver a aplicar</button> <span class="pos" style="white-space:nowrap">✓ aplicada el ${fch(a.fecha)}</span><button hidden>`);
  return s}}
if(typeof bindOC==='function'){const _b=bindOC;bindOC=function(pe){const k=OCPREV&&OCPREV.modo==='sku'?OCPREV:null;if(k)OCPREV=null;let r;try{r=_b.apply(this,arguments)}finally{if(k)OCPREV=k}
  if(OCPREV&&OCPREV.pe===pe.id&&OCPREV.modo==='sku'){const m=$('#m');
    m.querySelectorAll('[data-pfs]').forEach(s=>s.onchange=()=>{const l=OCPREV.L[+s.dataset.pfs];l.elegido=s.value||null;drawEcoPedido()});
    m.querySelectorAll('[data-pfx]').forEach(c=>c.onchange=()=>{OCPREV.X[+c.dataset.pfx].on=c.checked;drawEcoPedido()});
    const ok=m.querySelector('#pfok');if(ok)ok.onclick=async()=>{ok.disabled=true;ok.textContent='Aplicando…';await piAplicar(pe)};
    const cc=m.querySelector('#occan');if(cc)cc.onclick=()=>{OCPREV=null;drawEcoPedido()}}
  return r}}
})();
