/* ---------- SKU de venta, paleta FORMA, cajas, stock por caja, ingreso de contenedor y despachos a Pailos ----------
   Las reglas duras (SKU automático, bloqueo al confirmar, código de color fijo, stock = suma de movimientos) están en la base:
   supabase/2026-11-24_sku.sql. Acá están las pantallas. */
let PAL=[],PALREF=[],VARS=[],CAJAS=[],STKC={},STKV={};
const ESTV={borrador:'Borrador',confirmado:'Confirmado',impreso:'Impreso en cajas',discontinuado:'Discontinuado'};
const PARTES=['COMPLETA','TAPA','BASE'];
async function loadSkus(){
  const [{data:c},{data:r},{data:v},{data:k},{data:sc},{data:sv}]=await Promise.all([sb.from('colores').select('*').order('codigo'),sb.from('colores_proveedor').select('*'),sb.from('variantes').select('*').order('codigo_master').order('orden'),sb.from('cajas').select('*').order('orden'),sb.rpc('stock_cajas_admin'),sb.rpc('stock_variantes_admin')]);
  PAL=c||[];PALREF=r||[];VARS=v||[];CAJAS=k||[];STKC=Object.fromEntries((sc||[]).map(x=>[x.sku_caja,x]));STKV=Object.fromEntries((sv||[]).map(x=>[x.sku,x]));
}
const colNom=c=>(PAL.find(x=>x.codigo===c)||{}).nombre||c;
const colHex=c=>(PAL.find(x=>x.codigo===c)||{}).hex||'#cfc8bd';
const dot=c=>`<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(colHex(c))};border:1px solid rgba(0,0,0,.15);vertical-align:-1px;margin-right:6px"></i>`;
const skuPrev=(cod,col)=>{const a=(cod.match(/^([A-Z]{3})/)||[])[1],n=(cod.match(/-(\d{3,})-/)||[])[1];return a&&n&&col?`${a}-${n}-${col}`:'—'};
const cajaPrev=(sku,parte)=>parte==='COMPLETA'?sku:parte==='TAPA'?sku+'-T':parte==='BASE'?sku+'-B':sku+'-'+String(parte||'').slice(0,1).toUpperCase();
const cbmCaja=k=>k.largo_cm&&k.ancho_cm&&k.alto_cm?k.largo_cm*k.ancho_cm*k.alto_cm/1e6:null;

/* ===== Administración → Colores FORMA ===== */
async function drawPaleta(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';await loadSkus();
  const uso=c=>VARS.filter(v=>v.color===c&&v.estado!=='discontinuado').map(v=>v.sku);
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Colores FORMA</b></div>
  <p class="hint" style="max-width:780px">El código va en el SKU; el nombre es lo que ve el cliente en la web, en la caja y en la factura. <b>Un código no se cambia ni se borra</b>: si un tono deja de usarse se desactiva, y si aparece un tono nuevo lleva código nuevo (ej. gris oscuro = GRO). La referencia del proveedor queda acá y en la orden de compra, nunca en el SKU.</p>
  <div class="card wrap"><table><thead><tr><th>Código</th><th>Nombre (web, caja, cliente)</th><th>Color</th><th>Referencias del proveedor</th><th>Usado en</th><th>Activo</th></tr></thead><tbody>
  ${PAL.map(c=>`<tr class="${c.activo?'':'off'}"><td><b style="font:600 15px Outfit,sans-serif;letter-spacing:.05em">${esc(c.codigo)}</b></td><td><input data-pn="${c.codigo}" value="${esc(c.nombre)}" style="width:150px"></td>
   <td style="white-space:nowrap"><input type="color" data-ph="${c.codigo}" value="${esc(c.hex||'#cccccc')}" style="width:42px;height:28px;padding:0;border:0"> <span class="hint">${esc(c.hex||'sin color')}</span></td>
   <td>${PALREF.filter(r=>r.color===c.codigo).map(r=>`<div class="hint">${esc(r.proveedor.replace('PROV-CHN-',''))}: ${esc(r.referencia)}</div>`).join('')}<button class="lnk" data-pr="${c.codigo}">+ referencia</button></td>
   <td class="hint">${uso(c.codigo).join(', ')||'—'}</td><td><input type="checkbox" data-pa="${c.codigo}" ${c.activo?'checked':''} style="width:auto"></td></tr>`).join('')}</tbody></table></div>
  <div class="card pad" style="margin-top:12px;max-width:620px"><h4>Color nuevo</h4><div class="bar" style="gap:8px"><input id="nc" placeholder="Código (3 letras)" maxlength="3" style="width:130px;text-transform:uppercase"><input id="nn" placeholder="Nombre" style="width:180px"><input type="color" id="nh" value="#cccccc" style="width:42px;height:32px;padding:0;border:0"><button class="btn dk" id="nok">Crear</button></div><p class="hint">El código no se va a poder cambiar después.</p></div>`;
  const up=async(c,campo,v)=>{const {error}=await sb.from('colores').update({[campo]:v}).eq('codigo',c);toast(error?'No se pudo guardar':'Guardado')};
  $('#m').querySelectorAll('[data-pn]').forEach(i=>i.onchange=()=>up(i.dataset.pn,'nombre',i.value.trim()));
  $('#m').querySelectorAll('[data-ph]').forEach(i=>i.onchange=()=>{i.nextElementSibling.textContent=i.value.toUpperCase();up(i.dataset.ph,'hex',i.value.toUpperCase())});
  $('#m').querySelectorAll('[data-pa]').forEach(i=>i.onchange=()=>up(i.dataset.pa,'activo',i.checked));
  $('#m').querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{const c=b.dataset.pr;b.outerHTML=`<div class="bar" style="gap:6px;margin:4px 0"><input list="dlprov" placeholder="PROV-CHN-RUD" style="width:130px" data-rp><input placeholder="Referencia (ej. Claret P-821207)" style="width:200px" data-rr><button class="btn" data-rok="${c}">Agregar</button></div><datalist id="dlprov">${[...new Set(master.map(m=>m.proveedor).filter(Boolean))].map(p=>`<option value="${esc(p)}">`).join('')}</datalist>`;
    const ok=$(`[data-rok="${c}"]`);ok.onclick=async()=>{const w=ok.parentElement,p=w.querySelector('[data-rp]').value.trim().toUpperCase(),r=w.querySelector('[data-rr]').value.trim();if(!p||!r)return toast('Completá proveedor y referencia');const {error}=await sb.from('colores_proveedor').insert({color:c,proveedor:p,referencia:r});toast(error?'No se pudo guardar':'Referencia agregada');drawPaleta()}});
  $('#nok').onclick=async()=>{const c=$('#nc').value.trim().toUpperCase(),n=$('#nn').value.trim();if(!/^[A-Z]{3}$/.test(c))return toast('El código son 3 letras');if(!n)return toast('Poné el nombre');if(PAL.some(x=>x.codigo===c))return toast('Ese código ya existe');
    const {error}=await sb.from('colores').insert({codigo:c,nombre:n,hex:$('#nh').value.toUpperCase()});toast(error?(error.code==='23505'?'Ese código ya existe':'No se pudo crear'):'Color creado');if(!error)drawPaleta()};
}

/* ===== Maestro → ficha del producto: variantes de color (SKU de venta) y sus cajas ===== */
async function abrirVariantes(cod){
  await loadSkus();const m=byCod(cod)||{codigo:cod,descripcion:''};
  const d=document.createElement('dialog');d.style.maxWidth='980px';document.body.appendChild(d);
  const pintar=()=>{const V=VARS.filter(v=>v.codigo_master===cod);
    d.innerHTML=`<div class="dh"><h2>${esc(m.descripcion||cod)} <span class="hint">${esc(cod)}</span></h2><button class="btn" data-x>Cerrar</button></div><div class="db">
    <p class="hint">Cada color es un SKU de venta (CATEGORÍA-NÚMERO-COLOR). Se arma solo y se bloquea al confirmarlo. Lo que se vende en la web es el SKU; lo que despacha Pailos son sus cajas.</p>
    ${V.map(v=>{const K=CAJAS.filter(k=>k.sku===v.sku),s=STKV[v.sku]||{},bloq=v.estado!=='borrador',sig={borrador:'confirmado',confirmado:'impreso'}[v.estado];
      return `<div class="card pad" style="margin-bottom:12px${v.estado==='discontinuado'?';opacity:.55':''}"><div class="bar" style="margin:0 0 8px;gap:10px"><b style="font:600 18px Outfit,sans-serif;letter-spacing:.03em">${esc(v.sku)}</b>${bloq?'<span class="tag">🔒 bloqueado</span>':''}<span class="hint">${ESTV[v.estado]}</span><span class="sp"></span>
       <span class="hint">Disponible: <b>${s.con_datos?s.disponible:'—'}</b>${s.con_datos?'':' (sin stock ni contenedor confirmado)'}</span>
       ${sig?`<button class="btn" data-est="${v.sku}|${sig}">${sig==='confirmado'?'Confirmar SKU':'Marcar impreso en cajas'}</button>`:''}${v.estado!=='discontinuado'?`<button class="btn" data-est="${v.sku}|discontinuado">Discontinuar</button>`:''}${v.estado==='borrador'?`<button class="btn" data-vdel="${v.sku}">Borrar</button>`:''}</div>
       <div style="display:grid;grid-template-columns:170px 1fr 1fr;gap:10px"><div><label>Color FORMA</label>${bloq?`<div>${dot(v.color)}${esc(colNom(v.color))} <span class="hint">${v.color}</span></div>`:`<select data-vc="${v.sku}">${PAL.filter(c=>c.activo||c.codigo===v.color).map(c=>`<option value="${c.codigo}" ${c.codigo===v.color?'selected':''}>${c.codigo} · ${esc(c.nombre)}</option>`).join('')}</select>`}</div>
        <div><label>Referencia de color / tela del proveedor</label><input data-vr="${v.sku}" value="${esc(v.ref_proveedor||'')}"></div><div><label>Descripción en castellano (caja y cliente)</label><input data-vd="${v.sku}" value="${esc(v.descripcion||'')}"></div></div>
       <h4 style="margin:12px 0 6px">Cajas</h4><div class="wrap"><table><thead><tr><th>SKU de caja</th><th>Parte</th><th class="n">Piezas por caja</th><th class="n">Largo cm</th><th class="n">Ancho cm</th><th class="n">Alto cm</th><th class="n">Peso bruto kg</th><th class="n">Peso neto kg</th><th class="n">CBM</th><th class="n">Stock (piezas)</th><th></th></tr></thead><tbody>
       ${K.map(k=>{const st=STKC[k.sku_caja]||{};return `<tr><td><b>${esc(k.sku_caja)}</b></td><td><input data-kp="${k.sku_caja}" list="dlpartes" value="${esc(k.parte)}" style="width:110px;text-transform:uppercase" ${bloq?'disabled title="SKU bloqueado"':''}></td>
        ${['piezas','largo_cm','ancho_cm','alto_cm','peso_bruto','peso_neto'].map(f=>`<td class="n"><input class="num n" style="width:64px" data-kf="${k.sku_caja}|${f}" value="${k[f]??''}" placeholder="${f==='piezas'?'1':'pendiente'}" inputmode="decimal"></td>`).join('')}
        <td class="n">${k.cbm!=null?eN(+k.cbm,3):'—'}</td><td class="n">${st.fisico??0}${st.en_camino?`<div class="hint">+${st.en_camino} en camino</div>`:''}</td><td>${bloq?'':`<button class="btn" data-kdel="${k.sku_caja}">×</button>`}</td></tr>`}).join('')||'<tr><td colspan="11" class="hint">Sin cajas: agregá al menos una o la variante no se puede vender.</td></tr>'}</tbody></table></div>
       ${bloq&&K.length?'':`<div class="bar" style="gap:6px;margin-top:6px"><select data-kn="${v.sku}">${PARTES.concat(['OTRA…']).map(p=>`<option>${p}</option>`).join('')}</select><button class="btn" data-kadd="${v.sku}">+ Caja</button><span class="hint">Una sola caja = mismo código que el SKU. Tapa y base = -T y -B.</span></div>`}</div>`}).join('')||'<p class="hint">Todavía no tiene variantes de color.</p>'}
    <datalist id="dlpartes">${PARTES.map(p=>`<option value="${p}">`).join('')}</datalist>
    <div class="card pad" style="background:var(--box)"><h4 style="margin-top:0">Nuevo color para este producto</h4><div class="bar" style="gap:8px"><select id="vnc"><option value="">Elegí el color…</option>${PAL.filter(c=>c.activo&&!V.some(v=>v.color===c.codigo)).map(c=>`<option value="${c.codigo}">${c.codigo} · ${esc(c.nombre)}</option>`).join('')}</select><span>SKU: <b id="vns">—</b></span><button class="btn dk" id="vnok">Crear variante</button></div></div></div>`;
    d.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{d.close();d.remove();if(tab==='maestro')drawMaster()});
    const err=e=>toast((e&&e.message||'No se pudo').replace(/^.*?:\s*/,''));
    const vup=async(sku,o)=>{const {error}=await sb.from('variantes').update(o).eq('sku',sku);if(error)return err(error);await loadSkus();pintar();toast('Guardado')};
    d.querySelector('#vnc').onchange=e=>d.querySelector('#vns').textContent=skuPrev(cod,e.target.value);
    d.querySelector('#vnok').onclick=async()=>{const c=d.querySelector('#vnc').value;if(!c)return toast('Elegí el color');const n=VARS.filter(v=>v.codigo_master===cod).length+1;
      const {data,error}=await sb.from('variantes').insert({sku:'',codigo_master:cod,color:c,descripcion:(VARS.find(v=>v.codigo_master===cod)||{}).descripcion||m.descripcion||null,orden:n}).select().single();if(error)return err(error);
      await sb.from('cajas').insert({sku_caja:'',sku:data.sku,parte:'COMPLETA',piezas:1});await loadSkus();pintar();toast('Variante '+data.sku+' creada')};
    d.querySelectorAll('[data-vc]').forEach(s=>s.onchange=()=>vup(s.dataset.vc,{color:s.value}));
    d.querySelectorAll('[data-vr]').forEach(i=>i.onchange=()=>vup(i.dataset.vr,{ref_proveedor:i.value.trim()||null}));
    d.querySelectorAll('[data-vd]').forEach(i=>i.onchange=()=>vup(i.dataset.vd,{descripcion:i.value.trim()||null}));
    d.querySelectorAll('[data-est]').forEach(b=>b.onclick=()=>{const [sku,e]=b.dataset.est.split('|');const t={confirmado:`¿Confirmar ${sku}? Desde ahora el SKU queda bloqueado: no se cambia ni el producto ni el color.`,impreso:`¿Marcar ${sku} como impreso en cajas?`,discontinuado:`¿Discontinuar ${sku}? Deja de venderse y el código no se recicla nunca. No se puede deshacer.`}[e];if(confirm(t))vup(sku,{estado:e})});
    d.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Borrar esta variante en borrador?'))return;const {error}=await sb.from('variantes').delete().eq('sku',b.dataset.vdel);if(error)return err(error);await loadSkus();pintar()});
    d.querySelectorAll('[data-kf]').forEach(i=>i.onchange=async()=>{const [kc,f]=i.dataset.kf.split('|');let v=pnum(i.value);if(f==='piezas')v=Math.max(1,Math.round(v||1));const {error}=await sb.from('cajas').update({[f]:v}).eq('sku_caja',kc);if(error)return err(error);await loadSkus();pintar()});
    d.querySelectorAll('[data-kp]').forEach(i=>i.onchange=async()=>{const p=i.value.trim().toUpperCase()||'COMPLETA';const {error}=await sb.from('cajas').update({parte:p}).eq('sku_caja',i.dataset.kp);if(error)return toast(error.code==='23505'?'Ya hay una caja con esa parte':'No se pudo');await loadSkus();pintar()});
    d.querySelectorAll('[data-kdel]').forEach(b=>b.onclick=async()=>{const {error}=await sb.from('cajas').delete().eq('sku_caja',b.dataset.kdel);if(error)return toast('No se puede: esa caja ya tiene movimientos de stock');await loadSkus();pintar()});
    d.querySelectorAll('[data-kadd]').forEach(b=>b.onclick=async()=>{const sku=b.dataset.kadd;let p=d.querySelector(`[data-kn="${sku}"]`).value;if(p==='OTRA…'){p=(prompt('¿Qué parte es? (ej. RESPALDO)')||'').trim().toUpperCase();if(!p)return}
      const K=CAJAS.filter(k=>k.sku===sku);
      /* si tenía una sola caja COMPLETA y ahora se agregan partes, esa pasa a ser la otra parte (tapa y base) */
      if(K.length===1&&K[0].parte==='COMPLETA'&&p!=='COMPLETA'){const {error}=await sb.from('cajas').update({parte:p==='BASE'?'TAPA':'BASE',orden:p==='BASE'?1:2}).eq('sku_caja',K[0].sku_caja);if(error)return err(error)}
      const {error}=await sb.from('cajas').insert({sku_caja:'',sku,parte:p,piezas:1,orden:p==='TAPA'?1:p==='BASE'?2:3});if(error)return toast(error.code==='23505'?'Ya existe esa caja':'No se pudo');await loadSkus();pintar()});
  };
  pintar();d.showModal();
}

/* ===== Administración → Stock Pailos: por SKU de caja, en piezas ===== */
let STKQ='';
async function drawStock(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';await Promise.all([loadSkus(),master.length?0:loadMaster()]);
  const vs=VARS.filter(v=>v.estado!=='discontinuado'&&(!STKQ||(v.sku+' '+v.descripcion+' '+colNom(v.color)).toLowerCase().includes(STKQ.toLowerCase())));
  const tot=CAJAS.reduce((a,k)=>a+((STKC[k.sku_caja]||{}).fisico||0),0);
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Stock en Pailos</b><span class="sp"></span><input id="sq" placeholder="Buscar SKU, producto o color" value="${esc(STKQ)}"><button class="btn" id="simp">Importar stock de Pailos (.xlsx / .csv)</button></div>
  <p class="hint" style="max-width:820px">Pailos cuenta por <b>caja</b>, en piezas. Lo que se vende es la variante: su disponible es el <b>mínimo entre sus cajas</b> (si falta una, no se puede vender). El stock es la suma de movimientos (ingresos, ventas, ajustes): nada se pisa, todo queda registrado.</p>
  <div class="kps">${[['Piezas en Pailos',tot],['Variantes',vs.length],['Sin stock para vender',vs.filter(v=>(STKV[v.sku]||{}).disponible<=0).length]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
  <div class="card wrap"><table><thead><tr><th>SKU de venta</th><th>Producto</th><th>Color</th><th class="n">Disponible</th><th>Cajas (físico · en camino)</th><th>Ajuste</th></tr></thead><tbody>
  ${vs.map(v=>{const K=CAJAS.filter(k=>k.sku===v.sku),s=STKV[v.sku]||{},falta=K.length&&K.some(k=>((STKC[k.sku_caja]||{}).total||0)<=0)&&K.some(k=>((STKC[k.sku_caja]||{}).total||0)>0);
   return `<tr><td><b>${esc(v.sku)}</b></td><td>${esc(v.descripcion||'')}</td><td>${dot(v.color)}${esc(colNom(v.color))}</td><td class="n"><b class="${(s.disponible||0)<=0?'neg':''}">${s.disponible??0}</b>${falta?'<div class="hint neg">falta una caja</div>':''}</td>
    <td>${K.map(k=>{const st=STKC[k.sku_caja]||{};return `<div style="white-space:nowrap"><span class="hint">${esc(k.sku_caja)}</span> <b>${st.fisico??0}</b>${st.en_camino?` · <span class="hint">${st.en_camino} en camino</span>`:''}</div>`}).join('')||'<span class="hint neg">sin cajas</span>'}</td>
    <td>${K.map(k=>`<div class="bar" style="gap:4px;margin:2px 0"><input class="num" style="width:60px" data-aj="${esc(k.sku_caja)}" placeholder="±" inputmode="numeric"><span class="hint">${esc(k.parte)}</span></div>`).join('')}</td></tr>`}).join('')}</tbody></table></div>
  <p class="hint">Ajuste: escribí cuántas piezas sumar (ej. 5) o restar (ej. −2) y te pide el motivo. Queda registrado con fecha y quién lo hizo.</p><div id="simpw"></div>`;
  $('#sq').oninput=e=>{STKQ=e.target.value;const p=e.target.selectionStart;drawStock().then(()=>{const i=$('#sq');i.focus();i.setSelectionRange(p,p)})};
  $('#m').querySelectorAll('[data-aj]').forEach(i=>i.onchange=async()=>{const n=Math.round(pnum(i.value.replace('−','-'))||0);if(!n)return;const nota=prompt(`¿Por qué ajustás ${n>0?'+':''}${n} piezas de ${i.dataset.aj}? (ej. conteo de Pailos, rotura)`);if(nota===null){i.value='';return}
    const {error}=await sb.from('stock_mov').insert({sku_caja:i.dataset.aj,piezas:n,motivo:'ajuste',nota:nota||null});toast(error?'No se pudo':'Ajuste registrado');drawStock()});
  $('#simp').onclick=importarStock;
}
/* import del stock de Pailos: SKU de caja + piezas. Muestra la diferencia contra el panel antes de aplicar. */
async function importarStock(){
  const w=$('#simpw');w.innerHTML=`<div class="card pad" style="margin-top:12px"><h4>Importar stock de Pailos</h4><p class="hint">Un Excel o CSV con una columna de código de caja y otra de piezas (o cajas). El panel ajusta cada caja para que quede igual a lo que dice Pailos.</p><input type="file" id="sif" accept=".xlsx,.xls,.csv"><div id="sip"></div></div>`;
  $('#sif').onchange=async e=>{const f=e.target.files[0];if(!f)return;await loadXLSX();const wb=XLSX.read(await f.arrayBuffer(),{type:'array',raw:/\.csv$/i.test(f.name)});const A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
    const hr=A.findIndex(r=>r.some(c=>/sku|c[oó]digo|code|item/i.test(String(c))));const H=(A[hr]||[]).map(String);
    const ci=H.findIndex(c=>/sku|c[oó]digo|code|item/i.test(c)),qi=H.findIndex(c=>/pieza|cant|qty|stock|unid/i.test(c)),ki=H.findIndex(c=>/caja|bulto|carton/i.test(c)&&!/c[oó]digo/i.test(c));
    const L=A.slice(hr+1).map(r=>{const sk=String(r[ci]||'').trim().toUpperCase(),k=CAJAS.find(x=>x.sku_caja===sk);if(!sk)return null;const q=qi>-1?pnum(r[qi]):ki>-1&&k?pnum(r[ki])*k.piezas:null;const act=(STKC[sk]||{}).fisico||0;return {sk,k,q,act,dif:q==null?null:Math.round(q)-act}}).filter(Boolean);
    $('#sip').innerHTML=`<div class="wrap"><table><thead><tr><th>Caja</th><th class="n">Pailos</th><th class="n">Panel</th><th class="n">Diferencia</th></tr></thead><tbody>${L.map(x=>`<tr${!x.k?' style="background:rgba(227,73,72,.07)"':''}><td>${esc(x.sk)}${x.k?'':' <span class="neg hint">no existe en el panel</span>'}</td><td class="n">${x.q??'—'}</td><td class="n">${x.act}</td><td class="n ${x.dif?'neg':''}">${x.dif==null?'—':(x.dif>0?'+':'')+x.dif}</td></tr>`).join('')}</tbody></table></div>
     <button class="btn dk" id="siok" style="margin-top:8px">Aplicar ${L.filter(x=>x.k&&x.dif).length} ajustes</button>`;
    $('#siok').onclick=async()=>{const rows=L.filter(x=>x.k&&x.dif).map(x=>({sku_caja:x.sk,piezas:x.dif,motivo:'importacion',nota:'Stock de Pailos · '+f.name}));if(!rows.length)return toast('No hay diferencias');const {error}=await sb.from('stock_mov').insert(rows);toast(error?'No se pudo':'Stock actualizado con lo de Pailos');drawStock()}};
}

/* ===== Contenedores → pedido → Ingreso y packing list ===== */
function ecoIngresoV(pe,r){
  const cods=new Set(r.items.map(i=>i.codigo)),V=VARS.filter(v=>cods.has(v.codigo_master)),ING=ECO.ing.filter(x=>x.pedido_id===pe.id),cj=k=>(ING.find(x=>x.sku_caja===k)||{}).cajas;
  const filas=V.flatMap(v=>CAJAS.filter(k=>k.sku===v.sku).map(k=>({v,k,c:cj(k.sku_caja)})));
  const tc=filas.reduce((a,x)=>a+(x.c||0),0),tp=filas.reduce((a,x)=>a+(x.c||0)*x.k.piezas,0),tcbm=filas.reduce((a,x)=>a+(x.c&&cbmCaja(x.k)?x.c*cbmCaja(x.k):0),0);
  const sinVar=r.items.filter(i=>!V.some(v=>v.codigo_master===i.codigo));
  return `<p class="hint" style="max-width:820px">Las cajas que llegan, por SKU de caja. Esto arma el packing list de ingreso para Pailos y, cuando el contenedor pasa a <b>Recibido</b>, entra al stock. Mientras está Confirmado o En tránsito cuenta como stock en camino.</p>
  ${sinVar.length?`<div class="card pad iwarn" style="margin-bottom:10px">Sin variantes de color (no van al packing list): ${sinVar.map(i=>esc(i.codigo)).join(', ')}. Creálas desde el Maestro.</div>`:''}
  <div class="kps">${[['Líneas',filas.filter(x=>x.c).length],['Cajas',tc],['Piezas',tp],['CBM (con medida)',eN(tcbm,2)]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
  <div class="bar"><span class="sp"></span><button class="btn dk" id="pkx">Exportar packing list para Pailos (.xlsx)</button></div>
  <div class="card wrap"><table><thead><tr><th>Código (SKU)</th><th>Descripción</th><th>Color</th><th>Parte</th><th class="n">Piezas por caja</th><th class="n">Cantidad de cajas</th><th class="n">Total piezas</th><th class="n">Medida caja (cm)</th><th class="n">CBM total</th><th class="n">Peso bruto por caja</th></tr></thead><tbody>
  ${filas.map(x=>`<tr><td><b>${esc(x.k.sku_caja)}</b></td><td>${esc(x.v.descripcion||'')}</td><td>${esc(colNom(x.v.color))}</td><td>${x.k.parte==='COMPLETA'?'—':esc(x.k.parte[0]+x.k.parte.slice(1).toLowerCase())}</td><td class="n">${x.k.piezas}</td>
   <td class="n"><input class="num n" style="width:60px" data-ing="${esc(x.k.sku_caja)}" value="${x.c??''}" inputmode="numeric"></td><td class="n">${(x.c||0)*x.k.piezas}</td><td class="n">${cbmCaja(x.k)?`${eN(x.k.largo_cm,1).replace(',0','')}×${eN(x.k.ancho_cm,1).replace(',0','')}×${eN(x.k.alto_cm,1).replace(',0','')}`:'<span class="hint">pendiente</span>'}</td>
   <td class="n">${cbmCaja(x.k)&&x.c?eN(x.c*cbmCaja(x.k),3):'<span class="hint">pendiente</span>'}</td><td class="n">${x.k.peso_bruto??'<span class="hint">pendiente</span>'}</td></tr>`).join('')}
  <tr class="tot"><td><b>TOTAL</b></td><td></td><td></td><td></td><td></td><td class="n"><b>${tc}</b></td><td class="n">${tp}</td><td></td><td class="n">${eN(tcbm,2)}</td><td></td></tr></tbody></table></div>`;
}
function bindIngreso(pe){
  $('#m').querySelectorAll('[data-ing]').forEach(i=>i.onchange=async()=>{const n=Math.max(0,Math.round(pnum(i.value)||0)),k=i.dataset.ing;const {error}=await sb.from('eco_ingreso').upsert({pedido_id:pe.id,sku_caja:k,cajas:n});if(error)return toast('No se pudo guardar');const x=ECO.ing.find(z=>z.pedido_id===pe.id&&z.sku_caja===k);if(x)x.cajas=n;else ECO.ing.push({pedido_id:pe.id,sku_caja:k,cajas:n});drawEcoPedido()});
  $('#pkx').onclick=()=>exportarPacking(pe);
}
async function exportarPacking(pe){
  await loadXLSX();const {data:emp}=await sb.from('empresa_datos').select('*').eq('id',1).maybeSingle();const P=pe.packing||{},r=ecoCalc(pe),cods=new Set(r.items.map(i=>i.codigo));
  const filas=VARS.filter(v=>cods.has(v.codigo_master)).flatMap(v=>CAJAS.filter(k=>k.sku===v.sku).map(k=>({v,k,c:(ECO.ing.find(x=>x.pedido_id===pe.id&&x.sku_caja===k.sku_caja)||{}).cajas||0}))).filter(x=>x.c>0);
  const md=k=>cbmCaja(k)?[k.largo_cm,k.ancho_cm,k.alto_cm].map(n=>String(+n).replace('.',',')).join('×').replace(/,/g,'.'):'pendiente';
  const A=[['FORMA Concept · Packing list de ingreso'],['Contenedor',P.contenedor||pe.nombre],['Importador',(emp||{}).importador||''],['Contacto',(emp||{}).contacto||''],['Estado',P.estado||''],['ETA',P.eta||'A confirmar'],[],
    ['Código (SKU)','Descripción','Color','Parte','Unidades\npor caja','Cantidad\nde cajas','Total\npiezas','Medida caja (cm)','CBM total','Peso bruto\npor caja (kg)'],
    ...filas.map(x=>[x.k.sku_caja,x.v.descripcion||'',colNom(x.v.color),x.k.parte==='COMPLETA'?(x.k.sku_caja===x.v.sku&&/^MES/.test(x.v.sku)?'Completa':'—'):x.k.parte[0]+x.k.parte.slice(1).toLowerCase(),x.k.piezas,x.c,x.c*x.k.piezas,md(x.k),cbmCaja(x.k)?Math.round(x.c*cbmCaja(x.k)*1000)/1000:'pendiente',x.k.peso_bruto??'pendiente']),
    ['TOTAL','','','','',filas.reduce((a,x)=>a+x.c,0)],[],...(P.notas||[]).map(n=>['· '+n])];
  const ws=XLSX.utils.aoa_to_sheet(A);ws['!cols']=[18,44,14,10,10,10,10,18,10,12].map(w=>({wch:w}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'PACKING LIST');
  XLSX.writeFile(wb,`${pe.nombre.replace(/\s+/g,'')}_Packing_list_Pailos.xlsx`);toast(`Packing list: ${filas.length} líneas, ${filas.reduce((a,x)=>a+x.c,0)} cajas`);
}
/* al pasar a Recibido, lo que llegó entra al stock (una sola vez) */
async function ingresarAlStock(pe){
  const {data:ya}=await sb.from('stock_mov').select('id').eq('ref','contenedor:'+pe.id).limit(1);if(ya&&ya.length)return 0;
  const rows=ECO.ing.filter(x=>x.pedido_id===pe.id&&x.cajas>0).map(x=>{const k=CAJAS.find(c=>c.sku_caja===x.sku_caja);return k?{sku_caja:x.sku_caja,piezas:x.cajas*k.piezas,motivo:'ingreso',ref:'contenedor:'+pe.id,nota:'Ingreso '+pe.nombre}:null}).filter(Boolean);
  if(!rows.length)return 0;const {error}=await sb.from('stock_mov').insert(rows);if(error){toast('No se pudo cargar el ingreso al stock');return 0}return rows.length;
}

/* ===== Pedidos → orden de despacho para Pailos ===== */
async function pintarDespachos(){
  const pag=(orders||[]).filter(o=>o.estado!=='pendiente'&&o.estado!=='cancelado');if(!pag.length)return;
  const {data:D}=await sb.from('despachos').select('*,despacho_items(*)').in('order_id',pag.map(o=>o.id));const byO=Object.fromEntries((D||[]).map(d=>[d.order_id,d]));
  const EST={pendiente:'Pendiente (definir fecha)',programado:'Fecha acordada con el cliente',enviado:'Enviada a Pailos',despachado:'Despachado',entregado:'Entregado',cancelado:'Cancelado'};
  $('#m').insertAdjacentHTML('beforeend',`<h3 style="margin:30px 0 10px">Órdenes de despacho para Pailos</h3><p class="hint" style="max-width:820px">Cada pedido pagado se traduce a las cajas que saca Pailos (una mesa en 2 cajas = tapa + base) y se descuenta del stock. Vos acordás el día con el cliente y le decís a Pailos cuándo entregar.</p>
  <div class="card wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Cajas para Pailos</th><th>Entrega</th><th>Estado</th><th></th></tr></thead><tbody>
  ${pag.map(o=>{const d=byO[o.id],tieneSku=(o.order_items||[]).some(i=>i.sku);return `<tr><td>#${o.id}</td><td><b>${esc(o.nombre||'')}</b><div class="hint">${esc(o.direccion||'')} ${esc(o.cp||'')} · ${esc(o.telefono||'')}</div></td>
   <td>${d?d.despacho_items.map(i=>`<div>${i.piezas} × <b>${esc(i.sku_caja)}</b> <span class="hint">${esc(i.descripcion||'')}</span></div>`).join(''):tieneSku?`<button class="btn" data-gd="${o.id}">Generar orden</button>`:'<span class="hint">pedido sin SKU (anterior al sistema de SKU)</span>'}</td>
   <td>${d?`<input type="date" data-df="${d.id}" value="${d.fecha_entrega||''}">`:''}</td><td>${d?`<select data-de="${d.id}">${Object.entries(EST).map(([k,l])=>`<option value="${k}" ${d.estado===k?'selected':''}>${l}</option>`).join('')}</select>`:''}</td>
   <td>${d?`<button class="btn" data-dx="${d.id}">Descargar orden</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`);
  $('#m').querySelectorAll('[data-gd]').forEach(b=>b.onclick=async()=>{const {data,error}=await sb.rpc('generar_despacho_admin',{p_order:+b.dataset.gd});toast(error||!data?'No se pudo generar':'Orden generada');draw()});
  $('#m').querySelectorAll('[data-df]').forEach(i=>i.onchange=async()=>{const {error}=await sb.from('despachos').update({fecha_entrega:i.value||null,estado:i.value?'programado':'pendiente'}).eq('id',+i.dataset.df);toast(error?'No se pudo':'Fecha guardada');draw()});
  $('#m').querySelectorAll('[data-de]').forEach(s=>s.onchange=async()=>{const {error}=await sb.from('despachos').update({estado:s.value}).eq('id',+s.dataset.de);toast(error?'No se pudo':'Guardado')});
  $('#m').querySelectorAll('[data-dx]').forEach(b=>b.onclick=async()=>{await loadXLSX();const d=(D||[]).find(x=>x.id===+b.dataset.dx),o=pag.find(x=>x.id===d.order_id);
    const A=[['FORMA Concept · Orden de despacho'],['Orden',d.id,'Pedido',o.id],['Cliente',o.nombre||''],['Dirección',`${o.direccion||''} ${o.cp||''}`],['Teléfono',o.telefono||''],['Fecha de entrega',d.fecha_entrega||'a confirmar'],[],['Código de caja (SKU)','Descripción','Parte','Piezas'],...d.despacho_items.map(i=>[i.sku_caja,i.descripcion||'',i.parte==='COMPLETA'?'—':i.parte,i.piezas])];
    const ws=XLSX.utils.aoa_to_sheet(A);ws['!cols']=[{wch:22},{wch:44},{wch:12},{wch:8}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'ORDEN');XLSX.writeFile(wb,`Orden_despacho_${d.id}_pedido_${o.id}.xlsx`)});
}
{const _dO=drawOrders;drawOrders=function(){_dO();pintarDespachos()}}
