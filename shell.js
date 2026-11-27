/* ---------- Estructura del panel al estilo Tiendanube (Nimbus): menú lateral con íconos, barra superior, título de página,
   fondo gris claro, tarjetas blancas y acción principal azul. No se elimina ninguna pantalla: sólo se reordenan. ---------- */
(function(){
const IC={
 inicio:'<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 alertas:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17v.5"/>',
 stats:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 ventas:'<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
 prods:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
 clientes:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 desc:'<path d="m5 19 14-14"/><circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/>',
 mkt:'<path d="M3 10v4l13 5V5z"/><path d="M16 9h3a2 2 0 0 1 0 4h-3"/>',
 online:'<rect x="3" y="4" width="18" height="14" rx="1.5"/><path d="M8 21h8M12 18v3"/>',
 imp:'<path d="M2 16h20l-2 4H4z"/><path d="M5 16V9h14v7M9 9V5h6v4"/>',
 config:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'};
/* menú: [clave, etiqueta, [[pantalla, etiqueta], ...]] — mismas pantallas de siempre, ordenadas como Tiendanube */
const MENU=[
 ['§ver','Para ver (no se edita)',[]],
 ['inicio','Inicio',[['inicio','Panel general'],['resumen','Resumen rápido'],['resultados','Estado de resultados'],['campanias','Anuncios y ROAS'],['guia','Cómo funciona todo']]],
 ['alertas','Alertas / pendientes',[['alertas','Alertas / pendientes']]],
 ['ventas','Ventas',[['pedidos','Lista de ventas'],['facturas','Facturas'],['ppedidos','Ventas a profesionales']]],
 ['clientes','Clientes',[['clientes','Lista de clientes'],['pcuentas','Profesionales'],['pro','Mayoristas']]],
 ['§cargar','Para cargar, en este orden',[]],
 ['imp','1. Importación',[['maestro','Maestro de productos'],['maestro|nuevo','Nuevo producto'],['maestro|importar','Importar cotización (RFQ)'],['eco','Contenedores (proforma y precios)'],['compras','Órdenes a proveedores']]],
 ['prods','2. Productos',[['productos','Lista de productos'],['paleta','Colores'],['nacionales','Productos nacionales'],['stock','Inventario (Pailos)']]],
 ['desc','3. Precios y promociones',[['promos','Promociones y códigos'],['rent','Reglas de precio y medios de pago'],['pprecios','Precios profesionales']]],
 ['online','4. Tienda online',[['fotos','Fotos de la página'],['cartel','Cartel de arriba'],['portada','Cuenta regresiva (portada)'],['textos','Textos de la página'],['frm','FRM Studio'],['envios','Envíos y retiro']]],
 ['mkt','5. Marketing',[['mailpromo','Mail a toda la lista'],['mails','Mails automáticos']]],
 ['gastos','6. Gastos',[['gastos','Gastos y depósito']]]];
const PIE=['config','Configuración',[['ecopar','Costos y parámetros']]];
/* cualquier pantalla que exista y no esté en el menú, se suma para no perder nada */
const todas=new Set([...MENU,PIE].flatMap(g=>g[2].map(s=>s[0])));
const extra=GRUPOS.flatMap(g=>g[2]).filter(s=>!todas.has(s[0]));
if(extra.length)MENU.push(['otros','Otros',extra]);
GRUPOS.length=0;GRUPOS.push(...MENU,PIE);
/* grupos desplegados: quedan como los dejaste (también al recargar). El de la pantalla actual arranca abierto salvo que lo cierres. */
const NAVK='fc_nav_v2';let NAV={a:[],c:[]};try{NAV=Object.assign(NAV,JSON.parse(localStorage.getItem(NAVK)||'{}'))}catch(e){}
let abiertos=new Set(NAV.a),cerrados=new Set(NAV.c);
const navSave=()=>{try{localStorage.setItem(NAVK,JSON.stringify({a:[...abiertos],c:[...cerrados]}))}catch(e){}};
const estaAbierto=g=>abiertos.has(g[0])||(g[2].some(s=>s[0]===tab)&&!cerrados.has(g[0]));

const ico=k=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${IC[k]||IC.inicio}</svg>`;
/* sub-pantallas del Maestro (nuevo producto / importar) */
const mv=()=>typeof MVIEW!=='undefined'?MVIEW:'lista';
const subOn=k=>k.includes('|')?tab==='maestro'&&mv()===k.split('|')[1]:k===tab&&!(k==='maestro'&&mv()!=='lista');
const item=g=>{if(g[0][0]==='§')return `<div class="tn-sec">${g[1]}</div>`;const act=g[2].some(s=>s[0]===tab),uno=g[2].length===1,ab=estaAbierto(g);
  return `<div class="tn-g${act?' act':''}"><button class="tn-i${act&&uno?' on':''}" data-gk="${g[0]}">${ico(g[0])}<span>${g[1]}</span>${uno?'':`<i class="tn-ch${ab?' up':''}"></i>`}</button>
   ${uno||!ab?'':`<div class="tn-sub">${g[2].map(s=>`<button class="${subOn(s[0])?'on':''}" data-t="${s[0]}">${s[1]}</button>`).join('')}</div>`}</div>`};
window.drawNav=function(){const n=document.getElementById('gnav'),f=document.getElementById('gfoot');if(!n)return;
  n.innerHTML=MENU.map(item).join('');f.innerHTML=item(PIE);
  const lab=[...MENU,PIE].flatMap(g=>g[2]).find(s=>s[0]===tab);const t=document.getElementById('tnt');if(t)t.textContent=lab?lab[1]:'';document.title=(lab?lab[1]+' · ':'')+'FORMA Admin';
  const hp=document.getElementById('tnh');if(hp){const k=tab==='maestro'&&mv()!=='lista'?'maestro|'+mv():tab;hp.innerHTML=window.ayudaHTML?ayudaHTML(k):((window.AYUDA||{})[k]||'')}
  document.querySelectorAll('.tn-side [data-gk]').forEach(b=>b.onclick=()=>{const g=GRUPOS.find(x=>x[0]===b.dataset.gk);if(g[2].length===1){tab=g[2][0][0];cerrarMenu();draw();return}
    /* la flechita sólo abre o cierra: no cambia de pantalla */
    if(estaAbierto(g)){abiertos.delete(g[0]);cerrados.add(g[0])}else{abiertos.add(g[0]);cerrados.delete(g[0])}
    navSave();drawNav()});
  document.querySelectorAll('.tn-side [data-t]').forEach(b=>b.onclick=()=>{const t=b.dataset.t;if(t.includes('|')){tab='maestro';MVIEW=t.split('|')[1];if(MVIEW==='importar')IMP=null}else{tab=t;if(t==='maestro'&&typeof MVIEW!=='undefined')MVIEW='lista'}cerrarMenu();draw()})};
const cerrarMenu=()=>document.body.classList.remove('tn-open');
const _shell=window.shell;
window.shell=function(){
  app.innerHTML=`<div class="tn"><aside class="tn-side"><div class="tn-logo">forma<small>Admin</small></div><nav id="gnav" class="tn-menu"></nav><div id="gfoot" class="tn-foot"></div><div class="tn-foot"><button class="tn-i tn-ask" id="tnask"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1M12 14.6v.1"/></svg><span>Preguntar</span></button></div></aside>
   <div class="tn-back" id="tnbk"></div>
   <div class="tn-main"><header class="tn-top"><button class="tn-hb" id="tnhb" aria-label="Menú">☰</button><span class="sp"></span><a class="tn-a hide-m" href="/" target="_blank">Ver la tienda ↗</a><span class="who hide-m">${esc(user.email)}</span><button class="btn hide-m" id="chp">Cambiar contraseña</button><button class="btn" id="out">Salir</button></header>
   <div class="tn-ph"><h1 id="tnt"></h1><p id="tnh" class="tn-help"></p></div><main id="m"></main></div></div>`;
  document.getElementById('tnhb').onclick=()=>document.body.classList.toggle('tn-open');document.getElementById('tnbk').onclick=cerrarMenu;
  $('#out').onclick=async()=>{await sb.auth.signOut();user=null;viewLogin()};document.getElementById('tnask').onclick=()=>{cerrarMenu();chatAbrir()};$('#chp').onclick=()=>viewNewPass();draw()};
/* si el panel ya se dibujó con la estructura vieja, se rearma */
if(typeof user!=='undefined'&&user&&document.querySelector('header')&&!document.querySelector('.tn')){window.shell()}
})();

(function(){const st=document.createElement('style');st.textContent='.tn-sec{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#8a8f94;padding:14px 10px 4px;font-weight:600}.tn-menu .tn-sec:first-child{padding-top:4px}';document.head.appendChild(st)})();
/* si la sesión se vence (o se cierra en otra pestaña), no mostrar el panel vacío: volver a la pantalla de entrar */
(function(){let vist=false;const chk=async()=>{try{const {data}=await sb.auth.getSession();if(!data.session&&document.getElementById('gnav')&&!vist){vist=true;alert('Tu sesión se cerró. Volvé a entrar.');location.reload()}}catch(e){}};
  sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')chk()});window.addEventListener('focus',chk);setInterval(chk,60000)})();
