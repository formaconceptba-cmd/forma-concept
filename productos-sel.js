/* ---------- Productos → Lista de productos: filtrar por categoría, seleccionar varios y editarlos juntos ----------
   Chips de categoría arriba (filtran la lista), casilla en cada producto y "seleccionar todos" (los que se ven).
   Con algo seleccionado aparece una barra abajo: publicar / despublicar, disponibilidad (incluye Próximamente) y precio (subir o bajar %).
   Cada cambio se guarda al toque y queda en el historial de precios. */
(function(){
let CATF='',SEL=new Set();
const vis=()=>[...$('#m').querySelectorAll('tbody tr[data-id]')].filter(tr=>!tr.hidden);
function filtrar(){const m=$('#m');m.querySelectorAll('tbody tr').forEach(tr=>{if(tr.dataset.id){const p=prods.find(x=>x.id===tr.dataset.id);tr._ok=!CATF||(p&&p.categoria===CATF)}});
  let ok=true;m.querySelectorAll('tbody tr').forEach(tr=>{if(tr.dataset.id)ok=tr._ok;if(tr.dataset.quit)return;tr.hidden=!ok})}
function barra(){let b=document.getElementById('psel');if(!SEL.size){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='psel';b.style.cssText='position:sticky;bottom:0;z-index:20;background:#141414;color:#fff;padding:10px 14px;margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-radius:8px';$('#m').appendChild(b)}
  b.innerHTML=`<b>${SEL.size} seleccionado${SEL.size>1?'s':''}</b><span style="opacity:.4">|</span>
   <button class="btn" data-pa="pub">Publicar</button><button class="btn" data-pa="despub">Despublicar</button>
   <select id="ps_d" style="width:auto"><option value="">Disponibilidad…</option><option value="-">— (sin marcar)</option><option value="stock">En stock</option><option value="pedido">A pedido</option><option value="proximamente">Próximamente</option><option value="sin_stock">Sin stock</option></select>
   <span style="white-space:nowrap">Precio <input id="ps_p" class="num" style="width:60px" placeholder="+10" inputmode="decimal"> % <button class="btn" data-pa="precio">Aplicar</button></span>
   <span class="sp"></span><button class="btn" data-pa="limpiar">Deseleccionar</button>`;
  b.querySelectorAll('[data-pa]').forEach(x=>x.onclick=()=>accion(x.dataset.pa));b.querySelector('#ps_d').onchange=e=>{if(e.target.value)accion('disp',e.target.value)}}
async function accion(a,v){const ids=[...SEL];if(a==='limpiar'){SEL.clear();drawProds();return}
  let ok=0;
  if(a==='pub'||a==='despub'){const on=a==='pub';const P=on?ids.filter(id=>{const p=prods.find(x=>x.id===id);return !(typeof puedePublicar==='function'&&puedePublicar(p))}):ids;
    const no=ids.length-P.length;if(P.length){const {error}=await sb.from('products').update({activo:on}).in('id',P);if(!error){P.forEach(id=>{const p=prods.find(x=>x.id===id);if(p)p.activo=on});ok=P.length}}
    toast(`${on?'Publicados':'Despublicados'}: ${ok}${no?` · ${no} no se pueden publicar (no vienen en ningún contenedor)`:''}`)}
  if(a==='disp'){const val=v==='-'?null:v;const {error}=await sb.from('products').update({disponibilidad:val}).in('id',ids);if(!error){ids.forEach(id=>{const p=prods.find(x=>x.id===id);if(p)p.disponibilidad=val});ok=ids.length}toast(error?'No se pudo':`Disponibilidad cambiada en ${ok}`)}
  if(a==='precio'){const pc=+String(document.getElementById('ps_p').value).replace(',','.');if(!pc||!isFinite(pc))return toast('Poné un % (ej. 10 para subir, -5 para bajar)');
    const L=ids.map(id=>prods.find(x=>x.id===id)).filter(p=>p&&p.precio_lista>0),nv=p=>Math.round(p.precio_lista*(1+pc/100)/1000)*1000;
    const bajo=L.filter(p=>p.precio_minimo&&nv(p)<p.precio_minimo);
    if(!confirm(`¿${pc>0?'Subir':'Bajar'} ${Math.abs(pc)}% el precio de lista de ${L.length} producto${L.length>1?'s':''}? (redondeado a $1.000)${bajo.length?`\n\nOjo: ${bajo.length} quedarían abajo del mínimo sin perder y se ocultarían de la tienda: ${bajo.map(p=>p.tipo+' '+p.nombre).join(', ')}.`:''}`))return;
    for(const p of L){const n=nv(p);const {error}=await sb.from('products').update({precio_lista:n}).eq('id',p.id);if(!error){p.precio_lista=n;ok++}}toast(`Precio cambiado en ${ok}`)}
  drawProds()}
async function extras(){const m=$('#m');if(!m||(tab!=='productos'&&tab!=='nacionales'))return;const tbl=m.querySelector('table.big');if(!tbl||m.querySelector('#pcats'))return;
  const L=prods.filter(p=>(typeof PRODF!=='undefined'&&PRODF==='nacional')===(p.linea==='Nacional')),C=[...new Set(L.map(p=>p.categoria).filter(Boolean))].sort();
  if(CATF&&!C.includes(CATF))CATF='';
  tbl.closest('.card').insertAdjacentHTML('beforebegin',`<div id="pcats" class="bar" style="flex-wrap:wrap;gap:6px;margin:0 0 10px">${[['','Todas',L.length]].concat(C.map(c=>[c,c,L.filter(p=>p.categoria===c).length])).map(([v,t,n])=>`<button class="btn ${CATF===v?'dk':''}" data-cf="${esc(v)}" style="padding:5px 12px">${esc(t)} <span style="opacity:.6">${n}</span></button>`).join('')}</div>`);
  m.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{CATF=b.dataset.cf;m.querySelectorAll('[data-cf]').forEach(x=>x.classList.toggle('dk',x===b));filtrar()});
  /* casillas */
  const th=tbl.querySelector('thead th');if(th&&!th.querySelector('#pall'))th.innerHTML='<input type="checkbox" id="pall" title="Seleccionar todos los que se ven" style="width:auto">';
  tbl.querySelectorAll('tbody tr[data-id]').forEach(tr=>{const td=tr.children[0];if(td.querySelector('[data-sel]'))return;td.style.whiteSpace='nowrap';td.insertAdjacentHTML('afterbegin',`<input type="checkbox" data-sel style="width:auto;margin-right:6px;vertical-align:middle" ${SEL.has(tr.dataset.id)?'checked':''}>`)});
  const sync=()=>{const V=vis();const a=m.querySelector('#pall');if(a)a.checked=V.length&&V.every(tr=>SEL.has(tr.dataset.id));barra()};
  tbl.querySelectorAll('[data-sel]').forEach(c=>c.onchange=()=>{const id=c.closest('tr').dataset.id;c.checked?SEL.add(id):SEL.delete(id);sync()});
  const all=m.querySelector('#pall');if(all)all.onchange=()=>{vis().forEach(tr=>{const c=tr.querySelector('[data-sel]');c.checked=all.checked;all.checked?SEL.add(tr.dataset.id):SEL.delete(tr.dataset.id)});sync()};
  /* "Próximamente" en el selector de cada producto */
  tbl.querySelectorAll('select[data-f="disponibilidad"]').forEach(s=>{if(![...s.options].some(o=>o.value==='proximamente')){const o=new Option('Próximamente','proximamente');s.add(o,s.options[3]||null);const p=prods.find(x=>x.id===s.closest('tr').dataset.id);if(p&&p.disponibilidad==='proximamente')s.value='proximamente'}});
  filtrar();sync()}
if(typeof t3Prods==='function'){const _t=t3Prods;t3Prods=async function(){await _t.apply(this,arguments);await extras()}}
})();
