/* ---------- Tienda online → Cuenta regresiva (portada) ----------
   El reloj de días / horas / minutos que va encima del video de la portada. Se prende o apaga, se elige la fecha, los textos
   y el tamaño, y se ARRASTRA en la vista previa a donde quieras (compu y celular por separado). Se guarda en config_tienda (cd_*). */
(function(){
const KEYS=['cd_on','cd_fecha','cd_titulo','cd_sub','cd_tam','cd_x','cd_y','cd_xm','cd_ym'];
let C={},VISTA='compu',SUCIO=false;
const env=()=>{const f=document.getElementById('cdif');if(f&&f.contentWindow)f.contentWindow.postMessage({cdcfg:C},location.origin)};
if(!window._cdL){window._cdL=1;addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||!e.data.cdpos||tab!=='portada')return;const p=e.data.cdpos;
  if(p.m){C.cd_xm=String(p.x);C.cd_ym=String(p.y)}else{C.cd_x=String(p.x);C.cd_y=String(p.y)}SUCIO=true;const h=document.getElementById('cdh');if(h)h.innerHTML='<b style="color:#b26a00">Moviste el reloj: tocá Guardar para que quede así en la web.</b>'})}
function escala(){const w=document.getElementById('cdw'),f=document.getElementById('cdif');if(!w||!f)return;const W=VISTA==='compu'?1280:390,H=VISTA==='compu'?760:760,s=Math.min(1,w.clientWidth/W);
  f.style.width=W+'px';f.style.height=H+'px';f.style.transform=`scale(${s})`;w.style.height=(H*s)+'px'}
async function pintar(){if(tab!=='portada')return;const m=$('#m');m.innerHTML='<p class="hint">Cargando…</p>';
  const {data}=await sb.from('config_tienda').select('key,value').in('key',KEYS);if(tab!=='portada')return;C=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));SUCIO=false;
  const tam=Math.round((+C.cd_tam||0.55)*100);
  m.innerHTML=`<p class="hint" style="max-width:900px;margin:0 0 14px">El reloj que aparece encima del video de la portada. <b>Arrastralo en la vista previa</b> a donde quieras: la posición de la compu y la del celular se guardan por separado (cambiá la vista con los botones). Después tocá <b>Guardar</b>.</p>
   <div style="display:grid;grid-template-columns:minmax(240px,300px) 1fr;gap:16px;align-items:start" class="cdg">
    <div class="card pad">
     <label style="display:flex;gap:8px;align-items:center;margin:0 0 12px"><input type="checkbox" id="cd_on" ${C.cd_on==='0'?'':'checked'} style="width:auto"> <b>Mostrar el reloj</b></label>
     <label>Cuenta hasta</label><input id="cd_fecha" type="date" value="${esc(C.cd_fecha||'2027-03-20')}">
     <label style="margin-top:10px">Texto de arriba</label><input id="cd_titulo" value="${esc(C.cd_titulo||'')}" placeholder="vacío = la fecha (ej. 20 de marzo 2027)">
     <label style="margin-top:10px">Texto de abajo</label><input id="cd_sub" value="${esc(C.cd_sub==null?'Diseño en madera, acero y laca':C.cd_sub)}" placeholder="vacío = sin texto">
     <label style="margin-top:10px">Tamaño: <b id="cd_tv">${tam}%</b></label><input id="cd_tam" type="range" min="25" max="110" value="${tam}" style="width:100%">
     <div class="bar" style="margin:14px 0 0"><button class="btn" id="cd_reset">Volver al centro</button><span class="sp"></span><button class="btn dk" id="cd_ok">Guardar</button></div>
     <p class="hint" id="cdh" style="margin:10px 0 0"></p></div>
    <div><div class="bar" style="margin:0 0 8px;gap:6px"><button class="btn ${VISTA==='compu'?'dk':''}" data-cdv="compu">Compu</button><button class="btn ${VISTA==='cel'?'dk':''}" data-cdv="cel">Celular</button><span class="hint">Arrastrá el reloj (tiene un borde punteado).</span></div>
     <div id="cdw" style="position:relative;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#111;${VISTA==='cel'?'max-width:390px':''}"><iframe id="cdif" src="/?editar=1&notrack=1&cd=1" style="border:0;transform-origin:0 0;position:absolute;top:0;left:0"></iframe></div></div></div>
   <style>@media(max-width:820px){.cdg{grid-template-columns:1fr!important}}</style>`;
  const f=m.querySelector('#cdif');escala();f.onload=()=>{env();setTimeout(env,800)};window.onresize=()=>{if(tab==='portada')escala()};
  const set=(k,v)=>{C[k]=v;SUCIO=true;env()};
  m.querySelector('#cd_on').onchange=e=>set('cd_on',e.target.checked?'1':'0');
  ['cd_fecha','cd_titulo','cd_sub'].forEach(k=>m.querySelector('#'+k).oninput=e=>set(k,e.target.value));
  m.querySelector('#cd_tam').oninput=e=>{m.querySelector('#cd_tv').textContent=e.target.value+'%';set('cd_tam',String(+e.target.value/100))};
  m.querySelector('#cd_reset').onclick=()=>{if(VISTA==='cel'){C.cd_xm='50';C.cd_ym='58'}else{C.cd_x='50';C.cd_y='62'}SUCIO=true;env()};
  m.querySelectorAll('[data-cdv]').forEach(b=>b.onclick=()=>{VISTA=b.dataset.cdv;const g=JSON.stringify(C),s=SUCIO;pintar().then(()=>{C=JSON.parse(g);SUCIO=s})});
  m.querySelector('#cd_ok').onclick=async()=>{let err=0;for(const k of KEYS){if(C[k]==null)continue;const {error}=await sb.from('config_tienda').upsert({key:k,value:String(C[k])});if(error)err++}
    SUCIO=false;toast(err?'No se pudo guardar todo':'Guardado: ya se ve así en la web');const h=m.querySelector('#cdh');if(h)h.textContent=err?'':'Guardado.'}}
if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='portada'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
if(window.AYUDA)AYUDA.portada='El reloj de cuenta regresiva de la portada: fecha, textos, tamaño y posición (se arrastra en la vista previa, compu y celular por separado).';
})();
