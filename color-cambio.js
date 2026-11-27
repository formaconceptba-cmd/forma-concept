/* ---------- Productos → "Cambiar color": cuando un color de la proforma cambió (ej. la fábrica manda Negro en vez de Bordó) ----------
   Pasa todo lo que viene de ese color al color nuevo: crea el color si no existe (con las mismas cajas), mueve las cajas que llegan
   en cada contenedor (packing list para Pailos y stock "en camino"), publica el nuevo y oculta el viejo.
   Queda anotado en el contenedor (par.cambios_color): si después se vuelve a aplicar la misma proforma, el cambio manual se respeta.
   Si el color viejo ya tiene stock físico en Pailos, no se cambia acá (es mercadería real: se corrige con un ajuste de inventario). */
(function(){
async function cambiar(sku){const v=VARS.find(x=>x.sku===sku);if(!v)return;if(!PAL.length)await loadSkus();
  const KA=CAJAS.filter(k=>k.sku===v.sku),fis=KA.reduce((a,k)=>a+((STKC[k.sku_caja]||{}).fisico||0),0);
  const {data:ING}=KA.length?await sb.from('eco_ingreso').select('*').in('sku_caja',KA.map(k=>k.sku_caja)):{data:[]};
  const {data:PE}=await sb.from('eco_pedidos').select('id,nombre,par');const peN=id=>((PE||[]).find(p=>p.id===id)||{}).nombre||('#'+id);
  const peds=[...new Set((ING||[]).filter(x=>x.cajas>0).map(x=>x.pedido_id))];
  const prod=(typeof prods!=='undefined'?prods:[]).find(p=>p.id===v.codigo_master)||{};
  const d=document.createElement('dialog');d.style.maxWidth='560px';document.body.appendChild(d);
  d.innerHTML=`<div class="dh"><h2>Cambiar color · ${esc((prod.tipo||'')+' '+(prod.nombre||v.codigo_master))}</h2><button class="btn" data-x>Cerrar</button></div><div class="db">
   <p style="margin-top:0">Color actual: <b>${esc(colNom(v.color))}</b> <span class="hint">(${esc(v.sku)})</span></p>
   ${fis>0?`<div class="card pad ibad">Este color ya tiene <b>${fis} piezas en Pailos</b>: es mercadería real y no se cambia acá. Si Pailos recibió otro color, corregilo en Productos → Inventario (Pailos) con un ajuste.</div>`:`
   <p class="hint">Usalo cuando el proveedor cambió el color de lo que viene. Todo lo de <b>${esc(colNom(v.color))}</b> pasa al color nuevo: ${peds.length?`las cajas que llegan en <b>${peds.map(peN).map(esc).join(', ')}</b> (packing list para Pailos y stock "en camino")`:'no viene en ningún contenedor todavía'}, y se publica el nuevo en lugar del viejo. Este cambio manda sobre la proforma: si la volvés a aplicar, se respeta.</p>
   <label>Color nuevo</label><select id="cc_c"><option value="">Elegí…</option>${PAL.filter(c=>c.activo&&c.codigo!==v.color).map(c=>{const ya=VARS.find(x=>x.codigo_master===v.codigo_master&&x.color===c.codigo);return `<option value="${c.codigo}">${esc(c.nombre)}${ya?' (ya existe: se suma)':''}</option>`}).join('')}</select>
   <div class="hint" style="margin-top:4px">¿No está el color? Se agrega en Productos → Colores.</div>
   <div class="bar" style="margin-top:14px"><span class="hint neg" id="cc_e"></span><span class="sp"></span><button class="btn dk" id="cc_ok">Cambiar</button></div>`}</div>`;
  d.querySelector('[data-x]').onclick=()=>{d.close();d.remove()};d.showModal();
  const ok=d.querySelector('#cc_ok');if(!ok)return;
  ok.onclick=async()=>{const c=d.querySelector('#cc_c').value,e=d.querySelector('#cc_e');if(!c)return e.textContent='Elegí el color nuevo';ok.disabled=true;ok.textContent='Cambiando…';
    /* 1) el color nuevo (si no existe, con las mismas cajas) */
    let nv=VARS.find(x=>x.codigo_master===v.codigo_master&&x.color===c);
    if(!nv){const r=await sb.from('variantes').insert({sku:'',codigo_master:v.codigo_master,color:c,descripcion:v.descripcion||null,orden:(v.orden||0)+1,publicado:v.publicado!==false}).select().single();
      if(r.error){ok.disabled=false;ok.textContent='Cambiar';return e.textContent='No se pudo crear el color: '+r.error.message}nv=r.data}
    let KB=CAJAS.filter(k=>k.sku===nv.sku);
    if(!KB.length){const filas=(KA.length?KA:[{parte:'COMPLETA',piezas:1}]).map((k,j)=>({sku_caja:'',sku:nv.sku,parte:k.parte,piezas:k.piezas,largo_cm:k.largo_cm??null,ancho_cm:k.ancho_cm??null,alto_cm:k.alto_cm??null,peso_bruto:k.peso_bruto??null,peso_neto:k.peso_neto??null,orden:k.orden||j+1}));
      const r=await sb.from('cajas').insert(filas).select();if(r.error){ok.disabled=false;ok.textContent='Cambiar';return e.textContent='No se pudieron crear las cajas: '+r.error.message}KB=r.data}
    /* 2) las cajas que llegan en cada contenedor pasan al color nuevo */
    for(const x of (ING||[])){const ka=KA.find(k=>k.sku_caja===x.sku_caja),kb=KB.find(k=>k.parte===(ka&&ka.parte))||KB[0];if(!kb)continue;
      const {data:ya}=await sb.from('eco_ingreso').select('cajas').eq('pedido_id',x.pedido_id).eq('sku_caja',kb.sku_caja).maybeSingle();
      await sb.from('eco_ingreso').upsert({pedido_id:x.pedido_id,sku_caja:kb.sku_caja,cajas:(ya?+ya.cajas:0)+(+x.cajas||0)});
      await sb.from('eco_ingreso').delete().eq('pedido_id',x.pedido_id).eq('sku_caja',x.sku_caja)}
    /* 3) se publica el nuevo y se oculta el viejo; 4) queda anotado en cada contenedor para que la proforma lo respete */
    await sb.from('variantes').update({publicado:v.publicado!==false}).eq('sku',nv.sku);await sb.from('variantes').update({publicado:false}).eq('sku',v.sku);
    for(const id of peds){const pe=(PE||[]).find(p=>p.id===id);if(!pe)continue;const par=Object.assign({},pe.par||{});par.cambios_color=(par.cambios_color||[]).filter(z=>z.de!==v.sku).concat([{de:v.sku,a:nv.sku,fecha:new Date().toISOString()}]);
      await sb.from('eco_pedidos').update({par}).eq('id',id);const lo=(typeof ECO!=='undefined'&&ECO.ped||[]).find(p=>p.id===id);if(lo)lo.par=par}
    await loadSkus();if(typeof loadEnPedido==='function')await loadEnPedido();if(typeof ECO!=='undefined')try{await ecoLoad()}catch(x){}
    d.querySelector('.db').innerHTML=`<p class="pos" style="margin-top:0"><b>Listo:</b> ${esc(colNom(v.color))} → <b>${esc(colNom(c))}</b> (${esc(nv.sku)}).</p><p class="hint">Cargale las fotos al color nuevo en la lista de productos ("Fotos"). Si el cambio también cambia el precio, revisalo.</p>`;
    if(tab==='productos')drawProds()}}
window.cambiarColor=cambiar;
/* botón en cada color de la lista de productos */
if(typeof t3Prods==='function'){const _t=t3Prods;t3Prods=async function(){await _t.apply(this,arguments);const m=$('#m');if(!m)return;
  m.querySelectorAll('tr.vrow [data-vfot]').forEach(b=>{if(b.parentElement.querySelector('[data-ccol]'))return;b.insertAdjacentHTML('afterend',` <button type="button" class="lnk" data-ccol="${esc(b.dataset.vfot)}">Cambiar color</button>`)});
  m.querySelectorAll('[data-ccol]').forEach(b=>b.onclick=()=>cambiar(b.dataset.ccol))}}
})();
