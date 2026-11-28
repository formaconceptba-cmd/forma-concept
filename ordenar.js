/* ---------- Orden del panel: cada cosa en un solo lugar ----------
   · Carritos abandonados → Ventas (antes en Inicio)
   · Suscriptores → Mails; Copia de seguridad → Configuración (antes al pie de Inicio)
   · Salud del seguimiento (píxel de Meta / Google) → Anuncios (antes en Inicio)
   · Historial de cambios de precio → Reglas de precio (antes en Inicio)
   · Preventa, descuento por transferencia y cuotas sin interés: sólo en Promociones (estaban también en Reglas de precio)
   · Tarifas de Pailos: sólo en Gastos (estaban también en Costos y parámetros) ---------- */
let CARP=30;
async function drawCarritos(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';
  const desde=CARP?new Date(Date.now()-CARP*DIA).toISOString():'2000-01-01';
  const {data}=await sb.from('orders').select('*,order_items(*,products(tipo,nombre))').eq('estado','pendiente').gte('created_at',desde).order('created_at',{ascending:false}).limit(300);
  if(tab!=='carritos')return;
  const L=(data||[]).filter(x=>Date.now()-new Date(x.created_at)>30*6e4),tot=L.reduce((a,x)=>a+(+x.total||0),0);
  const wa=t=>typeof waNum==='function'?waNum(t):String(t||'').replace(/\D/g,'');
  $('#m').innerHTML=`<div class="bar ihd"><b>${L.length} carrito${L.length===1?'':'s'} · ${ars(tot)} sin cobrar</b><span class="sp"></span>${[[7,'7 días'],[30,'30 días'],[90,'90 días'],[0,'Todo']].map(([d,l])=>`<button class="btn ${CARP===d?'dk':''}" data-cp="${d}">${l}</button>`).join('')}</div>
   <p class="hint" style="max-width:820px">Gente que llegó a pagar y no terminó (o eligió transferencia y todavía no la mandó). Un mensaje a tiempo recupera muchas ventas: escribiles por WhatsApp o mandales el mail de recordatorio.</p>
   <div class="card wrap">${L.length?`<table><thead><tr><th>Cuándo</th><th>Cliente</th><th class="hide-m">Productos</th><th class="n">Total</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td>${hace(x.created_at)}${x.medio_pago==='transferencia'?'<div class="hint">eligió transferencia</div>':''}</td><td><b>${esc(x.nombre||'—')}</b><div class="hint">${esc(x.email||'')} · ${esc(x.telefono||'')}</div></td><td class="hide-m">${(x.order_items||[]).map(i=>`${i.cantidad}× ${esc(i.products?i.products.tipo+' '+i.products.nombre:i.product_id)}`).join('<br>')}</td><td class="n">${ars(x.total)}</td>
    <td style="white-space:nowrap">${x.telefono?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${wa(x.telefono)}?text=${encodeURIComponent('Hola '+(x.nombre||'').split(' ')[0]+', vimos que te quedó una compra sin terminar en FORMA Concept. ¿Te ayudamos?')}">WhatsApp</a>`:''} ${x.email?`<button class="btn" data-rem="${x.id}">${x.recordado_at?'Reenviar mail':'Mandar mail'}</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<p class="hint" style="padding:16px">No hay carritos abandonados en este período.</p>'}</div>`;
  $('#m').querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{CARP=+b.dataset.cp;drawCarritos()});
  $('#m').querySelectorAll('[data-rem]').forEach(b=>b.onclick=async()=>{b.disabled=true;const {data:{session}}=await sb.auth.getSession();
    const r=await fetch('/api/recordatorio',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({id:+b.dataset.rem})});const d=await r.json().catch(()=>({}));
    b.disabled=false;toast(r.ok?'Mail enviado':(d.error||'No se pudo enviar'));if(r.ok)b.textContent='Reenviar mail'})}

(function(){const _d=draw;draw=async function(){
  if(tab==='carritos'){drawNav();return drawCarritos()}
  if(tab==='subs'||tab==='backup'){drawNav();$('#m').innerHTML='';await drawSubs();const c=[...$('#m').children];(tab==='subs'?c[1]:c[0])?.remove();const f=$('#m').firstElementChild;if(f)f.style.marginTop='0';return}
  return _d.apply(this,arguments)}})();

/* Anuncios: abajo, si el píxel de Meta y Google está recibiendo bien */
if(typeof drawCampanias==='function'){const _c=drawCampanias;drawCampanias=async function(){const r=await _c.apply(this,arguments);if(tab!=='campanias')return r;
  $('#m').insertAdjacentHTML('beforeend','<div id="itrk" style="margin-top:16px"></div>');try{await drawSalud(await ventasRent())}catch(e){}return r}}

/* Reglas de precio: sin lo repetido + historial de cambios de precio */
if(typeof drawRent==='function'){const _r=drawRent;drawRent=async function(){const o=await _r.apply(this,arguments);if(tab!=='rent')return o;
  const m=$('#m'),rows=['#r_pa','#r_dt','#r_cs'].map(s=>m.querySelector(s)).filter(Boolean).map(i=>i.closest('.rw')).filter(Boolean);
  if(rows.length){const card=rows[0].parentNode;rows.forEach(r=>r.remove());card.querySelector('h4').insertAdjacentHTML('afterend','<p class="hint">La preventa, el descuento por transferencia y las cuotas sin interés se cambian en <button class="lnk" data-go3="promos">Promociones y códigos</button>.</p>');
    card.querySelectorAll('p.hint').forEach(p=>{if(/se activan en tu cuenta de Mercado Pago/.test(p.textContent))p.remove()})}
  try{if(!prods.length)await loadProds();const {data:hi}=await sb.from('precio_historial').select('*').order('fecha',{ascending:false}).limit(40);const PB=Object.fromEntries(prods.map(p=>[p.id,p])),nom=id=>PB[id]?PB[id].tipo+' '+PB[id].nombre:id;
    m.insertAdjacentHTML('beforeend',`<div class="card pad" style="margin-top:14px"><h4>Historial de cambios de precio</h4>${(hi||[]).map(h=>`<div class="rw" style="gap:8px"><span>${esc(h.ref==='regla'?'Regla '+h.campo.replace('regla_','').replace('desc_','').replace('_',' '):nom(h.ref))}<div class="hint">${hace(h.fecha)}</div></span><b style="white-space:nowrap">${/pct|regla|desc|descuento/.test(h.campo)?pct(+h.antes)+' → '+pct(+h.despues):h.campo==='preventa_activa'?(+h.despues?'preventa on':'preventa off'):ars(h.antes)+' → '+ars(h.despues)}</b></div>`).join('')||'<p class="hint">Todavía no hay cambios registrados.</p>'}</div>`)}catch(e){}
  m.querySelectorAll('[data-go3]').forEach(b=>b.onclick=()=>{tab=b.dataset.go3;draw()});return o}}

/* Costos y parámetros: las tarifas de Pailos se cargan sólo en Gastos */
if(typeof drawEcoPar==='function'){const _e=drawEcoPar;drawEcoPar=async function(){const o=await _e.apply(this,arguments);if(tab!=='ecopar')return o;
  const K=new Set((typeof TARS!=='undefined'?TARS:[]).map(t=>t[0]));let pegado=false;
  $('#m').querySelectorAll('[data-pk]').forEach(i=>{if(!K.has(i.dataset.pk))return;const card=i.closest('.card'),rw=i.closest('.rw');if(rw)rw.remove();
    if(card&&!card.dataset.pn){card.dataset.pn=1;card.querySelector('h4').insertAdjacentHTML('afterend','<p class="hint">Las tarifas de Pailos se cargan en <button class="lnk" data-go3="gastos">Gastos → Gastos y depósito</button>, donde también ves cuánto te cuestan por mes.</p>')}});
  $('#m').querySelectorAll('.card[data-pn]').forEach(c=>{if(!c.querySelector('[data-pk]')){if(pegado)c.remove();else pegado=true}});
  $('#m').querySelectorAll('[data-go3]').forEach(b=>b.onclick=()=>{tab=b.dataset.go3;draw()});return o}}
