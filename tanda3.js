/* ---------- Tanda 3: colores con pedido, márgenes por caja completa, pedidos (WhatsApp, devoluciones, facturas, seguimiento),
   alertas, cola de facturas, mails editables, envíos y retiro, roturas por caja ---------- */
let ENPED=new Set(),ALIAS=[],FACT=[],CFGT3={};
const costoV=m=>{if(!m)return null;const c=costo(m.fob_usd,m.cbm);return c==null?null:c*(+m.piezas_por_caja||1)};
const pzM=c=>+((typeof byCod==='function'&&byCod(c))||{}).piezas_por_caja||1;
async function loadEnPedido(){if(!CAJAS.length||!PAL.length)await loadSkus();const {data}=await sb.from('eco_ingreso').select('sku_caja,cajas').gt('cajas',0);const bx=new Set((data||[]).map(x=>x.sku_caja));
  ENPED=new Set(CAJAS.filter(k=>bx.has(k.sku_caja)||((STKC[k.sku_caja]||{}).fisico>0)).map(k=>k.sku))}
const varsDe=id=>VARS.filter(v=>v.codigo_master===id&&v.estado!=='discontinuado');
/* un producto sólo se publica si tiene al menos un color FORMA que esté en un pedido (los nacionales no aplican) */
function puedePublicar(p){if(!p||p.linea==='Nacional')return null;const V=varsDe(p.id);
  if(V.length)return V.some(v=>ENPED.has(v.sku))?null:'Ninguno de sus colores está en un pedido: no se puede publicar.';
  if((p.colores||[]).some(c=>c[0]==='A definir'))return 'Tiene el color "A definir": no se puede publicar.';
  return 'No tiene colores FORMA en ningún pedido (Maestro → Colores y cajas): no se puede publicar.'}

/* ---- Tienda → Productos: colores desde las variantes, y no dejar publicar lo que no está en un pedido ---- */
if(typeof drawProds==='function'){const _dp=drawProds;drawProds=function(){const r=_dp.apply(this,arguments);t3Prods();return r}}
async function t3Prods(){await loadEnPedido();const m=$('#m');if(!m)return;
  m.querySelectorAll('tr[data-id]').forEach(tr=>{const p=prods.find(x=>x.id===tr.dataset.id);if(!p)return;const td=tr.querySelector('td.colc'),V=varsDe(p.id);
    if(td&&V.length){const en=V.filter(v=>ENPED.has(v.sku)),fuera=V.filter(v=>!ENPED.has(v.sku));
      td.outerHTML=`<td><div class="sw">${V.map(v=>`<i title="${esc(colNom(v.color))}${ENPED.has(v.sku)?'':' · no está en ningún pedido'}" style="background:${esc(colHex(v.color))};${ENPED.has(v.sku)?'':'opacity:.25'}"></i>`).join('')}</div><div class="hint">${en.map(v=>esc(colNom(v.color))).join(', ')||'—'}</div>${fuera.length?`<div class="hint neg">Sin pedido (no se muestran): ${fuera.map(v=>esc(colNom(v.color))).join(', ')}</div>`:''}<button class="lnk" data-vcol="${esc(p.id)}">Colores y cajas</button></td>`}
    else if(td&&p.linea!=='Nacional')td.insertAdjacentHTML('beforeend','<div class="hint neg">Nombres viejos: no son colores FORMA</div>');
    const ck=tr.querySelector('[data-f="activo"]');
    if(ck)tr.addEventListener('change',e=>{if(e.target!==ck||!ck.checked)return;const why=puedePublicar(p);if(why){e.stopPropagation();ck.checked=false;toast(why)}},true)});
  m.querySelectorAll('[data-vcol]').forEach(b=>b.onclick=()=>abrirVariantes(b.dataset.vcol));
  const mal=prods.filter(p=>p.activo&&puedePublicar(p));
  if(mal.length)m.insertAdjacentHTML('afterbegin',`<div class="card pad ibad" style="margin-bottom:12px"><b>${mal.length} producto${mal.length>1?'s':''} publicado${mal.length>1?'s':''} sin colores en un pedido</b><p class="hint" style="margin:4px 0 0">${mal.map(p=>esc(p.tipo+' '+p.nombre)+' ('+esc(p.id)+')').join(' · ')}. Cargales los colores FORMA desde Maestro → Colores y cajas, o despublicalos.</p></div>`)}

/* el selector de colores de la tienda y de profesionales ofrece sólo la paleta FORMA */
if(typeof palette==='function'){const _pal=palette;palette=function(){return PAL.length?new Map(PAL.filter(c=>c.activo).map(c=>[c.nombre,c.hex||'#cfc8bd'])):_pal()}}

/* ---- Colores FORMA: equivalencias con los nombres viejos ---- */
if(typeof drawPaleta==='function'){const _pa=drawPaleta;drawPaleta=async function(){await _pa.apply(this,arguments);await pintarAlias()}}
async function pintarAlias(){const {data}=await sb.from('colores_alias').select('*').order('nombre');ALIAS=data||[];if(!prods.length)await loadProds();
  const uso=n=>prods.filter(p=>(p.colores||[]).some(c=>c[0]===n)).map(p=>p.nombre);
  $('#m').insertAdjacentHTML('beforeend',`<div class="card pad" style="margin-top:16px"><h4>Equivalencias con los nombres viejos de la tienda</h4>
   <p class="hint" style="max-width:820px">La paleta FORMA manda: su código va en el SKU y en la caja de Pailos. Acá se traduce cada nombre viejo a un código. Las sugerencias son por cercanía de tono: revisalas y tildá <b>Confirmado</b>. "A definir" nunca se publica.</p>
   <div class="wrap"><table><thead><tr><th>Nombre viejo</th><th>Equivale a</th><th>Nota</th><th>Confirmado</th><th>Productos que lo usan</th></tr></thead><tbody>
   ${ALIAS.map(a=>`<tr><td><b>${esc(a.nombre)}</b></td><td><select data-alc="${esc(a.nombre)}"><option value="">— sin equivalente —</option>${PAL.map(c=>`<option value="${c.codigo}" ${c.codigo===a.codigo?'selected':''}>${c.codigo} · ${esc(c.nombre)}</option>`).join('')}</select></td>
    <td><input data-aln="${esc(a.nombre)}" value="${esc(a.nota||'')}" style="min-width:200px"></td><td><input type="checkbox" data-alk="${esc(a.nombre)}" ${a.confirmado?'checked':''} style="width:auto"></td><td class="hint">${uso(a.nombre).map(esc).join(', ')||'—'}</td></tr>`).join('')}</tbody></table></div>
   <div class="bar" style="margin-top:10px"><span class="hint">Aplicar reemplaza en la tienda y en el catálogo profesional los nombres viejos <b>confirmados</b> por el nombre FORMA. Los productos con colores cargados en Colores y cajas ya usan la paleta FORMA.</span><span class="sp"></span><button class="btn dk" id="alap">Aplicar equivalencias confirmadas</button></div></div>`);
  const up=async(n,k,v)=>{const {error}=await sb.from('colores_alias').update({[k]:v}).eq('nombre',n);toast(error?'No se pudo guardar':'Guardado');const a=ALIAS.find(x=>x.nombre===n);if(a)a[k]=v};
  $('#m').querySelectorAll('[data-alc]').forEach(s=>s.onchange=()=>up(s.dataset.alc,'codigo',s.value||null));
  $('#m').querySelectorAll('[data-aln]').forEach(i=>i.onchange=()=>up(i.dataset.aln,'nota',i.value.trim()||null));
  $('#m').querySelectorAll('[data-alk]').forEach(i=>i.onchange=()=>up(i.dataset.alk,'confirmado',i.checked));
  $('#alap').onclick=async()=>{const M=Object.fromEntries(ALIAS.filter(a=>a.confirmado&&a.codigo).map(a=>[a.nombre,PAL.find(c=>c.codigo===a.codigo)]));if(!Object.keys(M).length)return toast('No hay equivalencias confirmadas');
    if(!confirm(`Se reemplazan ${Object.keys(M).length} nombres viejos por su color FORMA en la tienda y en el catálogo profesional. ¿Seguimos?`))return;
    let n=0;for(const p of prods){const cs=p.colores||[];if(!cs.some(c=>M[c[0]]))continue;const nu=[];cs.forEach(c=>{const f=M[c[0]];const x=f?[f.nombre,f.hex||c[1]]:c;if(!nu.some(y=>y[0]===x[0]))nu.push(x)});const {error}=await sb.from('products').update({colores:nu}).eq('id',p.id);if(!error){p.colores=nu;n++}}
    const {data:cp}=await sb.from('catalogo_pro').select('codigo,colores');for(const c of cp||[]){if(!c.colores)continue;const ns=String(c.colores).split(',').map(s=>s.trim()).filter(Boolean);if(!ns.some(s=>M[s]))continue;const t=[...new Set(ns.map(s=>M[s]?M[s].nombre:s))].join(', ');const {error}=await sb.from('catalogo_pro').update({colores:t}).eq('codigo',c.codigo);if(!error)n++}
    toast(`Listo: ${n} productos actualizados`);drawPaleta()}}

/* ---- Pedidos: WhatsApp, seguimiento de Pailos, devolución y estado de la factura ---- */
if(typeof drawOrders==='function'){const _do=drawOrders;drawOrders=function(){const r=_do.apply(this,arguments);t3Orders();return r}}
const waNum=t=>{let d=String(t||'').replace(/\D/g,'');if(!d)return '';if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('0'))d=d.slice(1);if(d.startsWith('54'))d=d.slice(2);if(d.startsWith('9'))d=d.slice(1);d=d.replace(/^(\d{2,4})15(\d{6,8})$/,'$1$2');return '549'+d};
const WAMSG={pendiente:o=>`Hola ${o.nombre.split(' ')[0]}! Te escribimos de FORMA Concept por tu pedido #${o.id}. ¿Pudiste hacer la transferencia? Cualquier duda te ayudamos.`,pagado:o=>`Hola ${o.nombre.split(' ')[0]}! Recibimos el pago de tu pedido #${o.id}. Te escribimos para coordinar la entrega: ¿qué día y horario te queda cómodo?`,en_camino:o=>`Hola ${o.nombre.split(' ')[0]}! Tu pedido #${o.id} ya salió.${o.tracking_envio?' Seguimiento: '+o.tracking_envio:''}`,entregado:o=>`Hola ${o.nombre.split(' ')[0]}! ¿Llegó todo bien con tu pedido #${o.id}? Cualquier cosa avisanos.`,cancelado:o=>`Hola ${o.nombre.split(' ')[0]}! Te escribimos por tu pedido #${o.id} de FORMA Concept.`};
const FEST={pendiente:'pendiente de CAE',emitida:'emitida',error:'error',manual:'emitida a mano',anulada:'anulada'};
async function t3Orders(){const m=$('#m');if(!m||!m.querySelector('select[data-o]'))return;
  const {data}=await sb.from('facturas').select('*');FACT=data||[];
  const th=m.querySelector('table thead tr');if(th&&!th.querySelector('[data-t3]'))th.insertAdjacentHTML('beforeend','<th data-t3>Factura · acciones</th>');
  m.querySelectorAll('select[data-o]').forEach(s=>{const o=orders.find(x=>x.id===+s.dataset.o);if(!o)return;const tr=s.closest('tr');
    const fs=FACT.filter(f=>f.order_id===o.id).map(f=>`<div class="hint ${f.estado==='error'?'neg':''}">${f.tipo==='NC-B'?'Nota de crédito':'Factura B'}: ${FEST[f.estado]||f.estado}${f.numero?' · '+String(f.pto_vta||'').padStart(4,'0')+'-'+String(f.numero).padStart(8,'0'):''}</div>`).join('');
    const tel=waNum(o.telefono),msg=(WAMSG[o.estado]||WAMSG.cancelado)({...o,nombre:o.nombre||''});
    tr.insertAdjacentHTML('beforeend',`<td style="white-space:nowrap">${fs||'<div class="hint">sin factura</div>'}${o.dni?`<div class="hint">DNI ${esc(o.dni)}</div>`:''}${o.bultos?`<div class="hint">${o.bultos} bulto${o.bultos>1?'s':''}</div>`:''}${o.tracking_envio?`<div class="hint">Seguimiento: ${esc(o.tracking_envio)}</div>`:''}
      ${tel?`<a class="lnk" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(msg)}">WhatsApp</a>`:''}${['pagado','en_camino','entregado','cancelado'].includes(o.estado)?` · <button class="lnk" data-dev="${o.id}">Devolución</button>`:''}</td>`)});
  /* cambio de estado: al pasar a "en camino" pide el seguimiento de Pailos */
  m.querySelectorAll('select[data-o]').forEach(s=>s.onchange=async()=>{const id=+s.dataset.o,o=orders.find(x=>x.id===id),est=s.value;let tr_=null;
    if(est==='en_camino'){tr_=prompt('Código de seguimiento o datos del envío de Pailos (opcional):',o.tracking_envio||'');if(tr_===null){s.value=o.estado;return}}
    if(est==='cancelado'&&!confirm(`¿Cancelar el pedido #${id}?${FACT.some(f=>f.order_id===id&&f.tipo==='B'&&['emitida','manual'].includes(f.estado))?' Ya tiene factura: se genera la nota de crédito en la cola.':''}`)){s.value=o.estado;return}
    const {data:{session}}=await sb.auth.getSession();const rr=await fetch('/api/estado',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({id,estado:est,...(tr_?{tracking_envio:tr_}:{})})});const dd=await rr.json().catch(()=>({}));
    if(!rr.ok){toast(dd.error||'No se pudo cambiar el estado');s.value=o.estado;return}
    o.estado=est;if(tr_)o.tracking_envio=tr_;toast(dd.mail?'Estado actualizado y le avisamos al cliente por mail':'Estado actualizado');drawOrders()});
  m.querySelectorAll('[data-dev]').forEach(b=>b.onclick=()=>abrirDevolucion(orders.find(x=>x.id===+b.dataset.dev)))}
async function abrirDevolucion(o){const {data:prev}=await sb.from('devoluciones').select('*').eq('order_id',o.id).order('created_at');
  const d=document.createElement('dialog');d.style.maxWidth='620px';document.body.appendChild(d);
  d.innerHTML=`<div class="dh"><h2>Devolución · pedido #${o.id}</h2><button class="btn" data-x>Cerrar</button></div><div class="db">
   <p class="hint">La transferencia de vuelta la hacés vos desde el banco o Mercado Pago. Acá queda registrada. Si cancelás el pedido y ya tenía factura, la nota de crédito entra sola en la cola de facturas.</p>
   ${(prev||[]).length?`<div class="card pad" style="margin-bottom:10px"><b>Ya registradas</b>${prev.map(x=>`<div class="hint">${new Date(x.created_at).toLocaleDateString('es-AR')} · ${ars(x.monto)} · ${esc(x.motivo)}${x.transferida_at?' · transferida el '+x.transferida_at:' · falta transferir'}${x.referencia?' · '+esc(x.referencia):''}</div>`).join('')}</div>`:''}
   <label>Motivo</label><select id="dvm"><option>Arrepentimiento</option><option>Producto dañado</option><option>No llegó / demora</option><option>Error en el pedido</option><option>Sin stock</option><option>Otro</option></select>
   <label style="margin-top:8px">Monto a devolver (ARS)</label><input id="dva" class="num" value="${Math.round(o.total)}" inputmode="numeric">
   <label style="margin-top:8px">Fecha en que transferiste (vacío si todavía no)</label><input id="dvf" type="date">
   <label style="margin-top:8px">Referencia de la transferencia</label><input id="dvr" placeholder="N° de operación">
   <label style="margin-top:8px">Nota</label><input id="dvn">
   ${o.estado!=='cancelado'?`<label style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="dvc" style="width:auto" checked> Cancelar el pedido (genera la nota de crédito si ya estaba facturado)</label>`:''}
   <div class="bar" style="margin-top:14px"><span class="sp"></span><button class="btn dk" id="dvok">Registrar devolución</button></div></div>`;
  d.querySelector('[data-x]').onclick=()=>{d.close();d.remove()};
  d.querySelector('#dvok').onclick=async()=>{const monto=Math.round(pnum(d.querySelector('#dva').value)||0);if(!(monto>0))return toast('Poné el monto');
    const {error}=await sb.from('devoluciones').insert({order_id:o.id,motivo:d.querySelector('#dvm').value,monto,transferida_at:d.querySelector('#dvf').value||null,referencia:d.querySelector('#dvr').value.trim()||null,nota:d.querySelector('#dvn').value.trim()||null});
    if(error)return toast('No se pudo registrar');
    const c=d.querySelector('#dvc');if(c&&c.checked){const {data:{session}}=await sb.auth.getSession();await fetch('/api/estado',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({id:o.id,estado:'cancelado'})});o.estado='cancelado'}
    toast('Devolución registrada');d.close();d.remove();drawOrders()};
  d.showModal()}

/* ---- Contenedor → Ingreso: roturas por caja (se descuentan del stock) ---- */
if(typeof bindIngreso==='function'){const _bi=bindIngreso;bindIngreso=function(pe,r){_bi.apply(this,arguments);if(!['recibido','cerrado'].includes(pe.estado))return;
  const tb=[...$('#m').querySelectorAll('#ebody table')].pop();if(!tb)return;const hr=tb.querySelector('thead tr');if(hr)hr.insertAdjacentHTML('beforeend','<th>Roturas</th>');
  tb.querySelectorAll('tbody tr').forEach(tr=>{const inp=tr.querySelector('[data-ing]');if(!inp){tr.insertAdjacentHTML('beforeend','<td></td>');return}tr.insertAdjacentHTML('beforeend',`<td><button class="lnk" data-rot="${esc(inp.dataset.ing)}">Cargar rotura</button></td>`)});
  tb.querySelectorAll('[data-rot]').forEach(b=>b.onclick=async()=>{const k=CAJAS.find(x=>x.sku_caja===b.dataset.rot);const n=Math.round(pnum(prompt(`¿Cuántas cajas de ${k.sku_caja} llegaron rotas?`)||'')||0);if(!(n>0))return;const nota=prompt('Detalle (opcional):')||null;
    const {error}=await sb.from('stock_mov').insert({sku_caja:k.sku_caja,piezas:-n*k.piezas,motivo:'rotura',ref:'pedido:'+pe.id,nota});toast(error?'No se pudo registrar':`Rotura registrada: −${n*k.piezas} piezas de ${k.sku_caja}`);await loadSkus()})}}

/* ---- pantallas nuevas ---- */
GRUPOS[0][2].push(['alertas','Alertas']);
GRUPOS[1][2].push(['facturas','Facturas'],['mails','Mails a clientes'],['envios','Envíos y retiro']);
const T3={alertas:()=>drawAlertas(),facturas:()=>drawFacturas(),mails:()=>drawMails(),envios:()=>drawEnvios()};
if(typeof draw==='function'){const _d=draw;draw=async function(){if(T3[tab]){drawNav();$('#m').innerHTML='<p class="hint">Cargando…</p>';return T3[tab]()}if(['pro','pprecios','productos'].includes(tab)&&!PAL.length)await loadSkus();return _d.apply(this,arguments)}}
async function loadCfgT(){const {data}=await sb.from('config_tienda').select('*');CFGT3=Object.fromEntries((data||[]).map(x=>[x.key,x.value]))}
const autH=async()=>{const {data:{session}}=await sb.auth.getSession();return {'Content-Type':'application/json',Authorization:'Bearer '+session.access_token}};

async function drawAlertas(){
  await Promise.all([loadProds(),loadCfgT(),loadEnPedido(),master.length?null:loadMaster(),typeof ecoLoad==='function'?ecoLoad():null]);
  const [{data:os},{data:fs},{data:ct}]=await Promise.all([sb.from('orders').select('id,estado,created_at,nombre,total,medio_pago,despachado_at,tracking_envio'),sb.from('facturas').select('id,order_id,tipo,estado,error'),sb.from('cobro_transf').select('horas').eq('id',1).maybeSingle()]);
  const horas=(ct&&ct.horas)||48,dDesp=+CFGT3.alerta_dias_despacho||5,ahora=Date.now(),A=[];
  const venc=(os||[]).filter(o=>o.estado==='pendiente'&&ahora-new Date(o.created_at)>horas*3600e3);
  if(venc.length)A.push({g:'bad',t:`${venc.length} pedido${venc.length>1?'s':''} sin pagar pasaron las ${horas} h: ${venc.map(o=>'#'+o.id).join(', ')}. Se cancelan solos todos los días a las 10; podés hacerlo ahora.`,b:'<button class="btn" id="alvc">Cancelar vencidos ahora</button>'});
  const quieto=(os||[]).filter(o=>o.estado==='en_camino'&&o.despachado_at&&ahora-new Date(o.despachado_at)>dDesp*864e5);
  if(quieto.length)A.push({g:'warn',t:`${quieto.length} pedido${quieto.length>1?'s':''} despachado${quieto.length>1?'s':''} hace más de ${dDesp} días sin pasar a entregado: ${quieto.map(o=>'#'+o.id+' ('+esc(o.nombre||'')+')').join(', ')}.`});
  const sinCae=(fs||[]).filter(f=>['pendiente','error'].includes(f.estado));
  if(sinCae.length)A.push({g:sinCae.some(f=>f.estado==='error')?'bad':'warn',t:`${sinCae.length} factura${sinCae.length>1?'s':''} sin CAE${sinCae.some(f=>f.estado==='error')?' (con error de ARCA)':''}: pedidos ${sinCae.map(f=>'#'+f.order_id).join(', ')}.`,b:'<button class="btn" data-go="facturas">Ver facturas</button>'});
  const neg=Object.values(STKC).filter(s=>s.fisico<0);
  if(neg.length)A.push({g:'bad',t:`Stock negativo en ${neg.length} caja${neg.length>1?'s':''}: ${neg.map(s=>s.sku_caja+' ('+s.fisico+')').join(', ')}. Revisá contra el conteo de Pailos.`,b:'<button class="btn" data-go="stock">Stock Pailos</button>'});
  const sinStock=prods.filter(p=>p.activo&&STKA[p.id]&&STKA[p.id].disponible<=0);
  if(sinStock.length)A.push({g:'warn',t:`Publicado${sinStock.length>1?'s':''} sin stock: ${sinStock.map(p=>esc(p.tipo+' '+p.nombre)).join(', ')}.`,b:'<button class="btn" data-go="productos">Productos</button>'});
  const sinCol=prods.filter(p=>p.activo&&puedePublicar(p));
  if(sinCol.length)A.push({g:'bad',t:`Publicado${sinCol.length>1?'s':''} con colores que no están en ningún pedido: ${sinCol.map(p=>esc(p.tipo+' '+p.nombre)).join(', ')}.`,b:'<button class="btn" data-go="productos">Productos</button>'});
  if(typeof ECO!=='undefined'&&ECO.ped)ECO.ped.forEach(pe=>{try{const r=ecoCalc(pe);if(r.sobra>0)A.push({g:'bad',t:`${esc(pe.nombre)} no entra en el contenedor: ${eN(r.cbm)} m³ en ${eN(r.capacidad,0)} m³ (${Math.round(r.ocupacion*100)}%). Sobran ${eN(r.sobra)} m³.`,b:'<button class="btn" data-go="eco">Contenedores</button>'})}catch(e){}});
  const pk=master.filter(m=>!m.archivado&&typeof alertasM==='function'&&alertasM(m).some(a=>a.g==='bad'));
  if(pk.length)A.push({g:'warn',t:`${pk.length} producto${pk.length>1?'s':''} del Maestro con alertas de packing o m³.`,b:'<button class="btn" data-go="maestro">Maestro</button>'});
  A.push({g:'info',t:'Diferencias de stock contra Pailos: se calculan solas cuando esté la conexión con Pailos. Mientras tanto, importá su conteo en Stock Pailos y el panel te muestra la diferencia antes de aplicarla.'});
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Alertas</b><span class="sp"></span><span class="hint">${A.filter(a=>a.g==='bad').length} graves · ${A.filter(a=>a.g==='warn').length} para revisar</span></div>
   ${A.map(a=>`<div class="card pad ${a.g==='bad'?'ibad':a.g==='warn'?'iwarn':''}" style="margin-bottom:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:240px">${a.t}</span>${a.b||''}</div>`).join('')}
   <p class="hint">Plazo para avisar despachos sin movimiento: <input id="aldd" class="num" style="width:50px" value="${dDesp}"> días.</p>`;
  $('#m').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;draw()});
  const vc=$('#alvc');if(vc)vc.onclick=async()=>{vc.disabled=true;const r=await fetch('/api/vencidos',{method:'POST',headers:await autH()});const d=await r.json().catch(()=>({}));toast(r.ok?`Cancelados: ${d.cancelados} · mails: ${d.mails}`:(d.error||'No se pudo'));drawAlertas()};
  $('#aldd').onchange=async e=>{await sb.from('config_tienda').upsert({key:'alerta_dias_despacho',value:String(Math.max(1,Math.round(pnum(e.target.value)||5)))});toast('Guardado');drawAlertas()};
}

async function drawFacturas(){
  const {data}=await sb.from('facturas').select('*,orders(nombre,dni,email,created_at)').order('created_at',{ascending:false}).limit(300);FACT=data||[];
  const pend=FACT.filter(f=>['pendiente','error'].includes(f.estado));
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Facturas</b></div>
   <div class="card pad iwarn"><b>Conexión con ARCA: pendiente.</b> Cada pedido pagado entra solo a esta cola como <b>Factura B</b>, y cada pedido facturado que se cancela genera su <b>nota de crédito</b>. Cuando tengas el certificado de ARCA (CUIT, punto de venta y certificado digital) se conecta y salen solas, con reintentos y el error exacto si ARCA rechaza. Mientras tanto podés emitirlas en el portal de ARCA y cargar acá el número y el CAE.</div>
   <div class="kps">${[['Pendientes de CAE',pend.length],['Con error',FACT.filter(f=>f.estado==='error').length],['Emitidas',FACT.filter(f=>['emitida','manual'].includes(f.estado)).length]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
   <div class="card wrap"><table><thead><tr><th>Pedido</th><th>Tipo</th><th>Cliente</th><th class="n">Total</th><th>Estado</th><th>Número · CAE</th><th></th></tr></thead><tbody>
   ${FACT.map(f=>`<tr><td><b>#${f.order_id}</b><div class="hint">${new Date(f.created_at).toLocaleDateString('es-AR')}</div></td><td>${f.tipo==='NC-B'?'Nota de crédito B':'Factura B'}</td><td>${esc((f.orders||{}).nombre||'')}<div class="hint">DNI ${esc((f.orders||{}).dni||'—')}</div></td><td class="n">${ars(f.total)}</td>
    <td class="${f.estado==='error'?'neg':''}">${FEST[f.estado]||f.estado}${f.intentos?`<div class="hint">${f.intentos} intento${f.intentos>1?'s':''}</div>`:''}${f.error?`<div class="hint neg">${esc(f.error)}</div>`:''}</td>
    <td>${f.numero?`${String(f.pto_vta||'').padStart(4,'0')}-${String(f.numero).padStart(8,'0')}<div class="hint">CAE ${esc(f.cae||'')}</div>`:'—'}</td>
    <td style="white-space:nowrap">${['pendiente','error'].includes(f.estado)?`<button class="lnk" data-fm="${f.id}">Cargar emitida a mano</button>`:''}${f.estado==='error'?` · <button class="lnk" data-fr="${f.id}">Reintentar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="hint">Todavía no hay facturas. Entran solas cuando un pedido pasa a pagado.</td></tr>'}</tbody></table></div>`;
  $('#m').querySelectorAll('[data-fm]').forEach(b=>b.onclick=async()=>{const f=FACT.find(x=>x.id===+b.dataset.fm);const pv=prompt('Punto de venta:','1');if(pv===null)return;const n=prompt('Número de comprobante:');if(!n)return;const cae=prompt('CAE (opcional):')||null;
    const {error}=await sb.from('facturas').update({estado:'manual',pto_vta:+pv||null,numero:+String(n).replace(/\D/g,'')||null,cae,error:null,emitida_at:new Date().toISOString()}).eq('id',f.id);toast(error?'No se pudo guardar':'Guardada');drawFacturas()});
  $('#m').querySelectorAll('[data-fr]').forEach(b=>b.onclick=async()=>{await sb.from('facturas').update({estado:'pendiente',proximo_intento:new Date().toISOString()}).eq('id',+b.dataset.fr);toast('Vuelve a la cola');drawFacturas()})}

const MVARS={recibido_transf:['nombre','pedido','total','horas','datos_transferencia','detalle'],pagado:['nombre','pedido','total','detalle'],en_camino:['nombre','pedido','seguimiento'],entregado:['nombre','pedido'],vencido:['nombre','pedido','horas']};
async function drawMails(){
  const {data}=await sb.from('mail_plantillas').select('*').order('orden');const L=data||[];
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Mails a clientes</b></div>
   <p class="hint" style="max-width:820px">Se mandan solos. El primer párrafo es el título del mail; separá los párrafos con una línea en blanco. Las palabras entre llaves se completan solas, por ejemplo {nombre} o {pedido}. Si un mail está apagado, no sale. Los mails salen de hola@formaconceptba.com: el dominio ya está verificado (DKIM y DMARC configurados).</p>
   ${L.map(p=>`<div class="card pad" style="margin-bottom:12px"><div class="bar" style="margin:0 0 8px"><b>${esc(p.nombre)}</b><span class="sp"></span><label style="margin:0;white-space:nowrap"><input type="checkbox" data-ma="${p.clave}" ${p.activo?'checked':''} style="width:auto"> Se manda</label></div>
     <label>Asunto</label><input data-ms="${p.clave}" value="${esc(p.asunto)}"><label style="margin-top:8px">Texto</label><textarea data-mc="${p.clave}" rows="7" style="width:100%;font:inherit">${esc(p.cuerpo)}</textarea>
     <div class="hint">Podés usar: ${(MVARS[p.clave]||[]).map(v=>'{'+v+'}').join(' ')}</div><div class="bar" style="margin-top:8px"><span class="sp"></span><button class="btn dk" data-mg="${p.clave}">Guardar</button></div></div>`).join('')}`;
  $('#m').querySelectorAll('[data-ma]').forEach(i=>i.onchange=async()=>{const {error}=await sb.from('mail_plantillas').update({activo:i.checked,updated_at:new Date().toISOString()}).eq('clave',i.dataset.ma);toast(error?'No se pudo':'Guardado')});
  $('#m').querySelectorAll('[data-mg]').forEach(b=>b.onclick=async()=>{const k=b.dataset.mg;const as=$(`[data-ms="${k}"]`).value.trim(),cu=$(`[data-mc="${k}"]`).value.trim();if(!as||!cu)return toast('Asunto y texto no pueden quedar vacíos');
    const {error}=await sb.from('mail_plantillas').update({asunto:as,cuerpo:cu,updated_at:new Date().toISOString()}).eq('clave',k);toast(error?'No se pudo guardar':'Guardado')})}

async function drawEnvios(){
  await loadCfgT();const [{data:tf},{data:ct}]=await Promise.all([sb.from('envio_tarifas').select('*').order('orden'),sb.from('cobro_transf').select('horas').eq('id',1).maybeSingle()]);const T=tf||[];
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Envíos y retiro</b></div>
   <div class="card pad" style="margin-bottom:12px"><h4>Retiro en depósito (Lanús)</h4><p class="hint">Se muestra en el checkout como opción sin costo.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px"><div><label>Dirección</label><input data-cf="retiro_dir" value="${esc(CFGT3.retiro_dir||'')}" placeholder="Calle 123, Lanús"></div><div><label>Horario</label><input data-cf="retiro_horario" value="${esc(CFGT3.retiro_horario||'')}" placeholder="Lunes a viernes de 9 a 16"></div><div><label>Aviso</label><input data-cf="retiro_nota" value="${esc(CFGT3.retiro_nota||'')}"></div></div></div>
   <div class="card pad" style="margin-bottom:12px"><h4>Reserva de stock</h4><p class="hint">El stock se reserva cuando el cliente confirma el checkout, y dura lo que diga "Horas para pagar" (hoy <b>${(ct&&ct.horas)||48} h</b>, se cambia en Precios y reglas). Si vence, el pedido se cancela solo todos los días y se libera. Si dos clientes reservan la última unidad al mismo tiempo, el segundo recibe un aviso y no se le cobra. El precio queda congelado en el pedido.</p></div>
   <div class="card pad"><h4>Costo de envío por volumen</h4><p class="hint" style="max-width:820px">Esperando las tarifas de Pailos. Se cotiza por m³ (la mercadería es voluminosa y liviana): m³ de las cajas del pedido × precio por m³ de la zona, con un mínimo. Mientras esté apagado, el checkout sigue como hoy (envío gratis en CABA y GBA, express y a cotizar en el interior).</p>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="evon" ${CFGT3.envio_m3_activo==='1'?'checked':''} style="width:auto"> Cobrar el envío por volumen con estas tarifas</label>
    <div class="wrap"><table><thead><tr><th>Zona</th><th>Nombre</th><th class="n">CP desde</th><th class="n">CP hasta</th><th class="n">$ por m³</th><th class="n">Mínimo $</th><th>Activa</th><th></th></tr></thead><tbody>
    ${T.map(t=>`<tr><td><b>${esc(t.zona)}</b></td>${['nombre','desde_cp','hasta_cp','precio_m3','minimo'].map(k=>`<td class="${k==='nombre'?'':'n'}"><input data-tz="${esc(t.zona)}|${k}" class="${k==='nombre'?'':'num n'}" style="width:${k==='nombre'?'160':'90'}px" value="${t[k]??''}"></td>`).join('')}<td><input type="checkbox" data-ta="${esc(t.zona)}" ${t.activo?'checked':''} style="width:auto"></td><td><button class="lnk" data-td="${esc(t.zona)}">Borrar</button></td></tr>`).join('')||'<tr><td colspan="8" class="hint">Sin tarifas cargadas.</td></tr>'}</tbody></table></div>
    <div class="bar" style="margin-top:8px;gap:8px"><input id="tzn" placeholder="Código de zona (ej. CABA)" style="width:180px"><button class="btn" id="tzadd">+ Zona</button></div></div>`;
  $('#m').querySelectorAll('[data-cf]').forEach(i=>i.onchange=async()=>{const {error}=await sb.from('config_tienda').upsert({key:i.dataset.cf,value:i.value.trim()});toast(error?'No se pudo guardar':'Guardado')});
  $('#evon').onchange=async e=>{if(e.target.checked&&!T.some(t=>t.activo&&t.precio_m3!=null)){e.target.checked=false;return toast('Primero cargá al menos una zona con precio por m³')}if(e.target.checked&&!confirm('El checkout va a empezar a cobrar el envío con estas tarifas. ¿Seguimos?')){e.target.checked=false;return}
    const {error}=await sb.from('config_tienda').upsert({key:'envio_m3_activo',value:e.target.checked?'1':'0'});toast(error?'No se pudo':'Guardado')};
  $('#m').querySelectorAll('[data-tz]').forEach(i=>i.onchange=async()=>{const [z,k]=i.dataset.tz.split('|');const v=k==='nombre'?i.value.trim():pnum(i.value);const {error}=await sb.from('envio_tarifas').update({[k]:v}).eq('zona',z);toast(error?'No se pudo':'Guardado')});
  $('#m').querySelectorAll('[data-ta]').forEach(i=>i.onchange=async()=>{await sb.from('envio_tarifas').update({activo:i.checked}).eq('zona',i.dataset.ta);toast('Guardado')});
  $('#m').querySelectorAll('[data-td]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Borrar la zona '+b.dataset.td+'?'))return;await sb.from('envio_tarifas').delete().eq('zona',b.dataset.td);drawEnvios()});
  $('#tzadd').onclick=async()=>{const z=$('#tzn').value.trim().toUpperCase();if(!z)return;const {error}=await sb.from('envio_tarifas').insert({zona:z,nombre:z,desde_cp:1000,hasta_cp:1499,orden:T.length+1});if(error)return toast('No se pudo (¿ya existe?)');drawEnvios()};
}
