/* ---------- Productos → Lista de productos: precio con referencia, preventa sólo si está prendida, y qué le pasa a cada fila ----------
   · El precio de lista se cambia acá (un solo precio por producto). Al lado: mínimo sin perder y sugerido del último contenedor
     donde viene (precio de la caja si se vende de a 2). Si escribís menos que el mínimo, se pone en rojo.
   · Si la preventa está apagada (Precios y promociones → Promociones), no se muestran sus columnas.
   · Filas grises: dice por qué y cómo se arregla. Colores que no vienen en ningún contenedor: botón para quitarlos. */
(function(){
const preventaOn=()=>(typeof ST!=='undefined'&&ST.preventa_activa!=null?+ST.preventa_activa:1)>0;
const num=s=>+String(s||'').replace(/\D/g,'')||0;
async function refs(){const R=await MG.cargar(true);const o={};for(const k in R)o[k]={min:R[k].min,sug:R[k].sug,pz:R[k].pz};MG.syncMinimos();return o}

async function extras(){const m=$('#m');if(!m||tab!=='productos')return;const tbl=m.querySelector('table');if(!tbl)return;
  /* 1) preventa: fuera si está apagada */
  if(!preventaOn()){const idx=[...tbl.querySelectorAll('thead th')].map((th,i)=>/preventa/i.test(th.textContent)?i:-1).filter(i=>i>=0);
    tbl.querySelectorAll('thead tr, tr[data-id]').forEach(tr=>idx.forEach(i=>{const c=tr.children[i];if(c)c.style.display='none'}))}
  /* 2) referencia de precio */
  const R=await refs();if(tab!=='productos')return;
  tbl.querySelectorAll('tr[data-id]').forEach(tr=>{const x=R[tr.dataset.id],inp=tr.querySelector('[data-f="precio_lista"]');if(!x||!inp||inp.dataset.ref)return;inp.dataset.ref=1;
    const h=document.createElement('div');h.className='hint';h.style.whiteSpace='nowrap';inp.after(h);
    const pinta=()=>{const v=num(inp.value),bajo=v&&v<x.min;inp.style.color=bajo?'#c0392b':'';inp.style.borderColor=bajo?'#c0392b':'';
      h.innerHTML=bajo?`<span class="neg"><b>abajo del mínimo: perdés plata.</b><br>Si lo guardás así, se oculta de la tienda hasta que lo corrijas.</span><br>mín. ${ars(x.min)} · sug. ${ars(x.sug)}`:`mín. ${ars(x.min)} · sug. ${ars(x.sug)}${x.pz>1?` <span title="precio de la caja de ${x.pz}">(caja de ${x.pz})</span>`:''}`};
    pinta();inp.addEventListener('input',pinta)});
  /* 3) filas grises: por qué y cómo se arregla */
  tbl.querySelectorAll('tr.off[data-id]').forEach(tr=>{const p=prods.find(x=>x.id===tr.dataset.id),cel=tr.children[1];if(!p||!cel||cel.querySelector('.porq'))return;
    const why=typeof puedePublicar==='function'?puedePublicar(p):null;
    cel.insertAdjacentHTML('beforeend',why?`<div class="hint neg porq" style="max-width:280px;white-space:normal">No se puede publicar: ${esc(why)} <b>Cómo se arregla:</b> si viene en un contenedor, aplicá su proforma (Importación → Contenedores → Orden de compra y proformas → Revisar y aplicar).</div>`
      :`<div class="hint porq" style="max-width:280px;white-space:normal;color:#b26a00"><b>Despublicado:</b> no se ve en la tienda. Para mostrarlo, tildá "Publicado" (a la derecha) y tocá Guardar cambios. Si no lo vas a vender más, "Eliminar".</div>`)});
  /* 4a) colores quitados (ocultos y sin contenedor): no se muestran; se pueden ver con un clic */
  const quit=[...m.querySelectorAll('tr.vrow')].filter(tr=>{const ck=tr.querySelector('[data-vpub]');if(!ck)return false;const v=VARS.find(x=>x.sku===ck.dataset.vpub);return v&&v.publicado===false&&!ENPED.has(v.sku)});
  quit.forEach(tr=>{tr.hidden=true;tr.dataset.quit=1});
  if(quit.length&&!m.querySelector('[data-vqv]'))tbl.insertAdjacentHTML('afterend',`<p class="hint" style="margin-top:8px">${quit.length} color${quit.length>1?'es quitados':' quitado'} no se muestra${quit.length>1?'n':''} (no vienen en ningún contenedor). <button class="lnk" data-vqv>Ver</button></p>`);
  const vq=m.querySelector('[data-vqv]');if(vq)vq.onclick=()=>{m.querySelectorAll('tr[data-quit]').forEach(tr=>tr.hidden=!tr.hidden)};
  /* 4) colores que no vienen en ningún contenedor */
  m.querySelectorAll('tr.vrow').forEach(tr=>{const ck=tr.querySelector('[data-vpub]');if(!ck||ENPED.has(ck.dataset.vpub)||tr.querySelector('[data-vdel]'))return;const v=VARS.find(x=>x.sku===ck.dataset.vpub);if(!v)return;
    const sp=[...tr.querySelectorAll('span.hint')].find(s=>/ningún pedido/.test(s.textContent));
    if(sp)sp.innerHTML=`<span class="neg">No viene en ningún contenedor</span><div style="white-space:normal;max-width:300px">Por eso no se puede publicar. Si viene, aplicá la proforma del contenedor y se activa solo. Si no viene más: <button class="lnk" data-vdel="${esc(v.sku)}">Quitar este color</button></div>`});
  m.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=async()=>{const v=VARS.find(x=>x.sku===b.dataset.vdel);if(!confirm(`¿Quitar ${v.sku} (${colNom(v.color)})? Si nunca tuvo movimientos de stock se borra; si tuvo, sólo se oculta.`))return;
    const K=CAJAS.filter(k=>k.sku===v.sku).map(k=>k.sku_caja);const {count}=K.length?await sb.from('stock_mov').select('id',{count:'exact',head:true}).in('sku_caja',K):{count:0};
    let ok=false;if(!count&&v.estado==='borrador'){const {error}=await sb.from('variantes').delete().eq('sku',v.sku);ok=!error}
    if(!ok){const {error}=await sb.from('variantes').update({publicado:false}).eq('sku',v.sku);toast(error?'No se pudo':'Color oculto (tenía movimientos de stock: queda en el historial)')}else toast('Color quitado');
    await loadSkus();drawProds()})}

if(typeof t3Prods==='function'){const _t=t3Prods;t3Prods=async function(){await _t.apply(this,arguments);await extras()}}
})();
