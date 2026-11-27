/* ---------- Tienda online → Textos de la página ----------
   Vista previa de la página de inicio: tocás un texto (tiene borde punteado azul) y a la izquierda lo editás: texto, tipografía,
   tamaño, color, negrita, mayúsculas. Arrastrándolo lo movés. Compu y celular guardan tamaño y posición por separado.
   Se guarda todo junto en config_tienda.textos (JSON). La tienda lo aplica con tx() en index.html. */
(function(){
const NOM={hero_b:'Portada · botón "Ver toda la colección"',dest_t:'Título "Destacados"',fotop_t:'Foto grande Fresno · título',fotop_b:'Foto grande Fresno · botón',acero_t:'Colección Acero · título',acero_b:'Colección Acero · botón',fresno_t:'Colección Fresno (al lado de Acero) · título',fresno_b:'Colección Fresno (al lado de Acero) · botón',nac_t:'Título "Productos nacionales"',frm_t:'FRM Studio · título',frm_p:'FRM Studio · texto',frm_b:'FRM Studio · botón',pro_k:'Profesionales · título',pro_p:'Profesionales · texto',pro_b:'Profesionales · botón',dest_v:'Destacados · "Ver todo"',nac_v:'Productos nacionales · "Ver todos"',badge_prox:'Etiqueta "Próximamente" (en todos los productos)'};
const nom=k=>NOM[k]||(k.startsWith('cat_')?'Categoría · '+k.slice(4).replace(/_/g,' '):k);
const FUENTES=[['','La de siempre'],['sg','Space Grotesk (la de la marca)'],['it','Inter Tight'],['ou','Outfit'],['ar','Archivo'],['bb','Bebas Neue (condensada, como el reloj)'],['se','Clásica con serif']];
let T={},SEL=null,ORIG={},VISTA='compu',SUCIO=false;
const env=()=>{const f=document.getElementById('txif');if(f&&f.contentWindow)f.contentWindow.postMessage({cdcfg:{textos:JSON.stringify(T)}},location.origin)};
const M=()=>VISTA==='cel';
if(!window._txL){window._txL=1;addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||!e.data.txsel||tab!=='textos')return;const s=e.data.txsel;SEL=s.k;if(!ORIG[s.k])ORIG[s.k]=s.texto;
  if(s.movido){const o=T[s.k]||(T[s.k]={});if(s.m){o.xm=s.x;o.ym=s.y}else{o.x=s.x;o.y=s.y}SUCIO=true;env()}panel()})}
function escala(){const w=document.getElementById('txw'),f=document.getElementById('txif');if(!w||!f)return;const W=M()?390:1280,H=M()?760:800,s=Math.min(1,w.clientWidth/W);f.style.width=W+'px';f.style.height=H+'px';f.style.transform=`scale(${s})`;w.style.height=(H*s)+'px'}
function panel(){const p=document.getElementById('txp');if(!p)return;
  const bp=`<button class="btn" id="tx_bp" style="margin-top:10px;width:100%">Editar la etiqueta "Próximamente"</button>`;
  if(SEL==='badge_prox'){const o=T.badge_prox||{},sz=M()?o.sm:o.s;
    p.innerHTML=`<b>Etiqueta "Próximamente"</b><p class="hint" style="margin:4px 0 0">Una sola vez: cambia en todos los productos que estén en Próximamente.</p>
     <div style="margin:10px 0"><span style="display:inline-block;font-size:${sz||10}px;letter-spacing:.08em;padding:4px 8px;background:${o.bg||'#8a7a5c'};color:${o.c||'#fff'};${o.b?'font-weight:600;':''}">${esc(o.t||'PRÓXIMAMENTE')}</span></div>
     <label>Texto</label><input id="bx_t" value="${esc(o.t||'')}" placeholder="Próximamente">
     <label style="margin-top:10px">Color de fondo</label><input id="bx_bg" type="color" value="${o.bg||'#8a7a5c'}" style="width:48px;height:32px;padding:0">
     <label style="margin-top:10px">Color de la letra</label><input id="bx_c" type="color" value="${o.c||'#ffffff'}" style="width:48px;height:32px;padding:0">
     <label style="margin-top:10px">Tamaño en ${M()?'el celular':'la compu'} (px)</label><div class="bar" style="margin:0;gap:8px"><input id="bx_s" type="range" min="6" max="40" value="${sz||10}" style="flex:1"><b id="bx_sv">${sz?sz+' px':'original'}</b></div>
     <label style="margin-top:10px">Tipografía</label><select id="bx_f">${FUENTES.map(([v,t])=>`<option value="${v}"${(o.f||'')===v?' selected':''}>${t}</option>`).join('')}</select>
     <label style="margin:10px 0 0;display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="bx_b" ${o.b?'checked':''} style="width:auto"> Negrita</label>
     <div class="bar" style="margin:12px 0 0;gap:6px"><button class="btn" id="bx_r">Como era</button><button class="btn" id="bx_x">Listo</button></div>`;
    const q=x=>p.querySelector(x),ob=()=>T.badge_prox||(T.badge_prox={}),ch=()=>{if(!Object.keys(T.badge_prox||{}).length)delete T.badge_prox;SUCIO=true;env();estado();panel()};
    q('#bx_t').onchange=e=>{e.target.value?ob().t=e.target.value:delete ob().t;ch()};q('#bx_bg').onchange=e=>{ob().bg=e.target.value;ch()};q('#bx_c').onchange=e=>{ob().c=e.target.value;ch()};
    q('#bx_s').oninput=e=>{q('#bx_sv').textContent=e.target.value+' px'};q('#bx_s').onchange=e=>{ob()[M()?'sm':'s']=+e.target.value;ch()};
    q('#bx_f').onchange=e=>{e.target.value?ob().f=e.target.value:delete ob().f;ch()};q('#bx_b').onchange=e=>{e.target.checked?ob().b=1:delete ob().b;ch()};
    q('#bx_r').onclick=()=>{delete T.badge_prox;ch()};q('#bx_x').onclick=()=>{SEL=null;panel()};return}
  if(!SEL){p.innerHTML=`<p class="hint" style="margin:0">Tocá un texto en la vista previa (los que tienen borde punteado azul) para editarlo. Arrastralo para moverlo.</p>${Object.keys(T).length?`<p class="hint" style="margin:10px 0 0">Textos cambiados: ${Object.keys(T).map(k=>esc(nom(k))).join(' · ')}</p>`:''}${bp}`;p.querySelector('#tx_bp').onclick=()=>{SEL='badge_prox';panel()};return}
  const o=T[SEL]||{},sz=M()?o.sm:o.s;
  p.innerHTML=`<b>${esc(nom(SEL))}</b>
   <label style="margin-top:10px">Texto</label><textarea id="tx_t" rows="2" placeholder="${esc(ORIG[SEL]||'')}">${esc(o.t||'')}</textarea><div class="hint">Vacío = el texto original.</div>
   <label style="margin-top:10px">Tipografía</label><select id="tx_f">${FUENTES.map(([v,t])=>`<option value="${v}"${(o.f||'')===v?' selected':''}>${t}</option>`).join('')}</select>
   <label style="margin-top:10px">Tamaño en ${M()?'el celular':'la compu'} (px)</label><div class="bar" style="margin:0;gap:8px"><input id="tx_s" type="range" min="6" max="140" value="${sz||0}" style="flex:1"><b id="tx_sv" style="min-width:60px">${sz?sz+' px':'original'}</b><button class="btn" id="tx_s0" style="padding:3px 8px">Original</button></div>
   <label style="margin-top:10px">Color</label><div class="bar" style="margin:0;gap:8px"><input id="tx_c" type="color" value="${o.c||'#ffffff'}" style="width:48px;height:32px;padding:0"><label style="margin:0;display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="tx_c0" ${o.c?'':'checked'} style="width:auto"> el original</label></div>
   <div class="bar" style="margin:10px 0 0;gap:14px;flex-wrap:wrap"><label style="margin:0;display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="tx_b" ${o.b?'checked':''} style="width:auto"> Negrita</label>
    <select id="tx_u" style="width:auto"><option value=""${!o.u?' selected':''}>Mayúsculas: como está</option><option value="u"${o.u==='u'?' selected':''}>TODO EN MAYÚSCULAS</option><option value="n"${o.u==='n'?' selected':''}>Como lo escribo</option></select></div>
   <div class="bar" style="margin:12px 0 0;gap:6px;flex-wrap:wrap"><button class="btn" id="tx_pos">Volver a su lugar (${M()?'celular':'compu'})</button><button class="btn" id="tx_all">Todo como era</button><button class="btn" id="tx_x">Listo</button></div>${bp}`;
  const q=s=>p.querySelector(s),o2=()=>T[SEL]||(T[SEL]={}),ch=()=>{if(!Object.keys(T[SEL]||{}).length)delete T[SEL];SUCIO=true;env();estado()};
  q('#tx_t').oninput=e=>{const v=e.target.value;v?o2().t=v:delete o2().t;ch()};
  q('#tx_f').onchange=e=>{e.target.value?o2().f=e.target.value:delete o2().f;ch()};
  q('#tx_s').oninput=e=>{const v=+e.target.value;o2()[M()?'sm':'s']=v;q('#tx_sv').textContent=v+' px';ch()};
  q('#tx_s0').onclick=()=>{delete o2()[M()?'sm':'s'];q('#tx_sv').textContent='original';ch()};
  q('#tx_c').oninput=e=>{o2().c=e.target.value;q('#tx_c0').checked=false;ch()};q('#tx_c0').onchange=e=>{if(e.target.checked)delete o2().c;else o2().c=q('#tx_c').value;ch()};
  q('#tx_b').onchange=e=>{e.target.checked?o2().b=1:delete o2().b;ch()};q('#tx_u').onchange=e=>{e.target.value?o2().u=e.target.value:delete o2().u;ch()};
  q('#tx_pos').onclick=()=>{const o=o2();if(M()){delete o.xm;delete o.ym}else{delete o.x;delete o.y}ch()};
  q('#tx_all').onclick=()=>{delete T[SEL];ch();panel()};q('#tx_x').onclick=()=>{SEL=null;panel()};q('#tx_bp').onclick=()=>{SEL='badge_prox';panel()}}
const estado=()=>{const h=document.getElementById('txh');if(h)h.innerHTML=SUCIO?'<b style="color:#b26a00">Hay cambios sin guardar.</b>':''};
async function pintar(){if(tab!=='textos')return;const m=$('#m');m.innerHTML='<p class="hint">Cargando…</p>';
  const {data}=await sb.from('config_tienda').select('value').eq('key','textos').maybeSingle();if(tab!=='textos')return;try{T=JSON.parse((data&&data.value)||'{}')}catch(e){T={}}SUCIO=false;
  m.innerHTML=`<p class="hint" style="max-width:900px;margin:0 0 14px">Los textos de la página de inicio. <b>Tocá un texto</b> en la vista previa (borde punteado azul) para cambiarlo, elegir tipografía, tamaño y color; <b>arrastralo</b> para moverlo. Compu y celular guardan tamaño y posición por separado. Los textos del reloj se cambian en Cuenta regresiva (portada).</p>
   <div style="display:grid;grid-template-columns:minmax(260px,320px) 1fr;gap:16px;align-items:start" class="txg">
    <div><div class="card pad" id="txp"></div><div class="card pad" style="margin-top:10px"><div class="bar" style="margin:0"><span class="hint" id="txh"></span><span class="sp"></span><button class="btn dk" id="tx_ok">Guardar</button></div></div></div>
    <div><div class="bar" style="margin:0 0 8px;gap:6px"><button class="btn ${!M()?'dk':''}" data-txv="compu">Compu</button><button class="btn ${M()?'dk':''}" data-txv="cel">Celular</button><span class="hint">Scrolleá la vista previa para ver toda la página.</span></div>
     <div id="txw" style="position:relative;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#111;${M()?'max-width:390px':''}"><iframe id="txif" src="/?editar=1&notrack=1&tx=1" style="border:0;transform-origin:0 0;position:absolute;top:0;left:0"></iframe></div></div></div>
   <style>@media(max-width:820px){.txg{grid-template-columns:1fr!important}}</style>`;
  panel();escala();estado();const f=m.querySelector('#txif');f.onload=()=>{env();setTimeout(env,800)};window.onresize=()=>{if(tab==='textos')escala()};
  m.querySelectorAll('[data-txv]').forEach(b=>b.onclick=()=>{VISTA=b.dataset.txv;const g=JSON.stringify(T),s=SUCIO;pintar().then(()=>{T=JSON.parse(g);SUCIO=s;panel();estado();env()})});
  m.querySelector('#tx_ok').onclick=async()=>{const {error}=await sb.from('config_tienda').upsert({key:'textos',value:JSON.stringify(T)});SUCIO=!!error;estado();toast(error?'No se pudo guardar':'Guardado: ya se ve así en la web')}}
if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='textos'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
if(window.AYUDA)AYUDA.textos='Editar los textos de la página de inicio: texto, tipografía, tamaño, color y posición (arrastrando), en compu y celular.';
})();
