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
async function cargar(){const [{data:p},{data:s}]=await Promise.all([sb.from('promociones').select('*').order('created_at',{ascending:false}),sb.from('settings').select('key,value').in('key',['preventa_activa','desc_transf','cuotas_sin_interes','cuotas_max','cuotas_promo_desde','cuotas_promo_n','cuotas_promo_costo','cuotas_promo_ok'])]);
  PR=p||[];STP=Object.fromEntries((s||[]).map(x=>[x.key,+x.value]));if(typeof prods!=='undefined'&&!prods.length&&typeof loadProds==='function')await loadProds()}

function fila(x){const [e,c]=estado(x);return `<tr${x.activo?'':' class="off"'}><td><b>${esc(x.tipo==='codigo'?x.codigo:x.nombre)}</b><div class="hint">${esc(x.tipo==='codigo'?x.nombre:(x.cuenta_regresiva?'con cuenta regresiva':''))}</div></td>
  <td class="n"><b>−${pc(x.pct)}%</b></td><td class="hint" style="max-width:240px">${esc(alc(x))}</td>
  <td class="hint">${x.desde?'desde '+fch(x.desde):'ya'}${x.hasta?'<br>hasta '+fch(x.hasta):'<br>sin vencimiento'}</td>
  ${x.tipo==='codigo'?`<td class="n">${x.usos}${x.usos_max?' / '+x.usos_max:''}</td>`:''}
  <td><span class="${c}">${e}</span></td>
  <td style="white-space:nowrap"><label style="margin:0;display:inline-flex;gap:6px;align-items:center"><input type="checkbox" data-pon="${x.id}" ${x.activo?'checked':''} style="width:auto"> Activa</label>
   · <button class="lnk" data-ped="${x.id}">Editar y ver cómo afecta</button> · <button class="lnk" data-pml="${x.id}">Mandar por mail</button>${x.tipo==='codigo'?` · <button class="lnk" data-pln="${x.id}">Copiar link</button>`:''} · <button class="lnk" data-pdel="${x.id}">Borrar</button></td></tr>`}

function html(){const F=PR.filter(x=>x.tipo==='fecha'),C=PR.filter(x=>x.tipo==='codigo');
 return `<p class="hint" style="max-width:860px;margin:0 0 14px">Todo lo que cambia el precio que paga el cliente <b>encima del precio de lista</b>. Las promos <b>no se suman</b>: si un producto está en promo y el cliente pone un código, se usa el descuento más grande. Los profesionales y mayoristas tienen su propio precio y no entran en promos.</p>
 <div class="card pad" style="margin-bottom:14px"><h4 style="margin-top:0">Siempre activas</h4>
  <div class="rw"><span><b>Preventa</b><div class="hint">Prendida: la tienda vende con precio de preventa (el % de cada producto). Apagada: precio de lista, y la preventa no aparece en Productos.</div></span><label style="margin:0;display:flex;gap:6px;align-items:center"><input type="checkbox" id="pp_pa" ${STP.preventa_activa>0?'checked':''} style="width:auto"> ${STP.preventa_activa>0?'Prendida':'Apagada'}</label></div>
  <div class="rw"><span><b>Descuento por transferencia</b><div class="hint">Sobre el precio público. 0 = sin descuento.</div></span><span><input class="num" id="pp_dt" style="width:60px" value="${pc(STP.desc_transf??0.15)}" inputmode="decimal"> %</span></div>
  <div class="rw"><span><b>Cuotas sin interés</b><div class="hint">Las pagás vos. Se activan también en Mercado Pago (Tu negocio → Costos y cuotas).</div></span><span><input class="num" id="pp_cs" style="width:60px" value="${STP.cuotas_sin_interes??3}" inputmode="numeric"> cuotas</span></div>
  <div class="rw" style="align-items:flex-start"><span><b>Más cuotas sin interés en compras grandes</b><div class="hint">Ej. desde $3.000.000, hasta 6 cuotas sin interés. El costo lo pagás vos: poné cuánto te cobra Mercado Pago por esas cuotas.</div></span>
   <span style="text-align:right;line-height:2.2">desde $ <input class="num" id="pp_cd" style="width:110px" value="${STP.cuotas_promo_desde?Math.round(STP.cuotas_promo_desde).toLocaleString('es-AR'):''}" placeholder="3.000.000" inputmode="numeric"><br>hasta <input class="num" id="pp_cn" style="width:50px" value="${STP.cuotas_promo_n||''}" placeholder="6" inputmode="numeric"> cuotas<br>costo en MP <input class="num" id="pp_cc" style="width:60px" value="${STP.cuotas_promo_costo!=null?pc(STP.cuotas_promo_costo):''}" placeholder="17" inputmode="decimal"> %</span></div>
  <label style="display:flex;gap:8px;align-items:center;margin:6px 0 0;font-weight:400"><input type="checkbox" id="pp_cok" ${STP.cuotas_promo_ok>0?'checked':''} style="width:auto"> Ya lo activé en Mercado Pago <span class="hint">(recién ahí se anuncia en la web; si no, el cliente vería las cuotas con interés)</span></label>
  ${STP.cuotas_promo_n>0&&STP.cuotas_promo_desde>0?`<details style="margin-top:8px"><summary class="hint" style="cursor:pointer">Cómo afecta a los productos de ${ars(STP.cuotas_promo_desde)} o más, si los pagan en ${STP.cuotas_promo_n} cuotas</summary><div style="margin-top:8px">${mkLbl('pp_mk')}<div id="pp_imp"></div></div></details>`:''}</div>
 <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Promociones por tiempo limitado</h4><span class="sp"></span><button class="btn dk" data-pnew="fecha">+ Nueva promoción</button></div>
  <p class="hint" style="margin:0 0 8px">Ej. Hot Sale, Black Friday, "20% en sillas este finde". Se prenden y se apagan solas en las fechas. Con <b>cuenta regresiva</b>, arriba de la página de inicio aparece una franja con el tiempo que falta.</p>
  ${F.length?`<div class="wrap"><table><thead><tr><th>Promoción</th><th class="n">Descuento</th><th>Qué entra</th><th>Cuándo</th><th>Estado</th><th></th></tr></thead><tbody>${F.map(fila).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay ninguna.</p>'}</div>
 <div class="card pad" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h4 style="margin:0">Códigos de descuento</h4><span class="sp"></span><button class="btn dk" data-pnew="codigo">+ Nuevo código</button></div>
  <p class="hint" style="margin:0 0 8px">Para influencers, clientes o un mail. El cliente lo escribe en <b>Finalizar compra</b> ("¿Tenés un código de descuento?") o entra con el link del código y ya le queda puesto. Podés limitar cuántas veces se usa y hasta cuándo. "Usos" cuenta cada compra hecha con el código.</p>
  ${C.length?`<div class="wrap"><table><thead><tr><th>Código</th><th class="n">Descuento</th><th>Qué entra</th><th>Cuándo</th><th class="n">Usos</th><th>Estado</th><th></th></tr></thead><tbody>${C.map(fila).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay ninguno.</p>'}</div>
 <div class="card pad"><div class="bar" style="margin:0"><div><h4 style="margin:0">Mandar un mail a toda la lista</h4><p class="hint" style="margin:4px 0 0">Suscriptores de la web + clientes que compraron (sin los que se dieron de baja). Para avisar una promo, un código o una novedad.</p></div><span class="sp"></span><button class="btn" data-pml="0">Escribir mail</button></div></div>`}

/* cómo afecta un descuento a cada producto: te queda limpio hoy vs. con la promo, con todos los costos */
function impHTML(L,pct,mk,o={}){const F=L.map(p=>({p,a:MG.cuentas(p.id,+p.precio_lista,{medio:'mix',mkt:mk}),b:MG.cuentas(p.id,+p.precio_lista,{pct,medio:o.medio||'mix',cuotasCosto:o.cc,mkt:mk})}));
  if(!F.length)return '<p class="hint">No entra ningún producto publicado.</p>';
  const n={bad:0,warn:0,ok:0};F.forEach(f=>f.b&&n[f.b.estado]++);const sin=F.filter(f=>!f.b).length;
  return `<p style="margin:0 0 6px">${n.bad?`<b class="neg">${n.bad} pierde${n.bad>1?'n':''} plata</b> · `:''}${n.warn?`<span style="color:#d68910">${n.warn} deja${n.warn>1?'n':''} poco</span> · `:''}<span class="pos">${n.ok} bien</span>${sin?` · <span class="hint">${sin} sin costo cargado</span>`:''}</p>
  <div class="wrap" style="max-height:360px;overflow:auto"><table><thead><tr><th>Producto</th><th class="n">Precio hoy</th><th class="n">${o.medio==='cuotasN'?'Precio':'Con la promo'}</th><th class="n">Te queda hoy</th><th class="n">Te queda ${o.medio==='cuotasN'?'en cuotas':'con la promo'}</th><th class="n">Retorno</th><th>Estado</th><th></th></tr></thead><tbody>${F.map((f,k)=>`<tr><td>${esc(f.p.tipo+' '+f.p.nombre)}</td><td class="n">${ars(f.p.precio_lista)}</td><td class="n">${ars(f.p.precio_lista*(1-pct))}</td><td class="n">${f.a?ars(f.a.neto):'—'}</td><td class="n"><b class="${f.b&&f.b.neto<0?'neg':''}">${f.b?ars(f.b.neto):'—'}</b></td><td class="n">${f.b?eP(f.b.ret,0):'—'}</td><td>${f.b?MG.estadoHTML(f.b.estado):'<span class="hint">sin costo</span>'}</td><td>${f.b?`<button class="lnk" data-imc="${k}">Ver cuentas</button>`:''}</td></tr><tr hidden data-imr="${k}"><td colspan="8">${MG.cuentasHTML(f.b)}</td></tr>`).join('')}</tbody></table></div>
  <p class="hint" style="margin:6px 0 0">"Te queda" es limpio por venta (por caja si se vende de a 2), con todos los costos de hoy${mk?'':' <b>menos marketing</b>'}: producto puesto en el galpón, cobro, IIBB, ${mk?'marketing, ':''}envío, garantía, galpón y Ganancias. Los % se cambian en Configuración → Costos y parámetros.</p>`}
function bindImp(box){box.onclick=e=>{const b=e.target.closest('[data-imc]');if(!b)return;const t=box.querySelector(`[data-imr="${b.dataset.imc}"]`);t.hidden=!t.hidden;b.textContent=t.hidden?'Ver cuentas':'Ocultar'}}
const mkLbl=id=>`<label style="display:flex;gap:6px;align-items:center;font-weight:400;margin:0 0 6px"><input type="checkbox" id="${id}" ${MG.mkt?'checked':''} style="width:auto"> Contar el gasto en marketing <span class="hint">(destildalo para ver cuánto margen hay si no ponés plata en anuncios)</span></label>`;
async function guardarS(k,v,n){const {error}=await sb.from('settings').upsert({key:k,value:v,nota:n});toast(error?'No se pudo guardar':'Guardado: la tienda ya lo usa');STP[k]=v;if(typeof ST!=='undefined')ST[k]=v}

function editar(x,tipo){x=x||{tipo,pct:0.1,alcance:'todo',alcance_valor:[],activo:true,cuenta_regresiva:tipo==='fecha'};const T=x.tipo==='codigo';
  const P=(typeof prods!=='undefined'?prods:[]).filter(p=>p.activo),CAT=[...new Set(P.map(p=>p.categoria).filter(Boolean))].sort();
  const d=document.createElement('dialog');d.style.maxWidth='900px';d.style.width='94vw';document.body.appendChild(d);
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
   <h4 style="margin:18px 0 6px">Cómo afecta a los productos</h4>${mkLbl('pc_mk')}<div id="pc_imp" class="hint">Calculando…</div>
   <div class="bar" style="margin-top:16px"><span class="hint neg" id="pc_e"></span><span class="sp"></span><button class="btn dk" id="pc_ok">Guardar</button></div></div>`;
  const pv=()=>{const a=d.querySelector('#pc_a').value,V=new Set(x.alcance_valor||[]),L=a==='categoria'?CAT.map(c=>[c,c]):a==='producto'?P.map(p=>[p.id,p.tipo+' '+p.nombre]):[];
    d.querySelector('#pc_v').innerHTML=L.map(([v,t])=>`<label style="margin:2px 0;display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" value="${esc(v)}" ${V.has(v)?'checked':''} style="width:auto"> ${esc(t)}</label>`).join('')};
  const imp=async()=>{await MG.cargar();const g=s=>d.querySelector(s),pct=(+String(g('#pc_p').value).replace(',','.')||0)/100,a=g('#pc_a').value,vals=[...d.querySelectorAll('#pc_v input:checked')].map(i=>i.value);
    const L=P.filter(p=>+p.precio_lista>0&&(a==='todo'||(a==='categoria'?vals.includes(p.categoria):vals.includes(p.id))));g('#pc_imp').innerHTML=impHTML(L,pct,g('#pc_mk').checked)};
  bindImp(d.querySelector('#pc_imp'));
  pv();imp();d.querySelector('#pc_a').onchange=()=>{x.alcance_valor=[];pv();imp()};d.querySelector('#pc_p').oninput=imp;d.querySelector('#pc_v').onchange=imp;d.querySelector('#pc_mk').onchange=imp;
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
  m.querySelector('#pp_cs').onchange=async e=>{const v=+e.target.value||0;await guardarS('cuotas_sin_interes',v,'Cuotas sin interés');await ctS('cuotas_si',v)};
  const cnum=v=>+String(v||'').replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')||0;
  m.querySelector('#pp_cd').onchange=async e=>{const v=cnum(e.target.value);await guardarS('cuotas_promo_desde',v,'Cuotas promo: desde este monto');await ctS('cuotas_promo_desde',v);pintar()};
  m.querySelector('#pp_cn').onchange=async e=>{const v=+e.target.value||0;await guardarS('cuotas_promo_n',v,'Cuotas promo: cantidad sin interés');await ctS('cuotas_promo_n',v);pintar()};
  m.querySelector('#pp_cc').onchange=async e=>{await guardarS('cuotas_promo_costo',cnum(e.target.value)/100,'Cuotas promo: costo en Mercado Pago');pintar()};
  m.querySelector('#pp_cok').onchange=async e=>{const v=e.target.checked?1:0;await guardarS('cuotas_promo_ok',v,'Cuotas promo activada en Mercado Pago');await ctS('cuotas_promo_ok',v)};
  const ppi=m.querySelector('#pp_imp');if(ppi){const go=async()=>{await MG.cargar();const L=(typeof prods!=='undefined'?prods:[]).filter(p=>p.activo&&+p.precio_lista>=STP.cuotas_promo_desde);ppi.innerHTML=impHTML(L,0,m.querySelector('#pp_mk').checked,{medio:'cuotasN',cc:STP.cuotas_promo_costo||0.17})};bindImp(ppi);m.querySelector('#pp_mk').onchange=go;go()}
  m.querySelectorAll('[data-pnew]').forEach(b=>b.onclick=()=>editar(null,b.dataset.pnew));
  m.querySelectorAll('[data-ped]').forEach(b=>b.onclick=()=>editar(PR.find(x=>x.id==b.dataset.ped)));
  m.querySelectorAll('[data-pml]').forEach(b=>b.onclick=()=>mail(PR.find(x=>x.id==b.dataset.pml)||null));
  m.querySelectorAll('[data-pln]').forEach(b=>b.onclick=async()=>{const x=PR.find(y=>y.id==b.dataset.pln),u='https://www.formaconceptba.com/?cupon='+encodeURIComponent(x.codigo);try{await navigator.clipboard.writeText(u);toast('Link copiado: '+u)}catch(e){prompt('Copiá el link:',u)}});
  m.querySelectorAll('[data-pon]').forEach(c=>c.onchange=async()=>{const {error}=await sb.from('promociones').update({activo:c.checked}).eq('id',c.dataset.pon);toast(error?'No se pudo guardar':c.checked?'Activada':'Apagada');pintar()});
  m.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=async()=>{const x=PR.find(y=>y.id==b.dataset.pdel);if(!confirm(`¿Borrar "${x.codigo||x.nombre}"? Si sólo querés pausarla, destildá "Activa".`))return;const {error}=await sb.from('promociones').delete().eq('id',x.id);toast(error?'No se pudo borrar':'Borrada');pintar()})}

async function ctS(k,v){const {error}=await sb.from('config_tienda').upsert({key:k,value:String(v??'')});if(error)toast('No se pudo guardar en la tienda')}
/* ---- Tienda online → Cartel de arriba ---- */
async function cartel(){$('#m').innerHTML='<p class="hint">Cargando…</p>';const {data}=await sb.from('config_tienda').select('key,value').like('key','cartel_%');const C=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  const {data:pv}=await sb.rpc('promo_vigente');const cd=(pv||[]).find(x=>x.cuenta_regresiva&&x.hasta);if(tab!=='cartel')return;
  $('#m').innerHTML=`<p class="hint" style="max-width:820px;margin:0 0 14px">La franja negra que aparece arriba de todo en la página de inicio. Sirve para avisar algo: una promo, un envío gratis, una novedad. <b>Si hay una promoción con cuenta regresiva corriendo, se muestra esa</b> (se arma en Precios y promociones → Promociones y códigos) y este cartel espera.</p>
   ${cd?`<div class="card pad iwarn" style="margin-bottom:12px">Ahora se está mostrando la cuenta regresiva de <b>${esc(cd.nombre)}</b> (hasta ${new Date(cd.hasta).toLocaleString('es-AR')}).</div>`:''}
   <div class="card pad" style="max-width:720px">
    <label style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="ca_on" ${+C.cartel_on===1?'checked':''} style="width:auto"> <b>Mostrar el cartel</b></label>
    <label>Texto</label><input id="ca_t" value="${esc(C.cartel_txt||'')}" placeholder="ej. ENVÍO GRATIS EN CABA Y GBA">
    <div class="g2d" style="gap:10px;margin-top:10px"><div><label>Botón (opcional)</label><input id="ca_b" value="${esc(C.cartel_btn||'')}" placeholder="ej. Ver productos"></div><div><label>Link del botón</label><input id="ca_l" value="${esc(C.cartel_link||'')}" placeholder="ej. #tienda o https://…"></div></div>
    <p style="margin:14px 0 6px" class="hint">Así se ve:</p><div id="ca_pv" style="background:#141414;color:#fff;padding:11px 16px;font-size:13px;text-align:center;text-transform:uppercase;letter-spacing:.02em"></div>
    <div class="bar" style="margin-top:14px"><span class="sp"></span><button class="btn dk" id="ca_ok">Guardar</button></div></div>`;
  const g=s=>$('#m').querySelector(s),prev=()=>{g('#ca_pv').innerHTML=`<b>${esc(g('#ca_t').value||'Tu texto')}</b>${g('#ca_b').value?` &nbsp; <u>${esc(g('#ca_b').value)}</u>`:''}`};prev();['#ca_t','#ca_b'].forEach(s=>g(s).oninput=prev);
  g('#ca_ok').onclick=async()=>{for(const [k,v] of [['cartel_on',g('#ca_on').checked?1:0],['cartel_txt',g('#ca_t').value.trim()],['cartel_btn',g('#ca_b').value.trim()],['cartel_link',g('#ca_l').value.trim()]])await ctS(k,v);toast('Guardado: ya se ve en la tienda')}}
if(typeof draw==='function'){const _c=draw;draw=async function(){if(tab==='cartel'){if(typeof drawNav==='function')drawNav();return cartel()}return _c.apply(this,arguments)}}
if(window.AYUDA)AYUDA.cartel='La franja de arriba de la página de inicio: un aviso con texto y botón. Si hay una promo con cuenta regresiva, se muestra esa.';
if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='mailpromo'){tab='promos';if(typeof drawNav==='function')drawNav();await pintar();return mail(null)}if(tab==='promos'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
window.promoMail=mail;
if(window.AYUDA)AYUDA.promos='Promociones por tiempo limitado (con cuenta regresiva en la tienda), códigos de descuento para influencers o clientes, preventa, transferencia y cuotas, y mails a toda la lista.';
})();
