/* ---------- Panel → Precios y promociones → Promociones ----------
   · Reglas que están siempre: preventa, descuento por transferencia, cuotas sin interés (tabla settings).
   · Promociones por tiempo limitado: % de descuento automático entre dos fechas, con cuenta regresiva opcional arriba de la tienda.
   · Códigos de descuento: para influencers o clientes; se escriben en el checkout o llegan con el link ?cupon=CODIGO.
   · Mandar por mail: a toda la lista (suscriptores + clientes), con link para darse de baja. Va por /api/campania.
   Las promos no se suman: si un producto tiene una promo y el cliente pone un código, se usa la mayor. Profesionales y mayoristas no tienen promos. */
(function(){
let PR=null,STP={};
const pc=v=>Math.round((+v||0)*1000)/10;
const fch=s=>s?new Date(s).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
const loc=s=>{if(!s)return '';const d=new Date(s);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const estado=x=>{const n=Date.now();if(!x.activo)return ['Apagada','hint'];if(x.desde&&+new Date(x.desde)>n)return ['Programada','hint'];if(x.hasta&&+new Date(x.hasta)<=n)return ['Terminada','hint'];if(x.usos_max&&x.usos>=x.usos_max)return ['Agotado','hint'];return ['Activa','pos']};
const alc=x=>x.alcance==='todo'?'Toda la tienda':(x.alcance==='categoria'?'Categorías: ':'Productos: ')+(x.alcance_valor||[]).map(v=>{const p=(typeof prods!=='undefined'?prods:[]).find(q=>q.id===v);return p?p.tipo+' '+p.nombre:v}).join(', ');
async function cargar(){const [{data:p},{data:s}]=await Promise.all([sb.from('promociones').select('*').order('created_at',{ascending:false}),sb.from('settings').select('key,value').in('key',['preventa_activa','desc_transf','cuotas_sin_interes','cuotas_max'])]);
  PR=p||[];STP=Object.fromEntries((s||[]).map(x=>[x.key,+x.value]));if(typeof prods!=='undefined'&&!prods.length&&typeof loadProds==='function')await loadProds()}

function fila(x){const [e,c]=estado(x);return `<tr${x.activo?'':' class="off"'}><td><b>${esc(x.tipo==='codigo'?x.codigo:x.nombre)}</b><div class="hint">${esc(x.tipo==='codigo'?x.nombre:(x.cuenta_regresiva?'con cuenta regresiva':''))}</div></td>
  <td class="n"><b>−${pc(x.pct)}%</b></td><td class="hint" style="max-width:240px">${esc(alc(x))}</td>
  <td class="hint">${x.desde?'desde '+fch(x.desde):'ya'}${x.hasta?'<br>hasta '+fch(x.hasta):'<br>sin vencimiento'}</td>
  ${x.tipo==='codigo'?`<td class="n">${x.usos}${x.usos_max?' / '+x.usos_max:''}</td>`:''}
  <td><span class="${c}">${e}</span></td>
  <td style="white-space:nowrap"><label style="margin:0;display:inline-flex;gap:6px;align-items:center"><input type="checkbox" data-pon="${x.id}" ${x.activo?'checked':''} style="width:auto"> Activa</label>
   · <button class="lnk" data-ped="${x.id}">Editar</button> · <button class="lnk" data-pml="${x.id}">Mandar por mail</button>${x.tipo==='codigo'?` · <button class="lnk" data-pln="${x.id}">Copiar link</button>`:''} · <button class="lnk" data-pdel="${x.id}">Borrar</button></td></tr>`}

function html(){const F=PR.filter(x=>x.tipo==='fecha'),C=PR.filter(x=>x.tipo==='codigo');
 return `<p class="hint" style="max-width:860px;margin:0 0 14px">Todo lo que cambia el precio que paga el cliente <b>encima del precio de lista</b>. Las promos <b>no se suman</b>: si un producto está en promo y el cliente pone un código, se usa el descuento más grande. Los profesionales y mayoristas tienen su propio precio y no entran en promos.</p>
 <div class="card pad" style="margin-bottom:14px"><h4 style="margin-top:0">Siempre activas</h4>
  <div class="rw"><span><b>Preventa</b><div class="hint">Prendida: la tienda vende con precio de preventa (el % de cada producto). Apagada: precio de lista, y la preventa no aparece en Productos.</div></span><label style="margin:0;display:flex;gap:6px;align-items:center"><input type="checkbox" id="pp_pa" ${STP.preventa_activa>0?'checked':''} style="width:auto"> ${STP.preventa_activa>0?'Prendida':'Apagada'}</label></div>
  <div class="rw"><span><b>Descuento por transferencia</b><div class="hint">Sobre el precio público. 0 = sin descuento.</div></span><span><input class="num" id="pp_dt" style="width:60px" value="${pc(STP.desc_transf??0.15)}" inputmode="decimal"> %</span></div>
  <div class="rw"><span><b>Cuotas sin interés</b><div class="hint">Las pagás vos. Se activan también en Mercado Pago (Tu negocio → Costos y cuotas).</div></span><span><input class="num" id="pp_cs" style="width:60px" value="${STP.cuotas_sin_interes??3}" inputmode="numeric"> cuotas</span></div></div>
 <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Promociones por tiempo limitado</h4><span class="sp"></span><button class="btn dk" data-pnew="fecha">+ Nueva promoción</button></div>
  <p class="hint" style="margin:0 0 8px">Ej. Hot Sale, Black Friday, "20% en sillas este finde". Se prenden y se apagan solas en las fechas. Con <b>cuenta regresiva</b>, arriba de la página de inicio aparece una franja con el tiempo que falta.</p>
  ${F.length?`<div class="wrap"><table><thead><tr><th>Promoción</th><th class="n">Descuento</th><th>Qué entra</th><th>Cuándo</th><th>Estado</th><th></th></tr></thead><tbody>${F.map(fila).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay ninguna.</p>'}</div>
 <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Códigos de descuento</h4><span class="sp"></span><button class="btn dk" data-pnew="codigo">+ Nuevo código</button></div>
  <p class="hint" style="margin:0 0 8px">Para influencers, clientes o un mail. El cliente lo escribe en <b>Finalizar compra</b> ("¿Tenés un código de descuento?") o entra con el link del código y ya le queda puesto. Podés limitar cuántas veces se usa y hasta cuándo. "Usos" cuenta cada compra hecha con el código.</p>
  ${C.length?`<div class="wrap"><table><thead><tr><th>Código</th><th class="n">Descuento</th><th>Qué entra</th><th>Cuándo</th><th class="n">Usos</th><th>Estado</th><th></th></tr></thead><tbody>${C.map(fila).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay ninguno.</p>'}</div>
 <div class="card pad"><div class="bar" style="margin:0"><div><h4 style="margin:0">Mandar un mail a toda la lista</h4><p class="hint" style="margin:4px 0 0">Suscriptores de la web + clientes que compraron (sin los que se dieron de baja). Para avisar una promo, un código o una novedad.</p></div><span class="sp"></span><button class="btn" data-pml="0">Escribir mail</button></div></div>`}

async function guardarS(k,v,n){const {error}=await sb.from('settings').upsert({key:k,value:v,nota:n});toast(error?'No se pudo guardar':'Guardado: la tienda ya lo usa');STP[k]=v;if(typeof ST!=='undefined')ST[k]=v}

function editar(x,tipo){x=x||{tipo,pct:0.1,alcance:'todo',alcance_valor:[],activo:true,cuenta_regresiva:tipo==='fecha'};const T=x.tipo==='codigo';
  const P=(typeof prods!=='undefined'?prods:[]).filter(p=>p.activo),CAT=[...new Set(P.map(p=>p.categoria).filter(Boolean))].sort();
  const d=document.createElement('dialog');d.style.maxWidth='620px';document.body.appendChild(d);
  d.innerHTML=`<div class="dh"><h2>${x.id?'Editar':'Nuevo'} ${T?'código de descuento':'promoción por tiempo'}</h2><button class="btn" data-x>Cerrar</button></div><div class="db">
   ${T?`<label>Código</label><input id="pc_c" value="${esc(x.codigo||'')}" placeholder="ej. SOFIA10" style="text-transform:uppercase"><div class="hint">Lo que escribe el cliente. Letras y números, sin espacios.</div>`:''}
   <label style="margin-top:10px">${T?'Para quién / nota':'Nombre de la promo'}</label><input id="pc_n" value="${esc(x.nombre||'')}" placeholder="${T?'ej. Influencer Sofía (Instagram)':'ej. Hot Sale'}">
   <label style="margin-top:10px">Descuento</label><span><input id="pc_p" class="num" style="width:70px" value="${pc(x.pct)}" inputmode="decimal"> %</span>
   <label style="margin-top:10px">Qué entra</label><select id="pc_a"><option value="todo"${x.alcance==='todo'?' selected':''}>Toda la tienda</option><option value="categoria"${x.alcance==='categoria'?' selected':''}>Algunas categorías</option><option value="producto"${x.alcance==='producto'?' selected':''}>Algunos productos</option></select>
   <div id="pc_v" style="max-height:200px;overflow:auto;margin-top:6px"></div>
   <div class="g2d" style="margin-top:10px;gap:10px"><div><label>Desde</label><input id="pc_d" type="datetime-local" value="${loc(x.desde)}"><div class="hint">Vacío = ya.</div></div><div><label>Hasta</label><input id="pc_h" type="datetime-local" value="${loc(x.hasta)}"><div class="hint">${T?'Vacío = no vence.':'Hace falta para la cuenta regresiva.'}</div></div></div>
   ${T?`<label style="margin-top:10px">Máximo de usos</label><input id="pc_u" class="num" style="width:90px" value="${x.usos_max??''}" placeholder="sin límite" inputmode="numeric">`
     :`<label style="margin:12px 0 0;display:flex;gap:8px;align-items:center"><input type="checkbox" id="pc_r" ${x.cuenta_regresiva?'checked':''} style="width:auto"> Mostrar cuenta regresiva arriba de la página de inicio</label>
       <label style="margin-top:10px">Texto de la franja</label><input id="pc_b" value="${esc(x.banner||'')}" placeholder="ej. HOT SALE · 20% OFF en toda la tienda">`}
   <div class="bar" style="margin-top:16px"><span class="hint neg" id="pc_e"></span><span class="sp"></span><button class="btn dk" id="pc_ok">Guardar</button></div></div>`;
  const pv=()=>{const a=d.querySelector('#pc_a').value,V=new Set(x.alcance_valor||[]),L=a==='categoria'?CAT.map(c=>[c,c]):a==='producto'?P.map(p=>[p.id,p.tipo+' '+p.nombre]):[];
    d.querySelector('#pc_v').innerHTML=L.map(([v,t])=>`<label style="margin:2px 0;display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" value="${esc(v)}" ${V.has(v)?'checked':''} style="width:auto"> ${esc(t)}</label>`).join('')};
  pv();d.querySelector('#pc_a').onchange=()=>{x.alcance_valor=[];pv()};
  d.querySelector('[data-x]').onclick=()=>{d.close();d.remove()};d.showModal();
  d.querySelector('#pc_ok').onclick=async()=>{const e=d.querySelector('#pc_e'),g=s=>d.querySelector(s);
    const pct=(+String(g('#pc_p').value).replace(',','.')||0)/100,a=g('#pc_a').value,vals=[...d.querySelectorAll('#pc_v input:checked')].map(i=>i.value);
    const row={tipo:x.tipo,nombre:g('#pc_n').value.trim(),pct,alcance:a,alcance_valor:a==='todo'?[]:vals,desde:g('#pc_d').value?new Date(g('#pc_d').value).toISOString():null,hasta:g('#pc_h').value?new Date(g('#pc_h').value).toISOString():null};
    if(T){row.codigo=g('#pc_c').value.trim().toUpperCase().replace(/\s+/g,'');row.usos_max=+g('#pc_u').value||null;if(!row.nombre)row.nombre=row.codigo;if(!/^[A-Z0-9_-]{3,30}$/.test(row.codigo))return e.textContent='El código: de 3 a 30 letras o números, sin espacios.'}
    else{row.cuenta_regresiva=g('#pc_r').checked;row.banner=g('#pc_b').value.trim()||null;if(!row.nombre)return e.textContent='Ponele un nombre.';if(row.cuenta_regresiva&&!row.hasta)return e.textContent='Para la cuenta regresiva hace falta la fecha "Hasta".'}
    if(!(pct>0&&pct<=0.9))return e.textContent='El descuento tiene que ser entre 1 y 90%.';
    if(a!=='todo'&&!vals.length)return e.textContent='Elegí al menos una '+(a==='categoria'?'categoría':'producto')+'.';
    if(row.desde&&row.hasta&&row.hasta<=row.desde)return e.textContent='"Hasta" tiene que ser después de "Desde".';
    const q=x.id?sb.from('promociones').update(row).eq('id',x.id):sb.from('promociones').insert(row);const {error}=await q;
    if(error)return e.textContent=/duplicate|unique/i.test(error.message)?'Ese código ya existe.':'No se pudo guardar: '+error.message;
    d.close();d.remove();toast('Guardado: la tienda ya lo usa');pintar()}}

async function mail(x){const d=document.createElement('dialog');d.style.maxWidth='620px';document.body.appendChild(d);
  const T=x&&x.tipo==='codigo',pct=x?pc(x.pct):0;
  const def=!x?{a:'',t:'',x:''}:T?{a:`Tu código de ${pct}% OFF en FORMA Concept`,t:`${pct}% OFF con tu código`,x:`Tenés ${pct}% de descuento en ${alc(x).toLowerCase()}${x.hasta?' hasta el '+new Date(x.hasta).toLocaleDateString('es-AR'):''}.\n\nEscribí el código al finalizar la compra, o entrá con el botón de abajo y ya te queda puesto.`}
    :{a:`${x.nombre}: ${pct}% OFF`,t:`${x.nombre} · ${pct}% OFF`,x:`${pct}% de descuento en ${alc(x).toLowerCase()}${x.hasta?', hasta el '+new Date(x.hasta).toLocaleString('es-AR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):''}.\n\nDiseño en madera, acero y laca, con envío a todo el país.`};
  d.innerHTML=`<div class="dh"><h2>Mail a toda la lista</h2><button class="btn" data-x>Cerrar</button></div><div class="db">
   <p class="hint" id="ml_n">Contando destinatarios…</p>
   <label>Asunto</label><input id="ml_a" value="${esc(def.a)}">
   <label style="margin-top:10px">Título</label><input id="ml_t" value="${esc(def.t)}">
   <label style="margin-top:10px">Texto</label><textarea id="ml_x" rows="6">${esc(def.x)}</textarea><div class="hint">Dejá una línea en blanco entre párrafos.</div>
   ${T?`<p class="hint" style="margin-top:8px">El mail muestra el código <b>${esc(x.codigo)}</b> en un recuadro y el botón lleva a la tienda con el código ya puesto.</p>`:''}
   <label style="margin-top:10px">Texto del botón</label><input id="ml_b" value="Ver la tienda">
   <p class="hint" style="margin-top:8px">Al pie va un link para darse de baja (es obligatorio y evita que te marquen como spam).</p>
   <div class="bar" style="margin-top:14px"><span class="hint" id="ml_e"></span><span class="sp"></span><button class="btn" id="ml_p">Mandarme una prueba</button><button class="btn dk" id="ml_ok" disabled>Mandar a todos</button></div></div>`;
  d.querySelector('[data-x]').onclick=()=>{d.close();d.remove()};d.showModal();
  const {data:{session}}=await sb.auth.getSession();const H={'Content-Type':'application/json',Authorization:'Bearer '+(session&&session.access_token)};
  const api=async b=>{const r=await fetch('/api/campania',{method:'POST',headers:H,body:JSON.stringify(b)});return r.json().catch(()=>({error:'Error '+r.status}))};
  const c=await api({accion:'contar'});const N=c.n||0;
  d.querySelector('#ml_n').innerHTML=c.error?`<span class="neg">${esc(c.error)}</span>`:`Le llega a <b>${N}</b> persona${N===1?'':'s'}.${c.resend?'':' <span class="neg">Falta cargar la clave de Resend (RESEND_API_KEY) en Vercel: sin eso no sale ningún mail.</span>'}`;
  const ok=d.querySelector('#ml_ok');ok.disabled=!N;ok.textContent=`Mandar a ${N}`;
  const datos=()=>({asunto:d.querySelector('#ml_a').value.trim(),titulo:d.querySelector('#ml_t').value.trim(),texto:d.querySelector('#ml_x').value,boton:d.querySelector('#ml_b').value.trim(),codigo:T?x.codigo:null});
  d.querySelector('#ml_p').onclick=async()=>{const r=await api({accion:'prueba',...datos()});d.querySelector('#ml_e').textContent=r.error||'Prueba enviada a tu mail. Revisala antes de mandar.'};
  ok.onclick=async()=>{if(!confirm(`¿Mandar este mail a ${N} personas? No se puede deshacer.`))return;ok.disabled=true;ok.textContent='Mandando…';const r=await api({accion:'enviar',...datos()});
    d.querySelector('#ml_e').textContent=r.error||`Listo: salieron ${r.enviados} de ${r.total}.`;ok.textContent='Enviado'}}

async function pintar(){if(tab!=='promos')return;$('#m').innerHTML='<p class="hint">Cargando…</p>';await cargar();if(tab!=='promos')return;$('#m').innerHTML=html();const m=$('#m');
  m.querySelector('#pp_pa').onchange=async e=>{await guardarS('preventa_activa',e.target.checked?1:0,'1 = la tienda vende con precio de preventa, 0 = precio de lista');pintar()};
  m.querySelector('#pp_dt').onchange=e=>guardarS('desc_transf',(+String(e.target.value).replace(',','.')||0)/100,'Descuento por pagar con transferencia');
  m.querySelector('#pp_cs').onchange=e=>guardarS('cuotas_sin_interes',+e.target.value||0,'Cuotas sin interés');
  m.querySelectorAll('[data-pnew]').forEach(b=>b.onclick=()=>editar(null,b.dataset.pnew));
  m.querySelectorAll('[data-ped]').forEach(b=>b.onclick=()=>editar(PR.find(x=>x.id==b.dataset.ped)));
  m.querySelectorAll('[data-pml]').forEach(b=>b.onclick=()=>mail(PR.find(x=>x.id==b.dataset.pml)||null));
  m.querySelectorAll('[data-pln]').forEach(b=>b.onclick=async()=>{const x=PR.find(y=>y.id==b.dataset.pln),u='https://www.formaconceptba.com/?cupon='+encodeURIComponent(x.codigo);try{await navigator.clipboard.writeText(u);toast('Link copiado: '+u)}catch(e){prompt('Copiá el link:',u)}});
  m.querySelectorAll('[data-pon]').forEach(c=>c.onchange=async()=>{const {error}=await sb.from('promociones').update({activo:c.checked}).eq('id',c.dataset.pon);toast(error?'No se pudo guardar':c.checked?'Activada':'Apagada');pintar()});
  m.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=async()=>{const x=PR.find(y=>y.id==b.dataset.pdel);if(!confirm(`¿Borrar "${x.codigo||x.nombre}"? Si sólo querés pausarla, destildá "Activa".`))return;const {error}=await sb.from('promociones').delete().eq('id',x.id);toast(error?'No se pudo borrar':'Borrada');pintar()})}

if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='mailpromo'){tab='promos';if(typeof drawNav==='function')drawNav();await pintar();return mail(null)}if(tab==='promos'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
window.promoMail=mail;
if(window.AYUDA)AYUDA.promos='Promociones por tiempo limitado (con cuenta regresiva en la tienda), códigos de descuento para influencers o clientes, preventa, transferencia y cuotas, y mails a toda la lista.';
})();
