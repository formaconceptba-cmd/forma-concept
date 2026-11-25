/* ---------- Contenedor: proformas y órdenes de compra del proveedor ----------
   Los archivos quedan guardados en el contenedor (y se ven también en "Órdenes a proveedores").
   "Usar esta orden" lee el Excel de la orden final y actualiza cantidades, FOB y m³ por pieza DEL CONTENEDOR
   (columnas fob_oc / cbm_oc de eco_items). El Maestro no se toca: la orden manda para este pedido. */

/* qué es cada pestaña del contenedor */
const ECO_QUE={
 tablero:'el resumen para decidir. Cuánta plata tenés que poner, cuánto te queda al final y cuánto rinde por año. Sale de los productos, cantidades y precios cargados en las otras pestañas. Acá no se edita nada.',
 oc:'subí acá las proformas y la orden de compra final del proveedor (Excel o PDF). La orden final es la que manda: con "Usar esta orden" se actualizan solas las cantidades, el FOB y los m³ de este contenedor, y todo el resto (costos, precios, tablero) se recalcula.',
 productos:'qué viene en el contenedor. Podés cambiar la cantidad, el m³ por pieza y el FOB por pieza: lo que cambies acá vale sólo para este contenedor (el Maestro queda igual). Los valores en azul son los que vienen de la orden; vacío = el del Maestro.',
 precios:'a cuánto se vende cada producto en la tienda y cuánto margen deja. Si cambiás un precio acá, después lo pasás a la tienda con el botón de esta pantalla.',
 costos:'cómo se arma el costo de cada producto puesto en el galpón: FOB, flete repartido por m³, seguro, aduana, impuestos y gastos. Sirve para ver de dónde sale cada número; no se edita.',
 caja:'mes a mes, cuándo sale y cuándo entra la plata. Muestra el pico de plata que necesitás tener. Si cargás pagos reales (anticipo, saldo, flete), se comparan con lo proyectado.',
 ingreso:'las cajas físicas que llegan, contadas por SKU de caja (una mesa puede venir en 2 cajas: tapa y base). Con esto se arma el packing list que se le manda a Pailos (el depósito) y, cuando el contenedor pasa a "Recibido", esas cajas entran solas al stock. Se completa con la orden final: cuántas cajas de cada cosa vienen. Si arriba aparece "el packing de la orden no coincide con el Maestro", es porque las cajas que cargaste dan otro m³ que el Maestro: la orden manda, podés actualizar el Maestro desde ese aviso.',
 real:'lo que pasó de verdad comparado con lo que se proyectó: ventas, cobros, unidades y lo que te queda. Se llena solo con las ventas de la tienda y los pagos cargados en Caja. Tiene sentido una vez que el contenedor llegó.'};

const OC_TIPOS={orden:'Orden de compra final',proforma:'Proforma',otro:'Otro documento'};
let OCDOCS=null,OCPREV=null;
const ocFecha=d=>new Date(d).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'});
async function ocLoad(){const {data,error}=await sb.from('eco_docs').select('*').order('created_at',{ascending:false});OCDOCS=error?[]:(data||[]);return OCDOCS}

function ecoOC(pe,r){
  const D=(OCDOCS||[]).filter(d=>d.pedido_id===pe.id),ap=(pe.par||{}).oc_aplicada;
  return `${ap?`<div class="card pad" style="margin-bottom:12px;border-left:3px solid #2f6fdf">Este contenedor usa la orden <b>${esc(ap.nombre)}</b> (aplicada el ${ocFecha(ap.fecha)}): ${ap.lineas} producto(s) con cantidad, FOB y m³ de la orden.</div>`:''}
  <div class="card pad" style="margin-bottom:12px"><b>Subir un documento</b>
   <div class="bar" style="margin-top:8px;flex-wrap:wrap"><select id="octipo">${Object.entries(OC_TIPOS).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select><input type="file" id="ocfile" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"><button class="btn dk" id="ocup">Subir</button><span class="hint" id="ocmsg"></span></div>
   <p class="hint" style="margin:6px 0 0">Excel o CSV: se puede leer y aplicar al contenedor. PDF o foto: queda guardado para consulta.</p></div>
  <div class="card wrap"><table><thead><tr><th>Tipo</th><th>Archivo</th><th>Subido</th><th></th></tr></thead><tbody>
  ${OCDOCS==null?'<tr><td colspan="4" class="hint">Cargando…</td></tr>':D.map(d=>`<tr><td><b>${esc(OC_TIPOS[d.tipo]||d.tipo)}</b></td><td>${esc(d.nombre)}</td><td>${ocFecha(d.created_at)}</td><td style="white-space:nowrap"><button class="lnk" data-ocver="${d.id}">Ver</button>${/\.(xlsx|xls|csv)$/i.test(d.nombre)?` · <button class="lnk" data-ocusar="${d.id}"><b>Usar esta orden</b></button>`:''} · <button class="lnk" data-ocdel="${d.id}">Borrar</button></td></tr>`).join('')||'<tr><td colspan="4" class="hint">Todavía no subiste proformas ni órdenes para este contenedor.</td></tr>'}</tbody></table></div>
  <div id="ocprev">${OCPREV&&OCPREV.pe===pe.id?ocPrevHtml(pe):''}</div>`;
}

/* ---- leer el Excel de la orden: mismas reglas que "Importar cotización" del Maestro ---- */
function ocLeer(A,pe){
  let hr=0,best=-1;A.slice(0,25).forEach((r,i)=>{const s=r.filter(c=>String(c).trim()).length+3*r.filter(c=>IMPC.some(([, ,syn])=>syn.some(w=>String(c).toLowerCase().includes(w)))).length;if(s>best){best=s;hr=i}});
  const cols=(A[hr]||[]).map((c,i)=>({i,t:String(c).trim()}));const map={},usada=i=>Object.values(map).includes(i);
  IMPC.forEach(([k,,syn])=>{for(const w of syn){const c=cols.find(c=>c.t&&!usada(c.i)&&c.t.toLowerCase().includes(w));if(c){map[k]=c.i;break}}});
  const filas=[];let fin=false;
  A.slice(hr+1).forEach((r,ix)=>{const g=k=>map[k]!=null?r[map[k]]:'',tx=k=>String(g(k)??'').trim();
    const f={fila:hr+2+ix,cod:tx('cod_proveedor'),desc:tx('descripcion'),fob:pnum(g('fob_usd')),cbm:pnum(g('cbm')),cbmCaja:pnum(g('cbm_caja')),cbmT:pnum(g('cbm_total')),cant:pnum(g('cantidad')),pz:pnum(g('piezas_por_caja')),up:tx('unidad_precio'),k1:parseCaja(tx('caja1_med')),celdas:r.map(c=>String(c||'').trim().toUpperCase())};
    /* fila de continuación (2ª caja de la misma pieza): suma m³ a la anterior */
    if(fin)return;
    /* fila de totales (sin código ni precio pero con cantidad): ahí termina la lista */
    if(!f.cod&&!f.desc&&f.fob==null&&f.cant!=null&&filas.length){fin=true;return}
    if(f.fob==null&&f.cant==null&&!f.k1&&f.cbm==null)return;
    if(!f.cod&&!f.desc&&f.fob==null){const p=filas[filas.length-1];if(p){if(f.cbm!=null)p.cbm=(p.cbm||0)+f.cbm;if(f.cbmT!=null)p.cbmT=(p.cbmT||0)+f.cbmT;if(f.cbmCaja!=null)p.cbmCaja=(p.cbmCaja||0)+f.cbmCaja;if(f.k1)p.k2=f.k1}return}
    if(!f.cod&&!f.desc)return;if(/^(total|subtotal|sum)/i.test(f.desc||f.cod))return;filas.push(f)});
  const enPed=new Set(ECO.it.filter(i=>i.pedido_id===pe.id).map(i=>i.codigo)),prov=(pe.proveedor||'').toUpperCase();
  const lin=filas.map(f=>{
    const pz=Math.max(1,Math.round(f.pz||1)),porCaja=/CAJA|CTN|CARTON|BOX/i.test(f.up);
    const fob=f.fob!=null?Math.round((porCaja&&pz>1?f.fob/pz:f.fob)*100)/100:null;
    const vk=k=>k?k.largo_cm*k.ancho_cm*k.alto_cm/1e6:0;
    let cbm=f.cbmT!=null&&f.cant>0?f.cbmT/f.cant:f.cbm!=null?f.cbm:f.cbmCaja!=null?f.cbmCaja/pz:f.k1?(vk(f.k1)+vk(f.k2))/pz:null;if(cbm!=null)cbm=Math.round(cbm*1000)/1000;
    /* qué producto es: código del proveedor, código FORMA escrito en la fila o la misma descripción */
    const U=s=>String(s||'').trim().toUpperCase();
    let m=f.cod&&master.find(x=>U(x.cod_proveedor)===U(f.cod)&&(!prov||!x.proveedor||U(x.proveedor)===prov))
      ||f.cod&&master.find(x=>U(x.cod_proveedor)===U(f.cod))
      ||master.find(x=>f.celdas.includes(U(x.codigo)))
      /* código FORMA abreviado en la proforma (columna "FC Code": MES-249-LAD → MES-MAD-249-BAI) */
      ||(()=>{for(const c of f.celdas){const k=c.match(/^([A-Z]{3})-(\d{3})\b/);if(!k)continue;const L=master.filter(x=>U(x.codigo).startsWith(k[1]+'-')&&U(x.codigo).includes('-'+k[2]+'-'));if(L.length===1)return L[0]}return null})()
      ||f.desc&&master.find(x=>U(x.descripcion)===U(f.desc))
      /* mismo código con otra letra adelante (C537 / X537): sólo si hay uno solo */
      ||(()=>{const n=String(f.cod||'').replace(/^[A-Z]+/i,'');if(n.length<3)return null;const c=master.filter(x=>String(x.cod_proveedor||'').replace(/^[A-Z]+/i,'').toUpperCase()===n.toUpperCase());return c.length===1?c[0]:null})();
    return {fila:f.fila,cod:f.cod,desc:f.desc,cant:f.cant!=null?Math.round(f.cant):null,fob,cbm,codigo:m?m.codigo:'',enPed:m?enPed.has(m.codigo):false,ok:!!m}});
  return {lin,map:Object.fromEntries(Object.entries(map).map(([k,i])=>[k,(cols.find(c=>c.i===i)||{}).t]))};
}

function ocPrevHtml(pe){const S=OCPREV,it=c=>ECO.it.find(i=>i.pedido_id===pe.id&&i.codigo===c),cat=ecoCatPe(pe);
  const viejo=c=>{const i=it(c),k=cat.find(x=>x.codigo===c)||{};return {cant:i?i.cant:0,fob:k.fob,cbm:k.cbm}};
  const fl=(a,b,d)=>b==null?`<span class="hint">${a??'—'}</span>`:a!=null&&Math.abs(+a-+b)<1e-9?`${eN(b,d)}`:`<span class="hint" style="text-decoration:line-through">${a!=null?eN(a,d):'—'}</span> <b class="ocv">${eN(b,d)}</b>`;
  const sinPed=ECO.it.filter(i=>i.pedido_id===pe.id&&!S.lin.some(l=>l.ok&&l.codigo===i.codigo));
  const det=Object.entries(S.map).filter(([,t])=>t).map(([k,t])=>`${(IMPC.find(x=>x[0]===k)||[])[1]||k} ← "${esc(t)}"`).join(' · ');
  return `<div class="card pad" style="margin-top:14px"><div class="bar" style="margin:0"><b>Vista previa: ${esc(S.nombre)}</b><span class="sp"></span><button class="btn" id="occan">Cancelar</button><button class="btn dk" id="ocok">Aplicar al contenedor</button></div>
   <p class="hint">Columnas que se leyeron: ${det||'ninguna reconocida'}. Tildá lo que querés aplicar. Lo tachado es lo que hay hoy; en azul, lo de la orden.</p>
   <div class="wrap"><table><thead><tr><th></th><th>Fila del archivo</th><th>Producto FORMA</th><th class="n">Cantidad</th><th class="n">FOB u. US$</th><th class="n">m³ u.</th></tr></thead><tbody>
   ${S.lin.map((l,i)=>{const v=l.codigo?viejo(l.codigo):{};return `<tr><td><input type="checkbox" data-ocl="${i}" ${l.ok&&l.on!==false?'checked':''} ${l.codigo?'':'disabled'} style="width:auto"></td><td><b>${esc(l.cod||'—')}</b><div class="hint">${esc((l.desc||'').slice(0,60))} · fila ${l.fila}</div></td>
     <td><input list="ocml" data-occ="${i}" value="${esc(l.codigo)}" placeholder="Elegí el producto…" style="width:190px">${l.codigo&&!l.enPed?'<div class="hint">se suma al contenedor</div>':''}${!l.codigo?'<div class="hint neg">no lo encontré en el Maestro</div>':''}</td>
     <td class="n">${(()=>{const M=S.lin.filter(x=>x.ok&&x.codigo===l.codigo&&x.on!==false);if(M.length<2)return fl(v.cant,l.cant,0);if(M[0]!==l)return `<span class="hint">+${l.cant??'—'} (mismo producto)</span>`;const t=M.reduce((a,x)=>a+(x.cant||0),0);return fl(v.cant,t,0)+`<div class="hint">${M.length} líneas (colores)</div>`})()}</td><td class="n">${fl(v.fob,l.fob,2)}</td><td class="n">${fl(v.cbm,l.cbm,3)}</td></tr>`}).join('')}</tbody></table></div>
   <datalist id="ocml">${master.filter(m=>!m.archivado).map(m=>`<option value="${esc(m.codigo)}">${esc(m.descripcion||'')}</option>`).join('')}</datalist>
   ${sinPed.length?`<label style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="ocsacar" style="width:auto"> Sacar del contenedor lo que no está en la orden (${sinPed.map(i=>esc(i.codigo)).join(', ')})</label>`:''}</div>`}

function bindOC(pe){
  const m=$('#m'),re=()=>drawEcoPedido();
  if(OCDOCS==null){ocLoad().then(re);return}
  m.querySelector('#ocup').onclick=async()=>{const f=m.querySelector('#ocfile').files[0],msg=m.querySelector('#ocmsg');if(!f)return msg.textContent='Elegí el archivo.';
    msg.textContent='Subiendo…';const path=`${pe.id}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g,'_')}`;
    const up=await sb.storage.from('compras').upload(path,f,{upsert:false,contentType:f.type||undefined});if(up.error)return msg.textContent='No se pudo subir: '+up.error.message;
    const {data,error}=await sb.from('eco_docs').insert({pedido_id:pe.id,proveedor:pe.proveedor||null,tipo:m.querySelector('#octipo').value,nombre:f.name,path}).select().single();
    if(error)return msg.textContent='No se pudo guardar: '+error.message;OCDOCS.unshift(data);toast('Documento guardado');
    if(data.tipo==='orden'&&/\.(xlsx|xls|csv)$/i.test(f.name)){await ocPreparar(pe,data,f);}re()};
  m.querySelectorAll('[data-ocver]').forEach(b=>b.onclick=async()=>{const d=OCDOCS.find(x=>x.id===+b.dataset.ocver);const {data,error}=await sb.storage.from('compras').createSignedUrl(d.path,600);if(error)return toast('No se pudo abrir');window.open(data.signedUrl,'_blank')});
  m.querySelectorAll('[data-ocdel]').forEach(b=>b.onclick=async()=>{const d=OCDOCS.find(x=>x.id===+b.dataset.ocdel);if(!confirm(`¿Borrar "${d.nombre}"? El archivo se elimina y no se puede recuperar. Lo que ya aplicaste al contenedor queda como está.`))return;
    await sb.storage.from('compras').remove([d.path]);const {error}=await sb.from('eco_docs').delete().eq('id',d.id);if(error)return toast('No se pudo borrar');OCDOCS=OCDOCS.filter(x=>x!==d);re()});
  m.querySelectorAll('[data-ocusar]').forEach(b=>b.onclick=async()=>{const d=OCDOCS.find(x=>x.id===+b.dataset.ocusar);const {data,error}=await sb.storage.from('compras').download(d.path);if(error)return toast('No se pudo leer el archivo');await ocPreparar(pe,d,data);re()});
  if(!OCPREV||OCPREV.pe!==pe.id)return;
  m.querySelectorAll('[data-ocl]').forEach(c=>c.onchange=()=>{OCPREV.lin[+c.dataset.ocl].on=c.checked});
  m.querySelectorAll('[data-occ]').forEach(c=>c.onchange=()=>{const l=OCPREV.lin[+c.dataset.occ],v=c.value.trim().toUpperCase(),x=master.find(q=>q.codigo===v);l.codigo=x?x.codigo:'';l.ok=!!x;l.on=!!x;l.enPed=x?ECO.it.some(i=>i.pedido_id===pe.id&&i.codigo===x.codigo):false;re()});
  m.querySelector('#occan').onclick=()=>{OCPREV=null;re()};
  m.querySelector('#ocok').onclick=async()=>{const L=OCPREV.lin.filter(l=>l.ok&&l.codigo&&l.on!==false);if(!L.length)return toast('No hay líneas para aplicar');
    /* si la orden trae dos filas del mismo producto (por ejemplo, dos colores), se suman las cantidades */
    const G={};L.forEach(l=>{const g=G[l.codigo]||(G[l.codigo]={codigo:l.codigo,cant:0,fob:l.fob,cbm:l.cbm,hayCant:false});if(l.cant!=null){g.cant+=l.cant;g.hayCant=true}if(g.fob==null)g.fob=l.fob;if(g.cbm==null)g.cbm=l.cbm});
    const sacar=m.querySelector('#ocsacar')?.checked;let n=0;
    for(const g of Object.values(G)){const i=ECO.it.find(x=>x.pedido_id===pe.id&&x.codigo===g.codigo);const u={...(g.hayCant?{cant:g.cant}:{}),...(g.fob!=null?{fob_oc:g.fob}:{}),...(g.cbm!=null?{cbm_oc:g.cbm}:{})};
      if(i){const {error}=await sb.from('eco_items').update(u).eq('id',i.id);if(error)return toast('No se pudo aplicar: '+error.message);Object.assign(i,u)}
      else{const {data,error}=await sb.from('eco_items').insert({pedido_id:pe.id,codigo:g.codigo,cant:g.hayCant?g.cant:1,fob_oc:g.fob,cbm_oc:g.cbm,orden:ECO.it.filter(x=>x.pedido_id===pe.id).length+1}).select().single();if(error)return toast('No se pudo sumar '+g.codigo+': '+error.message);ECO.it.push(data)}n++}
    if(sacar){const fuera=ECO.it.filter(i=>i.pedido_id===pe.id&&!G[i.codigo]);if(fuera.length){await sb.from('eco_items').delete().in('id',fuera.map(i=>i.id));ECO.it=ECO.it.filter(i=>!fuera.includes(i))}}
    pe.par=Object.assign({},pe.par||{},{oc_aplicada:{doc:OCPREV.doc,nombre:OCPREV.nombre,fecha:new Date().toISOString(),lineas:n}});await sb.from('eco_pedidos').update({par:pe.par}).eq('id',pe.id);
    OCPREV=null;toast(`Orden aplicada: ${n} producto(s) actualizados`);ECO.vista='productos';re()};
}
async function ocPreparar(pe,d,blob){
  try{await loadXLSX();const wb=XLSX.read(await blob.arrayBuffer(),{type:'array',raw:/\.csv$/i.test(d.nombre)});const A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:true});
    const R=ocLeer(A,pe);if(!R.lin.length)return toast('No encontré líneas de productos en el archivo');OCPREV={pe:pe.id,doc:d.id,nombre:d.nombre,...R};
    const f=R.lin.filter(l=>!l.ok).length;toast(f?`${R.lin.length} líneas leídas · ${f} sin identificar: elegí el producto a mano`:`${R.lin.length} líneas leídas`)}
  catch(e){toast('No se pudo leer el Excel: '+e.message)}
}

/* ---- "Órdenes a proveedores": todos los documentos, por proveedor ---- */
if(typeof drawCompras==='function'){const _dc=drawCompras;drawCompras=async function(){await _dc.apply(this,arguments);if(tab!=='compras')return;
  const D=await ocLoad();if(!ECO.ped||!ECO.ped.length){try{await ecoLoad()}catch(e){}}
  const nomP=id=>(ECO.ped.find(p=>p.id===id)||{}).nombre||('#'+id),G={};D.forEach(d=>{(G[d.proveedor||'Sin proveedor']=G[d.proveedor||'Sin proveedor']||[]).push(d)});
  const c=document.createElement('div');c.className='card pad';c.style.marginTop='16px';
  c.innerHTML=`<b>Proformas y órdenes de compra recibidas</b><p class="hint">Se suben desde cada contenedor (Importación → Contenedores → "Orden de compra y proformas").</p>${Object.keys(G).length?Object.entries(G).map(([p,L])=>`<h4 style="margin:12px 0 6px">${esc(p)}</h4><div class="wrap"><table><tbody>${L.map(d=>`<tr><td>${esc(OC_TIPOS[d.tipo]||d.tipo)}</td><td>${esc(d.nombre)}</td><td>${esc(nomP(d.pedido_id))}</td><td>${ocFecha(d.created_at)}</td><td><button class="lnk" data-ocv2="${esc(d.path)}">Ver</button></td></tr>`).join('')}</tbody></table></div>`).join(''):'<p class="hint">Todavía no hay documentos.</p>'}`;
  $('#m').appendChild(c);c.querySelectorAll('[data-ocv2]').forEach(b=>b.onclick=async()=>{const {data,error}=await sb.storage.from('compras').createSignedUrl(b.dataset.ocv2,600);if(error)return toast('No se pudo abrir');window.open(data.signedUrl,'_blank')})}}
document.head.insertAdjacentHTML('beforeend','<style>.ocv{color:#2f6fdf!important;font-weight:600}input.ocv{border-color:#2f6fdf!important}.eco-que{margin-bottom:12px;background:#f5f8fe;font-size:13px;line-height:1.5}</style>');
