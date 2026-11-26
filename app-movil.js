/* ---------- App del panel en el celular (estilo app de Shopify) ----------
   · Inicio propio para el celular: en vivo, ventas, pedidos, gráfico, "Tu actividad" y últimos pedidos.
   · Barra de abajo: Inicio · Pedidos · Productos · Alertas · Menú.
   · Se puede instalar como app ("Agregar a pantalla de inicio"): ver admin.webmanifest y sw-admin.js.
   En la compu todo queda igual que antes. */
(function(){
const MOV=()=>innerWidth<=720;
let AP={per:7,full:false,t:null};
const $m=()=>document.getElementById('m');
const arsC=n=>'$'+Math.round(n||0).toLocaleString('es-AR');
const kC=n=>{const a=Math.abs(n||0);return a>=1e6?'$'+(a/1e6).toFixed(a>=1e7?0:1).replace('.',',')+' M':a>=1e4?'$'+Math.round(a/1e3)+' mil':arsC(a)};
const haceC=d=>{const s=Math.round((Date.now()-new Date(d))/1000);return s<60?'recién':s<3600?`hace ${Math.round(s/60)} min`:s<86400?`hace ${Math.round(s/3600)} h`:`hace ${Math.round(s/86400)} d`};
const VEND=['pagado','en_camino','entregado'];
const EST={pendiente:'Sin pagar',pagado:'Pagado',en_camino:'En camino',entregado:'Entregado',cancelado:'Cancelado'};
const saludo=()=>{const h=new Date().getHours();return h<6?'¡Buenas noches':h<13?'¡Buen día':h<20?'¡Buenas tardes':'¡Buenas noches'};
const pct=(a,b)=>!b?(a?'nuevo':''):((a-b)/b*100);
const chip=v=>v===''?'':v==='nuevo'?'<i class="ap-up">nuevo</i>':`<i class="${v>=0?'ap-up':'ap-dn'}">${v>=0?'↑':'↓'} ${Math.abs(v).toFixed(0)}%</i>`;

function grafico(D){const W=340,H=120,mx=Math.max(1,...D.map(d=>d.v)),n=D.length;
  const x=i=>n<2?W/2:i/(n-1)*W,y=v=>H-6-(v/mx)*(H-16);
  const pts=D.map((d,i)=>`${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ');
  const ticks=[0,Math.floor((n-1)/2),n-1].filter((v,i,a)=>a.indexOf(v)===i);
  return `<svg viewBox="0 0 ${W} ${H}" class="ap-ch" preserveAspectRatio="none" aria-label="Ventas por día">
   <line x1="0" y1="${H-6}" x2="${W}" y2="${H-6}" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 4"/>
   <polyline points="${x(0)},${H-6} ${pts} ${x(n-1)},${H-6}" fill="rgba(110,160,255,.14)" stroke="none"/>
   <polyline points="${pts}" fill="none" stroke="#8ab4ff" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg><div class="ap-tk">${ticks.map(i=>`<span>${D[i].l}</span>`).join('')}</div>`}

async function drawInicioMovil(silencioso){
  clearTimeout(AP.t);
  if(!silencioso)$m().innerHTML='<p class="hint">Cargando…</p>';
  const DIA=864e5,now=Date.now(),hoy0=new Date();hoy0.setHours(0,0,0,0);
  const from=AP.per===1?+hoy0:now-AP.per*DIA,largo=now-from,prev=from-largo;
  const [{data:os},{data:ev},{data:fs},{data:bl},{data:pe},{data:pro}]=await Promise.all([
    sb.from('orders').select('id,estado,total,medio_pago,created_at,nombre').gte('created_at',new Date(Math.min(prev,now-90*DIA)).toISOString()).order('created_at',{ascending:false}).limit(3000),
    sb.from('eventos').select('created_at,visitante').gte('created_at',new Date(Math.max(from,now-90*DIA)).toISOString()).limit(20000),
    sb.from('facturas').select('order_id,estado').in('estado',['pendiente','error']),
    sb.rpc('productos_bloqueados'),
    sb.from('eco_pedidos').select('nombre,estado'),
    sb.from('profesionales').select('id,estado').eq('estado','pendiente')]);
  if(tab!=='inicio'||AP.full)return;
  const O=os||[],E=ev||[],vend=o=>VEND.includes(o.estado);
  const cur=O.filter(o=>vend(o)&&+new Date(o.created_at)>=from),old=O.filter(o=>vend(o)&&+new Date(o.created_at)>=prev&&+new Date(o.created_at)<from);
  const S=a=>a.reduce((s,o)=>s+(+o.total||0),0),tot=S(cur),totP=S(old);
  const vis=new Set(E.filter(e=>+new Date(e.created_at)>=from).map(e=>e.visitante)).size;
  const vivo=new Set(E.filter(e=>now-new Date(e.created_at)<5*6e4).map(e=>e.visitante)).size;
  const nd=AP.per===1?1:AP.per,D=[];
  if(AP.per===1){for(let h=0;h<=new Date().getHours();h++){const a=+hoy0+h*36e5,b=a+36e5;D.push({l:h+'h',v:S(cur.filter(o=>{const t=+new Date(o.created_at);return t>=a&&t<b}))})}}
  else for(let i=nd-1;i>=0;i--){const d=new Date(+hoy0-i*DIA),k=d.toDateString();D.push({l:d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}).replace('.',''),v:S(cur.filter(o=>new Date(o.created_at).toDateString()===k))})}
  const transf=O.filter(o=>o.estado==='pendiente'&&o.medio_pago==='transferencia'),desp=O.filter(o=>o.estado==='pagado');
  const fac=fs||[],ocu=bl||[],enCam=(pe||[]).filter(p=>['confirmado','en_transito'].includes(p.estado)),pros=pro||[];
  const ACT=[
   {n:transf.length,t:'Transferencias por confirmar',s:transf.length?arsC(S(transf)):'Nada pendiente',go:'pedidos',i:'M4 7h16M4 12h16M4 17h10'},
   {n:desp.length,t:'Pedidos para despachar',s:desp.length?'Pagados, falta mandar':'Todo despachado',go:'pedidos',i:'M3 7h11v9H3zM14 10h4l3 3v3h-7'},
   {n:fac.length,t:'Facturas sin CAE',s:fac.length?'Pedidos '+fac.slice(0,3).map(f=>'#'+f.order_id).join(', '):'Todas emitidas',go:'facturas',i:'M6 3h9l3 3v15H6zM9 10h6M9 14h6'},
   {n:ocu.length,t:'Ocultos por error',s:ocu.length?'Se sacaron de la web':'Ninguno',go:'alertas',i:'M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6zM4 4l16 16'},
   {n:pros.length,t:'Profesionales por aprobar',s:pros.length?'Pidieron acceso':'Ninguno',go:'pcuentas',i:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'},
   {n:enCam.length,t:'Contenedores en camino',s:enCam.length?enCam.map(p=>p.nombre).join(', '):'Ninguno',go:'eco',i:'M2 16h20l-2 4H4zM5 16V9h14v7',info:1}];
  const pend=ACT.filter(a=>!a.info).reduce((s,a)=>s+a.n,0);
  const ult=O.slice(0,6);
  const P=[[1,'Hoy'],[7,'7 días'],[30,'30 días'],[90,'90 días']];
  $m().innerHTML=`<div class="ap">
   <section class="ap-top">
    <div class="ap-hd"><span class="ap-av">FC</span><b>Tienda online</b><span class="sp"></span><button class="ap-bell" data-ago="alertas" aria-label="Alertas / pendientes"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>${pend?`<i>${pend>99?'99+':pend}</i>`:''}</button></div>
    <div class="ap-kp">
     <div><span>En vivo</span><b><i class="ap-dot"></i>${vivo}</b></div>
     <div class="ap-main"><span>Ventas totales</span><b>${kC(tot)}</b>${chip(pct(tot,totP))}</div>
     <div><span>Pedidos</span><b>${cur.length}</b>${chip(pct(cur.length,old.length))}</div>
     <div><span>Visitantes</span><b>${vis}</b></div>
     <div><span>Ticket promedio</span><b>${kC(cur.length?tot/cur.length:0)}</b></div>
    </div>
    ${grafico(D)}
    <div class="ap-per">${P.map(([v,l])=>`<button class="${AP.per===v?'on':''}" data-aper="${v}">${l}</button>`).join('')}<span class="sp"></span><button class="ap-inf" data-afull>Ver informe</button></div>
   </section>
   <section class="ap-act">
    <h2>${saludo()}! Esta es tu actividad</h2>
    <div class="ap-cards">${ACT.map(a=>`<button class="ap-card${a.n&&!a.info?' hot':''}" data-ago="${a.go}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${a.i}"/></svg><span>${a.t}</span><b>${a.n}</b><small>${esc(a.s)}</small></button>`).join('')}</div>
    <div class="ap-sec"><h3>Últimos pedidos</h3><button class="lnk" data-ago="pedidos">Ver todos</button></div>
    <div class="ap-list">${ult.map(o=>`<button class="ap-row" data-ago="pedidos"><span><b>#${o.id}</b> ${esc((o.nombre||'').split(' ')[0])}<small>${haceC(o.created_at)} · ${o.medio_pago==='transferencia'?'Transferencia':'Mercado Pago'}</small></span><span class="n"><b>${arsC(o.total)}</b><small class="ap-e ap-${o.estado}">${EST[o.estado]||o.estado}</small></span></button>`).join('')||'<p class="hint">Todavía no hay pedidos.</p>'}</div>
    <button class="ap-ask" data-aask><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16v11H9l-5 4z"/></svg>Preguntar algo del negocio</button>
    ${appInstalada()?'':`<div class="ap-inst"><b>Tené el panel como app</b><p>${/iPhone|iPad/.test(navigator.userAgent)?'En Safari tocá el botón Compartir (el cuadrado con la flecha) y después "Agregar a pantalla de inicio".':'Tocá los tres puntitos del navegador y después "Agregar a la pantalla principal" o "Instalar app".'} Queda un ícono "forma" que abre el panel a pantalla completa.</p></div>`}
   </section></div>`;
  const m=$m();
  m.querySelectorAll('[data-aper]').forEach(b=>b.onclick=()=>{AP.per=+b.dataset.aper;drawInicioMovil()});
  m.querySelectorAll('[data-ago]').forEach(b=>b.onclick=()=>{tab=b.dataset.ago;draw()});
  m.querySelector('[data-afull]').onclick=()=>{AP.full=true;draw()};
  m.querySelector('[data-aask]').onclick=()=>{if(typeof chatAbrir==='function')chatAbrir()};
  AP.t=setTimeout(()=>{if(tab==='inicio'&&!AP.full&&!document.hidden)drawInicioMovil(true)},60000);
}
const appInstalada=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

/* el Inicio y los suscriptores: en el celular va el Inicio nuevo (con "Ver informe" se ve el completo) */
if(typeof drawInicio==='function'){const _di=drawInicio;drawInicio=async function(){if(!AP.full){try{return await drawInicioMovil.apply(this,arguments)}catch(e){console.error(e);AP.full=true}}return _di.apply(this,arguments)}}
if(typeof drawSubs==='function'){const _ds=drawSubs;drawSubs=async function(){if(!AP.full)return;return _ds.apply(this,arguments)}}

/* barra de abajo (sólo celular) */
const TABS=[['inicio','Inicio','M3 10.5 12 4l9 6.5V20h-6v-6H9v6H3z'],['pedidos','Pedidos','M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0'],['productos','Productos','M3 12V4h8l10 10-8 8zM7.5 8.5h.01'],['alertas','Alertas','M12 4 2.5 20h19zM12 10v4M12 17v.5'],['menu','Menú','M4 7h16M4 12h16M4 17h16']];
function barra(){let b=document.getElementById('apbar');
  if(!document.querySelector('.tn')){if(b)b.remove();return}
  if(!b){document.body.insertAdjacentHTML('beforeend','<nav class="apbar" id="apbar" aria-label="Accesos"></nav>');b=document.getElementById('apbar');
    b.onclick=e=>{const x=e.target.closest('[data-abt]');if(!x)return;const k=x.dataset.abt;if(k==='menu'){document.body.classList.toggle('tn-open');return}document.body.classList.remove('tn-open');if(k==='inicio')AP.full=false;tab=k;draw()}}
  b.innerHTML=TABS.map(([k,l,d])=>`<button data-abt="${k}" class="${tab===k?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg><span>${l}</span></button>`).join('')}
if(typeof window.drawNav==='function'){const _dn=window.drawNav;window.drawNav=function(){const r=_dn.apply(this,arguments);try{barra()}catch(e){}return r}}
/* si se sale del Inicio, la próxima vez vuelve el Inicio del celular */
if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab!=='inicio')AP.full=false;const r=await _d.apply(this,arguments);try{barra()}catch(e){}return r}}

/* si el panel ya se dibujó antes de que cargue este archivo, se vuelve a dibujar con el Inicio del celular */
let vig=0;const vigT=setInterval(()=>{vig++;if(vig>60)return clearInterval(vigT);try{if(typeof user!=='undefined'&&user&&document.querySelector('.tn')){if(!document.getElementById('apbar'))barra();if(tab==='inicio'&&!AP.full&&!document.querySelector('.ap')&&!/Cargando/.test(($m()||{}).textContent||'')){clearInterval(vigT);drawInicioMovil()}}}catch(e){}},500);
/* app instalable */
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw-admin.js',{scope:'/admin'}).catch(()=>{}));

document.head.insertAdjacentHTML('beforeend',`<style>
@media (max-width:720px){
 body{padding-bottom:calc(64px + env(safe-area-inset-bottom))}
 .apbar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;background:#fff;border-top:1px solid var(--line);padding:4px 4px calc(4px + env(safe-area-inset-bottom))}
 .apbar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:0;padding:6px 0;color:#6d7175;font-size:10.5px;cursor:pointer}
 .apbar button.on{color:#141414}.apbar button.on svg{stroke-width:2.1}
 body:has(.ap) .tn-ph{display:none}
 body:has(.ap) .tn-main main{padding:0 0 24px}
}
@media (min-width:721px){.apbar{display:none}
}
.ap-top{background:#141414;color:#fff;padding:14px 16px 12px;border-radius:0 0 18px 18px}
.ap-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}.ap-hd b{font-size:15px}
.ap-av{width:30px;height:30px;border-radius:50%;background:#7c3aed;display:grid;place-items:center;font-size:12px;font-weight:600}
.ap-bell{position:relative;background:none;border:0;color:#fff;padding:4px;cursor:pointer}.ap-bell i{position:absolute;top:-2px;right:-4px;background:#e0322b;color:#fff;font-style:normal;font-size:10px;font-weight:700;min-width:17px;height:17px;border-radius:9px;display:grid;place-items:center;padding:0 4px}
.ap-kp{display:flex;gap:18px;overflow-x:auto;scrollbar-width:none;padding-bottom:6px}.ap-kp::-webkit-scrollbar{display:none}
.ap-kp>div{flex:none;display:flex;flex-direction:column;gap:2px}.ap-kp span{font-size:12px;color:rgba(255,255,255,.6)}.ap-kp b{font-size:19px;font-weight:600;display:flex;align-items:center;gap:6px}
.ap-kp .ap-main{background:rgba(255,255,255,.09);border-radius:10px;padding:6px 10px}
.ap-kp i{font-style:normal;font-size:11px}.ap-up{color:#5fd39a}.ap-dn{color:#ff8a80}
.ap-dot{width:8px;height:8px;border-radius:50%;background:#5fd39a;box-shadow:0 0 0 3px rgba(95,211,154,.25);display:inline-block}
.ap-ch{width:100%;height:150px;display:block;margin-top:6px}
.ap-per{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap}.ap-per button{background:rgba(255,255,255,.1);color:#fff;border:0;border-radius:16px;padding:6px 11px;font-size:12px;cursor:pointer}.ap-per button.on{background:#fff;color:#141414}
.ap-per .ap-inf{background:none;border:1px solid rgba(255,255,255,.3)}
.ap-act{padding:16px 14px 0}.ap-act h2{font:600 17px var(--f);margin:2px 2px 12px}
.ap-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ap-card{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;cursor:pointer;color:#303030}
.ap-card span{font-size:12.5px;line-height:1.25}.ap-card b{font-size:22px;color:#141414}.ap-card small{font-size:11px;color:#6d7175;line-height:1.3}
.ap-card.hot{border-color:#f1c27a;background:#fffaf0}.ap-card.hot b{color:#b25e09}
.ap-sec{display:flex;align-items:center;justify-content:space-between;margin:20px 2px 8px}.ap-sec h3{font:600 15px var(--f);margin:0}
.ap-list{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ap-row{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);padding:11px 12px;cursor:pointer;color:#303030}.ap-row:last-child{border-bottom:0}
.ap-row small{display:block;font-size:11px;color:#6d7175;margin-top:2px}.ap-row .n{text-align:right}
.ap-e{display:inline-block!important;padding:1px 7px;border-radius:9px;background:#eef0f2}.ap-pagado{background:#e3f5ea!important;color:#1b7a45!important}.ap-pendiente{background:#fff1d6!important;color:#8a5a00!important}.ap-cancelado{background:#fde8e8!important;color:#b42318!important}.ap-en_camino{background:#e6effc!important;color:#1f5fbf!important}
.ap-ask{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:16px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer;font-size:14px}
.ap-tk{display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.55);margin-top:2px}
/* compu: el mismo Inicio, más ancho */
@media (min-width:721px){
 .ap{max-width:1180px}.ap .ap-top{border-radius:18px;padding:20px 24px 16px}.ap .ap-kp{gap:34px}.ap .ap-kp b{font-size:24px}.ap .ap-ch{height:200px}.ap .ap-tk{font-size:11px}
 .ap .ap-act{padding:22px 0 0}.ap .ap-act h2{font-size:19px}.ap .ap-cards{grid-template-columns:repeat(3,1fr);gap:12px}.ap .ap-card{padding:16px}
 .ap .ap-list{display:grid;grid-template-columns:1fr 1fr}.ap .ap-row{border-right:1px solid var(--line)}.ap .ap-ask{max-width:420px}
}
.ap-inst{margin-top:14px;padding:12px 14px;border-radius:12px;background:#f1f2f4;font-size:13px;line-height:1.45}.ap-inst p{margin:4px 0 0}
</style>`);
})();
