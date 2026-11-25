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
 ['inicio','Inicio',[['inicio','Inicio']]],
 ['alertas','Alertas',[['alertas','Alertas']]],
 ['stats','Estadísticas',[['campanias','Anuncios por campaña']]],
 ['ventas','Ventas',[['pedidos','Lista de ventas'],['facturas','Facturas'],['ppedidos','Ventas a profesionales']]],
 ['prods','Productos',[['productos','Lista de productos'],['nacionales','Productos nacionales'],['stock','Inventario (Pailos)'],['paleta','Colores']]],
 ['clientes','Clientes',[['clientes','Lista de clientes'],['pcuentas','Profesionales'],['pro','Mayoristas']]],
 ['desc','Descuentos',[['pprecios','Precios profesionales']]],
 ['mkt','Marketing',[['mails','Mails a clientes']]],
 ['online','Tienda online',[['frm','FRM Studio'],['fotos','Fotos de la página']]],
 ['imp','Importación',[['maestro','Maestro de productos'],['eco','Contenedores'],['compras','Órdenes a proveedores'],['ecopar','Parámetros de importación']]]];
const PIE=['config','Configuración',[['rent','Precios y medios de pago'],['envios','Envíos y retiro']]];
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
const item=g=>{const act=g[2].some(s=>s[0]===tab),uno=g[2].length===1,ab=estaAbierto(g);
  return `<div class="tn-g${act?' act':''}"><button class="tn-i${act&&uno?' on':''}" data-gk="${g[0]}">${ico(g[0])}<span>${g[1]}</span>${uno?'':`<i class="tn-ch${ab?' up':''}"></i>`}</button>
   ${uno||!ab?'':`<div class="tn-sub">${g[2].map(s=>`<button class="${s[0]===tab?'on':''}" data-t="${s[0]}">${s[1]}</button>`).join('')}</div>`}</div>`};
window.drawNav=function(){const n=document.getElementById('gnav'),f=document.getElementById('gfoot');if(!n)return;
  n.innerHTML=MENU.map(item).join('');f.innerHTML=item(PIE);
  const lab=[...MENU,PIE].flatMap(g=>g[2]).find(s=>s[0]===tab);const t=document.getElementById('tnt');if(t)t.textContent=lab?lab[1]:'';document.title=(lab?lab[1]+' · ':'')+'FORMA Admin';
  document.querySelectorAll('.tn-side [data-gk]').forEach(b=>b.onclick=()=>{const g=GRUPOS.find(x=>x[0]===b.dataset.gk);if(g[2].length===1){tab=g[2][0][0];cerrarMenu();draw();return}
    /* la flechita sólo abre o cierra: no cambia de pantalla */
    if(estaAbierto(g)){abiertos.delete(g[0]);cerrados.add(g[0])}else{abiertos.add(g[0]);cerrados.delete(g[0])}
    navSave();drawNav()});
  document.querySelectorAll('.tn-side [data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;cerrarMenu();draw()})};
const cerrarMenu=()=>document.body.classList.remove('tn-open');
const _shell=window.shell;
window.shell=function(){
  app.innerHTML=`<div class="tn"><aside class="tn-side"><div class="tn-logo">forma<small>Admin</small></div><nav id="gnav" class="tn-menu"></nav><div id="gfoot" class="tn-foot"></div></aside>
   <div class="tn-back" id="tnbk"></div>
   <div class="tn-main"><header class="tn-top"><button class="tn-hb" id="tnhb" aria-label="Menú">☰</button><span class="sp"></span><a class="tn-a hide-m" href="/" target="_blank">Ver la tienda ↗</a><span class="who hide-m">${esc(user.email)}</span><button class="btn hide-m" id="chp">Cambiar contraseña</button><button class="btn" id="out">Salir</button></header>
   <div class="tn-ph"><h1 id="tnt"></h1></div><main id="m"></main></div></div>`;
  document.getElementById('tnhb').onclick=()=>document.body.classList.toggle('tn-open');document.getElementById('tnbk').onclick=cerrarMenu;
  $('#out').onclick=async()=>{await sb.auth.signOut();user=null;viewLogin()};$('#chp').onclick=()=>viewNewPass();draw()};
/* si el panel ya se dibujó con la estructura vieja, se rearma */
if(typeof user!=='undefined'&&user&&document.querySelector('header')&&!document.querySelector('.tn')){window.shell()}
})();
