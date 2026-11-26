/* ---------- Ayuda del panel: qué es cada pantalla (sale abajo del título) y el asistente "Preguntar" ----------
   Pensado para que alguien nuevo entienda el panel sin tener que preguntar. Lo usa shell.js. */
window.AYUDA={
 inicio:'Todo el negocio en detalle: ventas, ganancia, márgenes, anuncios, medios de pago, productos y contenedores.',
 resumen:'La vista rápida, como la app de Shopify: en vivo, ventas, pedidos y lo que tenés que hacer hoy. Tocá cualquier tarjeta para ir a esa pantalla.',
 alertas:'Todo lo que necesita que hagas algo. <b>Tocá cada alerta</b> y abajo te dice qué hacer para resolverla.',
 campanias:'Cuánto vendió cada campaña de anuncios (Meta, Google). Necesita los tokens de Meta y Google Analytics cargados.',
 pedidos:'Todos los pedidos de la web. Acá cambiás el estado (pagado, en camino, entregado, cancelado), confirmás transferencias y registrás devoluciones.',
 facturas:'Facturas electrónicas de ARCA: salen solas cuando un pedido pasa a pagado. Si ARCA falla, reintenta sola. Abajo están los datos que salen impresos en la factura.',
 ppedidos:'Pedidos de estudios y profesionales, con su precio especial.',
 productos:'Lo que se ve en la tienda: nombre, fotos, precio, colores, si está publicado y si sale en Destacados.',
 nacionales:'Productos fabricados en Argentina: marcás si están en stock, a pedido o sin stock.',
 stock:'Stock en el depósito de Pailos, contado por caja (un producto puede venir en varias cajas). Podés importar el conteo de Pailos para comparar.',
 paleta:'Los colores FORMA y a qué color de cada proveedor equivalen.',
 clientes:'Quién te compró, cuánto y cuándo.',
 pcuentas:'Cuentas de arquitectos y estudios: acá aprobás los pedidos de acceso.',
 pro:'Cuentas mayoristas.',
 pprecios:'Precio o descuento especial de cada producto para profesionales.',
 mails:'Los textos de los mails automáticos que recibe el cliente (confirmación, pago, factura, despacho). Se pueden editar.',
 frm:'Los proyectos de FRM Studio que aparecen en la web.',
 fotos:'Ves la tienda tal cual es y cambiás cada foto en su lugar con el botón azul "Cambiar foto". En "Lista de fotos" elegís el encuadre o volvés a la original.',
 maestro:`La base de <b>todos</b> los productos cotizados a proveedores: FOB (precio en origen, por pieza), m³ por pieza, packing, MOQ, medidas y estado. De acá salen los contenedores y la tienda.
  <details class="tn-det"><summary>¿Para qué es cada botón?</summary><ul>
  <li><b>+ Nuevo producto</b>: cargar a mano un producto cotizado. El código se arma solo.</li>
  <li><b>Importar cotización</b>: subir el Excel que te devolvió el proveedor (la planilla RFQ completa). Los productos nuevos se dan de alta y los que ya existen se actualizan.</li>
  <li><b>Exportar el Maestro</b>: baja todo a Excel.</li>
  <li><b>Plantilla RFQ</b>: el Excel para pedirle precio a un proveedor. Si filtraste productos salen precargados (una hoja por subcategoría); si no, sale vacía. Lo naranja es lo que el proveedor no puede dejar vacío.</li>
  <li><b>Últimos cambios</b>: qué cambió en el Maestro (FOB, m³, packing), cuándo y desde dónde.</li>
  <li><b>Mandar respaldo ahora</b>: te manda por mail una copia de toda la base (además sale sola los lunes).</li>
  <li><b>⚠ V1–V4</b>: productos cuyo m³, packing o medidas no cierran. Tocá el número rojo de arriba para ver solo esos.</li></ul></details>`,
 'maestro|nuevo':'Cargá un producto que te cotizó un proveedor. FOB y m³ van siempre <b>por pieza</b>. Si tildás "Agregarlo también a la tienda", se crea la ficha de la web.',
 'maestro|importar':'Subí el Excel que te devolvió el proveedor (la planilla RFQ completa o su propia cotización). 1) Elegís proveedor y archivo. 2) Revisás qué columna es cada dato: queda guardado para la próxima vez de ese proveedor. 3) Vista previa: lo nuevo se da de alta y lo que ya existe (por código FORMA o código del proveedor) se actualiza.',
 eco:'Cada contenedor que se importa. Adentro, cada pestaña explica qué muestra.',
 compras:'Armar órdenes de compra y ver todas las proformas y órdenes recibidas, por proveedor.',
 ecopar:'Los números que usan todos los contenedores: tipo de cambio, fletes, capacidad de cada contenedor, seguro, despachante, impuestos y galpón.',
 rent:'Las reglas de precio de la tienda: preventa, descuento por transferencia y cuotas.',
 envios:'Costos y zonas de envío, y el retiro en Lanús.'};

/* ---- asistente del panel ("Preguntar") ---- */
let CHAT=[];try{CHAT=JSON.parse(sessionStorage.getItem('fc_chat')||'[]')}catch(e){}
function chatPintar(){const b=document.getElementById('tcb');if(!b)return;
  b.innerHTML=CHAT.length?CHAT.map(m=>`<div class="tc-m ${m.r}">${esc(m.t).replace(/\n/g,'<br>')}</div>`).join(''):'<p class="hint">Preguntá lo que quieras del panel o del negocio. Por ejemplo: "¿cómo doy de alta un producto nuevo?", "¿qué tengo pendiente?" o "¿qué es el m³ por pieza?"</p>';b.scrollTop=b.scrollHeight}
window.chatAbrir=function(){
  if(!document.getElementById('tchat')){
    document.body.insertAdjacentHTML('beforeend',`<div class="tc-back" id="tcbk"></div><aside class="tchat" id="tchat"><div class="tc-h"><b>Preguntar</b><span class="sp"></span><button class="lnk" id="tcnew">Nueva charla</button><button class="lnk" id="tcx" aria-label="Cerrar">✕</button></div><div class="tc-b" id="tcb"></div><form class="tc-f" id="tcf"><textarea id="tcq" rows="2" placeholder="Escribí tu pregunta…"></textarea><button class="btn dk">Enviar</button></form></aside>`);
    const cerrar=()=>document.body.classList.remove('tc-on');
    document.getElementById('tcx').onclick=cerrar;document.getElementById('tcbk').onclick=cerrar;
    document.getElementById('tcnew').onclick=()=>{CHAT=[];try{sessionStorage.removeItem('fc_chat')}catch(e){}chatPintar()};
    const q=document.getElementById('tcq');q.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('tcf').requestSubmit()}};
    document.getElementById('tcf').onsubmit=async e=>{e.preventDefault();const t=q.value.trim();if(!t)return;q.value='';
      const h=[];for(let i=0;i+1<CHAT.length;i++)if(CHAT[i].r==='u'&&CHAT[i+1].r==='a')h.push({q:CHAT[i].t,a:CHAT[i+1].t});
      CHAT.push({r:'u',t},{r:'a p',t:'Pensando…'});chatPintar();
      let a;try{const {data:{session}}=await sb.auth.getSession();const r=await fetch('/api/asistente',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({q:t,h:h.slice(-6),pantalla:(document.getElementById('tnt')||{}).textContent||tab})});const x=await r.json();a=x.respuesta||x.error||'No hubo respuesta.'}catch(err){a='No pude conectarme. Probá de nuevo.'}
      CHAT[CHAT.length-1]={r:'a',t:a};try{sessionStorage.setItem('fc_chat',JSON.stringify(CHAT.slice(-30)))}catch(e){}chatPintar()}}
  document.body.classList.add('tc-on');chatPintar();setTimeout(()=>document.getElementById('tcq').focus(),50)};
document.head.insertAdjacentHTML('beforeend',`<style>
.tn-help{margin:6px 0 0;max-width:900px;font-size:13px;line-height:1.5;color:#5c5f62}.tn-help b{color:var(--ink)}
.tn-det{margin-top:6px}.tn-det summary{cursor:pointer;color:#2c6ecb;font-weight:500}.tn-det ul{margin:8px 0 0;padding-left:18px}.tn-det li{margin:4px 0}
.tn-ask{width:100%}
.tchat{position:fixed;top:0;right:0;bottom:0;width:min(440px,100%);background:#fff;z-index:80;box-shadow:-8px 0 30px rgba(0,0,0,.12);display:flex;flex-direction:column;transform:translateX(105%);transition:transform .3s}
body.tc-on .tchat{transform:none}.tc-back{position:fixed;inset:0;z-index:79;background:rgba(0,0,0,.2);display:none}body.tc-on .tc-back{display:block}
.tc-h{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)}.tc-h b{font-size:16px}
.tc-b{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.tc-m{max-width:88%;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.5}
.tc-m.u{align-self:flex-end;background:#2c6ecb;color:#fff}.tc-m.a{align-self:flex-start;background:#f1f2f4}.tc-m.p{opacity:.6}
.tc-f{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}.tc-f textarea{flex:1;resize:none;font:inherit;padding:8px}
</style>`);
/* el Maestro cambia de vista (lista / nuevo / importar) sin pasar por el menú: se actualizan título, ayuda y menú */
if(typeof drawMaster==='function'){const _dm=drawMaster;drawMaster=async function(){const r=await _dm.apply(this,arguments);if(typeof drawNav==='function')drawNav();return r}}
