/* ---------- Formato estilo Shopify: marco negro con la pantalla en una hoja blanca redondeada, buscador y contadores
   en el menú, detalle de cada venta (productos / pago / cliente / historial), barra flotante para preguntar,
   fechas libres y pantalla "Comparar canales" ---------- */
window.INI_RANGO=null;window.ORD_SEL=null;
(function(){const st=document.createElement('style');st.textContent=`
body .tn{background:#0e0e0f}
body .tn-main{background:#f7f7f5;margin:8px 8px 8px 0;border-radius:16px;min-height:calc(100vh - 16px);overflow:clip;position:relative}
body .tn-top{background:#fff;border-bottom:1px solid #ebeae6}
.tn-sk{display:none}
.tn-search{margin:0 12px 8px;position:relative}.tn-search input{width:100%;background:#1c1c1e;border:1px solid #2a2a2d;border-radius:10px;color:#e9e9e7;padding:8px 10px 8px 32px;font:13px var(--f);outline:0}
.tn-search input::placeholder{color:#8b8b88}.tn-search svg{position:absolute;left:10px;top:9px;color:#8b8b88}
.tn-badge{font:600 11px/18px var(--f);font-style:normal;background:#2c2c2f;color:#e9e9e7;border-radius:6px;padding:0 6px;margin-left:auto}
.tn-res button{display:block;width:100%;text-align:left;border:0;background:none;color:#d8d8d5;padding:7px 10px;border-radius:8px;font:13px var(--f);cursor:pointer}.tn-res button:hover,.tn-res button.on{background:#232326;color:#fff}.tn-res small{color:#8b8b88;margin-left:6px}
/* barra flotante para preguntar */
.skb{position:sticky;bottom:14px;z-index:30;width:min(560px,calc(100% - 32px));margin:0 auto 14px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e1e0dc;border-radius:999px;padding:6px 6px 6px 14px;box-shadow:0 6px 24px rgba(0,0,0,.10)}
.skb svg{flex:0 0 auto;color:#5d5d5a}.skb input{flex:1;border:0;outline:0;background:none;font:14px var(--f);color:#0a0a0a;min-width:0;padding:6px 0}
.skb button{width:32px;height:32px;border-radius:50%;border:0;background:#0e0e0f;color:#fff;font:600 15px var(--f);cursor:pointer;flex:0 0 auto}
/* detalle de venta */
.od-nav{display:flex;align-items:center;gap:8px;margin:-4px 0 14px;color:#5d5d5a;font-size:13px}.od-nav button{width:30px;height:30px;border-radius:50%;border:1px solid #e1e0dc;background:#fff;cursor:pointer}
.od-g{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:28px;align-items:start}
.od-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font:600 28px var(--f);margin:0}.od-sub{color:#5d5d5a;margin:6px 0 20px}
.op{display:inline-flex;align-items:center;gap:4px;font:500 12.5px var(--f);padding:3px 9px;border-radius:8px;background:#ecebe7;color:#3a3a38}.op.ok{background:#e9f7e1;color:#245c12}.op.am{background:#ffeb8a;color:#5b4300}.op.az{background:#e3ecff;color:#1d4fb8}.op.ro{background:#fde2df;color:#8d2219}
.od-sec{display:flex;align-items:center;gap:10px;margin:22px 0 10px}.od-sec h3{font:600 17px var(--f);margin:0;flex:1;display:flex;align-items:center;gap:8px}
.od-card{background:#fff;border:1px solid #e4e3df;border-radius:14px;overflow:hidden}
.od-ch{display:flex;justify-content:space-between;gap:10px;padding:12px 16px;color:#5d5d5a;font-size:13.5px;border-bottom:1px solid #f0efeb}
.od-it{display:grid;grid-template-columns:48px minmax(0,1fr) auto 110px;gap:14px;align-items:center;padding:12px 16px;border-bottom:1px solid #f0efeb}.od-it:last-child{border-bottom:0}
.od-it img{width:48px;height:48px;border-radius:10px;object-fit:contain;background:#f2f1ee;mix-blend-mode:multiply}.od-it .chip{display:inline-block;margin-top:4px;background:#f2f1ee;border-radius:6px;padding:1px 7px;font-size:12px}
.od-it .q{font-size:13.5px;color:#3a3a38;white-space:nowrap}.od-it .q i{font-style:normal;background:#f2f1ee;border-radius:5px;padding:0 6px;margin-left:4px}.od-it .t{text-align:right;font-variant-numeric:tabular-nums}
.od-pay{padding:6px 16px}.od-pay div{display:grid;grid-template-columns:1fr auto 110px;gap:12px;padding:8px 0;font-size:14px}.od-pay span{color:#5d5d5a;text-align:right}.od-pay b,.od-pay em{text-align:right;font-style:normal;font-variant-numeric:tabular-nums}
.od-pay .tot{border-top:1px solid #ecebe7;margin-top:4px;padding-top:12px;font-weight:600}.od-foot{background:#f7f7f5;padding:10px 16px;font-size:13.5px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.od-side>div{padding:0 0 18px;margin-bottom:18px;border-bottom:1px solid #ecebe7}.od-side>div:last-child{border:0}.od-side h4{font:500 13px var(--f);color:#5d5d5a;margin:0 0 10px}.od-side h2{font:600 20px var(--f);margin:0 0 12px}
.od-side p{margin:0 0 6px;font-size:14px;line-height:1.45;word-break:break-word}.od-side .ln{display:flex;gap:8px;align-items:center;margin-bottom:7px;font-size:14px}.od-side .ln svg{color:#77756f;flex:0 0 auto}
.od-tl{position:relative;padding-left:16px}.od-tl:before{content:'';position:absolute;left:4px;top:6px;bottom:6px;width:1.5px;background:#e4e3df}
.od-tl>div{position:relative;margin-bottom:12px;font-size:13.5px;display:flex;gap:8px}.od-tl>div:before{content:'';position:absolute;left:-15px;top:6px;width:8px;height:8px;border-radius:50%;background:#bdbbb5}.od-tl span{flex:1}.od-tl small{color:#8a8985;white-space:nowrap}
.od-sec a.btn{text-decoration:none}body.od-on .tn-ph{display:none}.btn.negro{background:#0e0e0f;color:#fff;border-color:#0e0e0f;border-radius:10px}
table tr[data-ver]{cursor:pointer}table tr[data-ver]:hover td{background:#fafaf8}
/* fechas libres */
.rgp{position:relative;display:inline-block}.rgw{position:absolute;right:0;top:calc(100% + 6px);z-index:40;background:#fff;border:1px solid #e1e0dc;border-radius:14px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.12);display:grid;gap:8px;min-width:250px}
.rgw label{margin:0;font-size:12.5px;color:#5d5d5a}.rgw .bar{margin:4px 0 0}
/* comparar canales */
.cc th,.cc td{text-align:right}.cc th:first-child,.cc td:first-child{text-align:left}.cc tr.tt td{font-weight:600;border-top:1px solid #ecebe7}
.cc-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:#f2f1ee;margin:8px 0 6px}.cc-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:#5d5d5a}.cc-leg i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}
@media(max-width:1100px){.od-g{grid-template-columns:1fr}}
@media(max-width:900px){body .tn-main{margin:0;border-radius:0;min-height:100vh}}
@media(max-width:560px){.od-it{grid-template-columns:44px minmax(0,1fr) auto}.od-it .t{display:none}.od-pay div{grid-template-columns:1fr auto}.od-pay span{display:none}}
`;document.head.appendChild(st)})();

/* ---- barra flotante para preguntar + buscador en el menú ---- */
window.skbEnviar=function(e){if(e)e.preventDefault();const q=document.getElementById('skbq'),t=(q&&q.value||'').trim();if(!t)return;q.value='';
  document.body.classList.remove('tn-open');chatAbrir();setTimeout(()=>{const c=document.getElementById('tcq'),f=document.getElementById('tcf');if(c&&f){c.value=t;f.requestSubmit()}},50)};
(function(){const _sh=window.shell;window.shell=function(){_sh.apply(this,arguments);
  const m=document.getElementById('m');if(m&&!document.getElementById('skb'))m.insertAdjacentHTML('afterend',`<form class="skb" id="skb" onsubmit="skbEnviar(event)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg><input id="skbq" placeholder="Si tenés alguna duda, escribila acá" autocomplete="off"><button aria-label="Enviar">↑</button></form>`);
  const lg=document.querySelector('.tn-logo');if(lg&&!document.getElementById('tnq')){lg.insertAdjacentHTML('afterend',`<div class="tn-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="tnq" placeholder="Buscar pantalla o venta #" autocomplete="off"></div>`);
    const q=document.getElementById('tnq');q.oninput=()=>buscar(q.value);q.onkeydown=e=>{if(e.key==='Enter'){const b=document.querySelector('.tn-res button');if(b)b.click()}if(e.key==='Escape'){q.value='';buscar('')}}}
  badges()};
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  function buscar(t){const n=document.getElementById('gnav');if(!n)return;t=norm(t).trim();if(!t){drawNav();return}
    const R=[];const num=t.replace(/^#/,'');if(/^\d+$/.test(num))R.push({h:`Venta #${num}`,s:'abrir el detalle',go:()=>{ORD_SEL=+num;tab='pedidos';draw()}});
    GRUPOS.forEach(g=>g[2].forEach(s=>{if(norm(s[1]+' '+g[1]).includes(t))R.push({h:s[1],s:g[1].replace(/^\d+\.\s*/,''),go:()=>{const k=s[0];if(k.includes('|')){tab='maestro';MVIEW=k.split('|')[1]}else tab=k;draw()}})}));
    n.innerHTML=`<div class="tn-res">${R.slice(0,14).map((r,i)=>`<button data-r="${i}">${esc(r.h)}<small>${esc(r.s)}</small></button>`).join('')||'<p class="tn-sec">Sin resultados</p>'}</div>`;
    n.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const q=document.getElementById('tnq');q.value='';document.body.classList.remove('tn-open');R[+b.dataset.r].go()})}
  /* contadores: ventas por despachar y alertas */
  let BG={};async function badges(){try{const [{count:a},{count:b}]=await Promise.all([sb.from('orders').select('id',{count:'exact',head:true}).eq('estado','pagado'),sb.from('orders').select('id',{count:'exact',head:true}).eq('estado','pendiente').eq('medio_pago','transferencia')]);BG={ventas:(a||0)+(b||0)};pintaBadges()}catch(e){}}
  function pintaBadges(){Object.entries(BG).forEach(([k,n])=>{const b=document.querySelector(`.tn-side [data-gk="${k}"]`);if(!b||!n)return;let e=b.querySelector('.tn-badge');if(!e){e=document.createElement('em');e.className='tn-badge';const ch=b.querySelector('.tn-ch');b.insertBefore(e,ch)}e.textContent=n;e.title='Ventas por despachar o esperando transferencia'})}
  const _dn=window.drawNav;window.drawNav=function(){_dn.apply(this,arguments);pintaBadges()};setInterval(badges,60000);
  if(typeof user!=='undefined'&&user&&document.querySelector('.tn')&&!document.getElementById('skb'))window.shell();
})();

/* ---- fechas libres (Inicio y Comparar canales) ---- */
const fDM=d=>d.toLocaleDateString('es-AR',{day:'numeric',month:'short'});
window.rangoTxt=()=>INI_RANGO?`del ${fDM(INI_RANGO.d0)} al ${fDM(INI_RANGO.d1)}`:'';
window.rangoBtn=()=>`<span class="rgp"><button class="btn ${INI_RANGO?'dk':''}" id="rgb">${INI_RANGO?rangoTxt():'Elegir fechas'}</button></span>`;
window.rangoBind=function(redraw){const b=document.getElementById('rgb');if(!b)return;
  document.querySelectorAll('[data-per]').forEach(x=>x.addEventListener('click',()=>{INI_RANGO=null}));
  const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  b.onclick=e=>{e.stopPropagation();const p=b.parentNode;let w=p.querySelector('.rgw');if(w){w.remove();return}
    const h=new Date(),d0=INI_RANGO?INI_RANGO.d0:new Date(+h-29*DIA),d1=INI_RANGO?INI_RANGO.d1:h;
    p.insertAdjacentHTML('beforeend',`<div class="rgw"><label>Desde</label><input type="date" id="rg0" value="${iso(d0)}"><label>Hasta</label><input type="date" id="rg1" value="${iso(d1)}" max="${iso(h)}">
     <div class="bar" style="gap:6px"><button class="btn" data-rgm="0">Este mes</button><button class="btn" data-rgm="1">Mes pasado</button></div><div class="bar"><span class="sp"></span><button class="btn dk" id="rgok">Aplicar</button></div></div>`);
    w=p.querySelector('.rgw');w.onclick=e=>e.stopPropagation();
    const apl=(a,z)=>{a.setHours(0,0,0,0);z.setHours(0,0,0,0);if(z<a)[a,z]=[z,a];INI_RANGO={d0:a,d1:z};PER=Math.max(1,Math.round((+z-a)/DIA)+1);w.remove();redraw()};
    w.querySelector('#rgok').onclick=()=>{const a=w.querySelector('#rg0').value,z=w.querySelector('#rg1').value;if(!a||!z)return toast('Elegí las dos fechas');apl(new Date(a+'T00:00'),new Date(z+'T00:00'))};
    w.querySelectorAll('[data-rgm]').forEach(x=>x.onclick=()=>{const n=new Date();if(x.dataset.rgm==='0')apl(new Date(n.getFullYear(),n.getMonth(),1),n);else apl(new Date(n.getFullYear(),n.getMonth()-1,1),new Date(n.getFullYear(),n.getMonth(),0))});
    setTimeout(()=>document.addEventListener('click',function cl(){const x=p.querySelector('.rgw');if(x)x.remove();document.removeEventListener('click',cl)}),0)}};

/* ---- detalle de una venta, como Shopify ---- */
const IcS={mail:'<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',tel:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',bag:'<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',id:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h3"/>',truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',pin:'<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'};
const icS=k=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${IcS[k]}</svg>`;
const PILL={pendiente:['am','Esperando pago'],pagado:['ok','Pagada'],en_camino:['az','En camino'],entregado:['ok','Entregada'],cancelado:['ro','Cancelada']};
async function cambiarEstado(o,est){let tr_=null;
  if(est==='en_camino'){tr_=prompt('Código de seguimiento o datos del envío de Pailos (opcional):',o.tracking_envio||'');if(tr_===null)return}
  if(est==='cancelado'&&!confirm(`¿Cancelar la venta #${o.id}? Si ya tenía factura, se genera la nota de crédito.`))return;
  const {data:{session}}=await sb.auth.getSession();const rr=await fetch('/api/estado',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({id:o.id,estado:est,...(tr_?{tracking_envio:tr_}:{})})});const dd=await rr.json().catch(()=>({}));
  if(!rr.ok)return toast(dd.error||'No se pudo cambiar el estado');toast(dd.mail?'Listo, y le avisamos al cliente por mail':'Listo');await loadOrders();drawOrders()}
async function ordDet(o){
  const [{data:fa},{data:dv},{data:dp},{data:ot}]=await Promise.all([sb.from('facturas').select('*').eq('order_id',o.id),sb.from('devoluciones').select('*').eq('order_id',o.id),sb.from('despachos').select('*').eq('order_id',o.id),
    o.email?sb.from('orders').select('id,created_at,estado,total').eq('email',o.email).order('created_at'):Promise.resolve({data:[]})]);
  if(ORD_SEL!==o.id)return;
  const its=o.order_items||[],PB=Object.fromEntries((prods||[]).map(p=>[p.id,p])),sub=its.reduce((a,i)=>a+i.precio*i.cantidad,0),uds=its.reduce((a,i)=>a+i.cantidad,0);
  const ot2=(ot||[]).some(x=>x.id===o.id)?ot:[...(ot||[]),o],okC=ot2.filter(x=>x.estado!=='cancelado'&&x.estado!=='pendiente'),nro=okC.findIndex(x=>x.id===o.id)+1;
  const tk=o.tracking||{},utm=tk.utm||{},fuente=utm.utm_source||utm.source||(tk.fbclid||tk.fbc?'Meta (anuncio)':tk.gclid?'Google (anuncio)':tk.referrer?String(tk.referrer).replace(/^https?:\/\/(www\.)?/,'').split('/')[0]:'Directo');
  const P=PILL[o.estado]||['',o.estado],desp=o.estado==='pagado'?['am','Por despachar']:o.estado==='en_camino'?['az','Despachada']:o.estado==='entregado'?['ok','Entregada']:null;
  const sec=o.estado==='pendiente'?'Esperando el pago':o.estado==='pagado'?'Por despachar':o.estado==='en_camino'?'En camino':o.estado==='entregado'?'Entregada':'Cancelada';
  const act=o.estado==='pendiente'?['pagado','Marcar como pagada']:o.estado==='pagado'?['en_camino','Marcar como despachada']:o.estado==='en_camino'?['entregado','Marcar como entregada']:null;
  const tel=typeof waNum==='function'?waNum(o.telefono):String(o.telefono||'').replace(/\D/g,'');
  const fl=d=>new Date(d).toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const TL=[{f:o.created_at,t:`Se hizo la compra en ${o.canal==='profesional'?'el panel de profesionales':'la tienda online'}`},
    ...(fa||[]).map(f=>({f:f.created_at,t:`${f.tipo==='NC-B'?'Nota de crédito':'Factura B'}: ${f.estado}${f.numero?' N° '+f.numero:''}`})),
    ...(dp||[]).map(d=>({f:d.created_at,t:`Orden de despacho a Pailos${d.fecha_entrega?' · entrega '+d.fecha_entrega:''}`})),
    ...(dv||[]).map(d=>({f:d.created_at,t:`Devolución registrada: ${ars(d.monto)} (${d.motivo})`})),
    ...(o.recordado_at?[{f:o.recordado_at,t:'Se le mandó el mail de compra sin terminar'}]:[])].sort((a,b)=>new Date(b.f)-new Date(a.f));
  $('#m').innerHTML=`<div class="od-nav"><button id="odb" aria-label="Volver">←</button>${icS('bag')}<span>Ventas</span></div>
  <div class="od-g"><div>
   <h1 class="od-h">Venta #${o.id} <span class="op ${P[0]}">${P[1]}</span>${desp&&o.estado!=='entregado'?`<span class="op ${desp[0]}">${icS('truck')} ${desp[1]}</span>`:''}</h1>
   <p class="od-sub">${new Date(o.created_at).toLocaleString('es-AR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})} · ${o.canal==='profesional'?'Profesionales':'Tienda online'}</p>
   <div class="od-sec"><h3><span class="op ${desp?desp[0]:P[0]}">${icS('truck')}</span>${sec}</h3>
    ${tel?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${tel}">WhatsApp</a>`:''}${['pagado','en_camino','entregado'].includes(o.estado)&&typeof abrirDevolucion==='function'?'<button class="btn" id="oddv">Devolución</button>':''}
    ${act?`<button class="btn negro" data-est="${act[0]}">${act[1]}</button>`:''}</div>
   <div class="od-card"><div class="od-ch"><span>${icS('truck')} ${esc(o.envio||'Envío')}</span><span>${icS('pin')} Depósito Pailos</span></div>
    ${its.map(i=>{const p=PB[i.product_id];return `<div class="od-it">${p&&p.img?`<img src="${esc(src(p.img))}" alt="">`:'<img alt="" style="visibility:hidden">'}<div><b>${esc(i.products?i.products.tipo+' '+i.products.nombre:i.product_id)}</b><br>${i.color?`<span class="chip">${esc(i.color)}</span>`:''}${i.regla?` <span class="chip">${esc(i.regla)}</span>`:''}</div><div class="q">${ars(i.precio)} × <i>${i.cantidad}</i></div><div class="t">${ars(i.precio*i.cantidad)}</div></div>`}).join('')}</div>
   <div class="od-sec"><h3>Pago</h3></div>
   <div class="od-card"><div class="od-pay">
    <div><b style="text-align:left;font-weight:400">Subtotal</b><span>${uds} artículo${uds===1?'':'s'}</span><em>${ars(sub)}</em></div>
    ${o.descuento?`<div><b style="text-align:left;font-weight:400">Descuento</b><span>${esc(o.cupon||'promoción')}</span><em>− ${ars(o.descuento)}</em></div>`:''}
    <div><b style="text-align:left;font-weight:400">Envío</b><span>${esc(o.envio||'')}</span><em>${o.costo_envio?ars(o.costo_envio):'Gratis'}</em></div>
    <div class="tot"><b style="text-align:left">Total</b><span></span><b>${ars(o.total)}</b></div></div>
    <div class="od-foot"><span>${esc(medioTxt(o))}</span><span>${o.comision_real!=null?'Comisión Mercado Pago '+ars(o.comision_real):o.medio_pago==='transferencia'?'Sin comisión':'Comisión de Mercado Pago: se completa cuando se acredita'}</span></div></div>
  </div>
  <aside class="od-side">
   <div><h2>${esc(o.nombre||'Cliente')}</h2>${o.email?`<div class="ln">${icS('mail')}<a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>`:''}${o.telefono?`<div class="ln">${icS('tel')}${esc(o.telefono)}</div>`:''}<div class="ln">${icS('bag')}${okC.length} compra${okC.length===1?'':'s'}</div>${o.dni?`<div class="ln">${icS('id')}DNI ${esc(o.dni)}</div>`:''}</div>
   <div><h4>Dirección de envío</h4><p>${esc(o.nombre||'')}<br>${esc(o.direccion||'—')}<br>${o.cp?'CP '+esc(o.cp):''}</p>${o.bultos?`<p class="hint">${o.bultos} bulto${o.bultos>1?'s':''}</p>`:''}${o.tracking_envio?`<p class="hint">Seguimiento: ${esc(o.tracking_envio)}</p>`:''}</div>
   <div><h4>Factura</h4>${(fa||[]).length?(fa||[]).map(f=>`<p>${f.tipo==='NC-B'?'Nota de crédito':'Factura B'} · ${esc(f.estado)}${f.numero?' · '+String(f.pto_vta||'').padStart(4,'0')+'-'+String(f.numero).padStart(8,'0'):''}</p>`).join(''):'<p class="hint">Todavía sin factura.</p>'}</div>
   <div><h4>De dónde vino</h4><p>${nro>0?`Es su compra n° ${nro}`:'Todavía no pagó'}</p><p>Fuente: ${esc(fuente)}${utm.utm_campaign?' · '+esc(utm.utm_campaign):''}</p>${tk.landing_url?`<p class="hint" style="font-size:12.5px">Entró por: ${esc(String(tk.landing_url).replace(/^https?:\/\/[^/]+/,'')||'/')}</p>`:''}</div>
   <div><h4>Historial</h4><div class="od-tl">${TL.map(x=>`<div><span>${esc(x.t)}</span><small>${fl(x.f)}</small></div>`).join('')}</div></div>
  </aside></div>`;
  $('#odb').onclick=()=>{ORD_SEL=null;drawOrders()};
  const ab=$('#m').querySelector('[data-est]');if(ab)ab.onclick=()=>cambiarEstado(o,ab.dataset.est);
  const dvb=$('#oddv');if(dvb)dvb.onclick=()=>abrirDevolucion(o);
  document.body.classList.add('od-on');window.scrollTo(0,0)}
(function(){const _o=drawOrders;drawOrders=function(){const o=ORD_SEL&&(orders||[]).find(x=>x.id===ORD_SEL);if(o){ordDet(o);return}ORD_SEL=null;document.body.classList.remove('od-on');
  const r=_o.apply(this,arguments);
  $('#m').querySelectorAll('select[data-o]').forEach(s=>{const tr=s.closest('tr');if(!tr)return;tr.dataset.ver=s.dataset.o;tr.title='Tocá para ver el detalle';
    tr.onclick=e=>{if(e.target.closest('select,a,button,input,label'))return;ORD_SEL=+tr.dataset.ver;drawOrders()}});return r}})();

/* ---- pantalla: Comparar canales ---- */
async function drawCanales(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';const V=await ventasRent();if(tab!=='canales')return;
  const now=INI_RANGO?Math.min(Date.now(),+INI_RANGO.d1+DIA-1):Date.now(),h0=new Date();h0.setHours(0,0,0,0);
  const from=INI_RANGO?INI_RANGO.d0:PER===1?h0:PER?new Date(now-PER*DIA):new Date(0);
  const X=V.filter(v=>new Date(v.f)>=from&&new Date(v.f)<=now),S=(a,k)=>a.reduce((s,v)=>s+(v[k]||0),0);
  const C=[['pub','Tienda online','#0e0e0f'],['pro','Profesionales','#2a78d6'],['may','Mayoristas','#1baf7a']].map(([k,t,c])=>{const a=X.filter(v=>v.canal===k);return {k,t,c,a,n:a.length,tot:S(a,'total'),ve:S(a,'venta'),cp:S(a,'cprod'),com:S(a,'com'),env:S(a,'env'),imp:S(a,'iibb')+S(a,'chq'),g:S(a,'g'),cli:new Set(a.map(v=>v.em||v.cli)).size}});
  const TT={t:'Total',n:X.length,tot:S(X,'total'),ve:S(X,'venta'),cp:S(X,'cprod'),com:S(X,'com'),env:S(X,'env'),imp:S(X,'iibb')+S(X,'chq'),g:S(X,'g'),cli:new Set(X.map(v=>v.em||v.cli)).size},A=[...C,TT];
  const per=INI_RANGO?rangoTxt():PER===1?'hoy':PER?`últimos ${PER} días`:'desde el inicio';
  const F=[['Ventas (pedidos)',x=>x.n],['Clientes distintos',x=>x.cli],['Facturación con IVA',x=>ars(x.tot)],['Venta sin IVA',x=>ars(x.ve)],['Costo de los productos',x=>ars(x.cp)],['Comisiones de cobro',x=>ars(x.com)],['Envíos que pagás vos',x=>ars(x.env)],['Ingresos Brutos y cheque',x=>ars(x.imp)],['Ganancia de las ventas',x=>`<b class="${x.g<0?'neg':''}">${ars(x.g)}</b>`],['Margen',x=>x.ve?pct(x.g/x.ve):'—'],['Ticket promedio',x=>x.n?ars(x.tot/x.n):'—'],['Parte del total vendido',x=>TT.tot?pct(x.tot/TT.tot):'—']];
  $('#m').innerHTML=`<div class="bar ihd"><b>${per}</b><span class="sp"></span>${[[1,'Hoy'],[7,'7 días'],[30,'30 días'],[0,'Todo']].map(([d,l])=>`<button class="btn ${!INI_RANGO&&PER===d?'dk':''}" data-per="${d}">${l}</button>`).join('')}${rangoBtn()}</div>
   <div class="card pad" style="margin-bottom:14px"><h4>Cuánto vende cada canal</h4><div class="cc-bar">${C.map(c=>`<i style="width:${TT.tot?c.tot/TT.tot*100:0}%;background:${c.c}"></i>`).join('')}</div><div class="cc-leg">${C.map(c=>`<span><i style="background:${c.c}"></i>${c.t} ${TT.tot?pct(c.tot/TT.tot):''}</span>`).join('')}</div></div>
   <div class="card wrap"><table class="cc"><thead><tr><th></th>${A.map(x=>`<th>${x.t}</th>`).join('')}</tr></thead><tbody>${F.map(([t,f])=>`<tr class="${t==='Ganancia de las ventas'?'tt':''}"><td>${t}</td>${A.map(x=>`<td>${f(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
   ${(()=>{const M={};X.forEach(v=>{const k=typeof medioGrupo==='function'?medioGrupo(v):v.medio;const x=M[k]||(M[k]={k,n:0,t:0,com:0});x.n++;x.t+=v.total;x.com+=v.com});const L=Object.values(M).sort((a,b)=>b.t-a.t);
     return `<div class="card pad" style="margin-top:14px"><h4>Cómo pagan</h4>${L.length?`<div class="wrap"><table class="cc"><thead><tr><th>Medio de pago</th><th>Ventas</th><th>Cobrado</th><th>Parte del total</th><th>Comisión</th></tr></thead><tbody>${L.map(m=>`<tr><td>${esc(m.k)}</td><td>${m.n}</td><td>${ars(m.t)}</td><td>${TT.tot?pct(m.t/TT.tot):'—'}</td><td>${m.t?pct(m.com/m.t):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Sin ventas en este período.</p>'}<p class="hint">La comisión es la real que informa Mercado Pago. Transferencia no paga.</p></div>`})()}
   <p class="hint" style="margin-top:10px">"Ganancia de las ventas" es antes de anuncios y gastos fijos (esos no son de un canal en particular). La ganancia final está en Estado de resultados.</p>`;
  $('#m').querySelectorAll('[data-per]').forEach(b=>b.onclick=()=>{PER=+b.dataset.per;drawCanales()});rangoBind(()=>drawCanales())}
(function(){const _d=draw;draw=async function(){if(!['pedidos','ppedidos'].includes(tab))ORD_SEL=null;if(!ORD_SEL)document.body.classList.remove('od-on');const tt=document.querySelector('.rgw');if(tt)tt.remove();
  if(tab==='canales'){drawNav();return drawCanales()}return _d.apply(this,arguments)}})();
