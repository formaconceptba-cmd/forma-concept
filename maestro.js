/* ---------- Maestro de productos: reemplaza a la planilla ----------
   Alta con código automático, importar cotizaciones (.xlsx/.csv) con mapeo por proveedor, exportar,
   edición en la tabla, archivar (nunca borrar) e historial por producto (trigger master_log en la base). */
let ML={},MPRE={},MF_ARCH=false,MVIEW='lista',MHIST=null,IMP=null;
const CAMPOS_LISTA={linea:'Línea',estado:'Estado',incoterm:'Incoterm',formato:'Formato de compra',unidad:'Unidad',subcategoria:'Subcategoría',material:'Material',calidad:'Calidad',aptitud:'Aptitud FORMA',armado:'Armado',proveedor:'Proveedor'};
const loadXLSX=()=>window.XLSX?Promise.resolve():new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=ok;s.onerror=()=>ko(new Error('No se pudo cargar el lector de Excel'));document.head.appendChild(s)});
async function loadListas(){const [{data:l},{data:p}]=await Promise.all([sb.from('master_listas').select('*').order('orden').order('valor'),sb.from('master_prefijos').select('*')]);
  ML={};(l||[]).forEach(x=>(ML[x.campo]=ML[x.campo]||[]).push(x.valor));MPRE=Object.fromEntries((p||[]).map(x=>[x.subcategoria,x.prefijo]))}
/* número del código: global y correlativo, para que nunca se repita */
const maxNum=()=>master.reduce((m,x)=>{const n=+((x.codigo.match(/-(\d{3,})-/)||[])[1]||0);return Math.max(m,n)},0);
const prov3=p=>String(p||'').split('-').pop().toUpperCase().slice(0,3);
const armarCodigo=(sub,prov,n)=>MPRE[sub]&&prov?`${MPRE[sub]}-${String(n).padStart(3,'0')}-${prov3(prov)}`:null;
/* números tal como vienen en las cotizaciones: "$27,90", "1.234,56", "0.087" */
const pnum=v=>{if(v==null||v==='')return null;if(typeof v==='number')return v;let s=String(v).replace(/[^0-9.,-]/g,'');if(!s)return null;const c=s.lastIndexOf(','),d=s.lastIndexOf('.');if(c>-1&&d>-1)s=c>d?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(c>-1)s=s.replace(',','.');const n=parseFloat(s);return isFinite(n)?n:null};
const sel=(campo,val,attrs='')=>`<select ${attrs}><option value=""></option>${(ML[campo]||[]).map(v=>`<option ${v===val?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
const dl=(campo,id)=>`<datalist id="${id}">${(ML[campo]||[]).map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
async function sumarALista(campo,valor){if(!valor||(ML[campo]||[]).includes(valor))return;await sb.from('master_listas').upsert({campo,valor});(ML[campo]=ML[campo]||[]).push(valor)}

async function drawMaster(){
  if(!Object.keys(ML).length)await loadListas();
  if(!PAL.length)await loadSkus();
  if(MVIEW==='nuevo')return drawMaestroNuevo();
  if(MVIEW==='importar')return drawImportar();
  let L=master.filter(m=>(MF_ARCH?m.archivado:!m.archivado)&&(!MF.prov||m.proveedor===MF.prov)&&(!MF.cat||m.subcategoria===MF.cat)&&(!MF.mat||m.material===MF.mat)&&(!MF.est||m.estado===MF.est)
    &&(!MF.q||[m.codigo,m.descripcion,m.cod_proveedor,m.material,m.medidas,m.familia].join(' ').toLowerCase().includes(MF.q.toLowerCase())));
  const val=m=>({costo:costo(m.fob_usd,m.cbm),pro:ppro(m)}[MF.sort]??m[MF.sort]);
  L.sort((a,b)=>{const x=val(a),y=val(b);if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*MF.dir});
  const opt=(k,lab)=>`<select class="sel" data-mf="${k}"><option value="">${lab}</option>${uniq({prov:'proveedor',cat:'subcategoria',mat:'material',est:'estado'}[k]).map(v=>`<option ${MF[k]===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
  const th=(k,t,c='')=>`<th class="s ${c}" data-sort="${k}">${t}${MF.sort===k?(MF.dir>0?' ↑':' ↓'):''}</th>`;
  const inShop=new Set(prods.map(p=>p.id)),narch=master.filter(m=>m.archivado).length;
  const conts=m=>(typeof ECO!=='undefined'&&ECO.it?ECO.it.filter(i=>i.codigo===m.codigo):[]).map(i=>{const pe=ECO.ped.find(p=>p.id===i.pedido_id);return pe?` <span class="tag" title="${esc(ESTP[pe.estado]||pe.estado)}">${esc(pe.nombre)} · ${i.cant} u.</span>`:''}).join('');
  $('#m').innerHTML=`<div class="stats"><div class="card"><b>${master.filter(m=>!m.archivado).length}</b><span>productos en el Maestro</span></div><div class="card"><b>${uniq('proveedor').length}</b><span>proveedores</span></div><div class="card"><b>${L.length}</b><span>con estos filtros</span></div><div class="card"><b>${OC.reduce((a,l)=>a+l.q,0)}</b><span>unidades en la orden en armado</span></div></div>
  <div class="bar"><button class="btn dk" id="mnew">+ Nuevo producto</button><button class="btn" id="mimp">Importar cotización (.xlsx / .csv)</button><button class="btn" id="mexp">Exportar el Maestro</button><button class="btn" id="mhis">Últimos cambios</button><button class="btn" id="mbak" title="Manda ahora el respaldo por mail (además sale solo todos los lunes)">Mandar respaldo ahora</button><span class="sp"></span><label style="margin:0;white-space:nowrap"><input type="checkbox" id="march" ${MF_ARCH?'checked':''} style="width:auto"> Ver archivados (${narch})</label></div>
  <div id="mhist"></div>
  <div class="bar"><input id="mq" placeholder="Buscar código, nombre, material…" value="${esc(MF.q)}">${opt('prov','Proveedor')}${opt('cat','Subcategoría')}${opt('mat','Material')}${opt('est','Estado')}<span class="sp"></span>
  <button class="btn ${MF.view==='tabla'?'dk':''}" data-v="tabla">Tabla</button><button class="btn ${MF.view==='grilla'?'dk':''}" data-v="grilla">Fotos</button></div>
  ${MF.view==='grilla'?`<div class="mgrid">${L.map(m=>`<div class="card"><img src="${esc(m.foto_url||'')}" alt="" loading="lazy"><b>${esc(m.descripcion)}</b><div class="k"><span>${esc(m.codigo)}</span><span>${esc(m.proveedor||'')}</span></div><div class="k"><span>FOB ${usd(m.fob_usd)}</span><span>${m.cbm??'—'} m³</span></div><div class="k"><span>Costo ${usd(costo(m.fob_usd,m.cbm))}</span><span>MOQ ${m.moq??'—'}</span></div><button class="btn" data-oc="${esc(m.codigo)}">+ Orden de compra</button></div>`).join('')}</div>`
  :`<div class="card wrap"><table><thead><tr><th></th>${th('codigo','Producto')}${th('proveedor','Proveedor','hide-m')}${th('subcategoria','Subcategoría','hide-m')}${th('material','Material','hide-m')}${th('medidas','Medidas (mm)','hide-m')}${th('estado','Estado')}${th('moq','MOQ','n')}${th('fob_usd','FOB US$','n')}${th('cbm','m³','n')}${th('costo','Costo puesto','n')}<th class="n">Margen pro</th>${th('pro','Precio pro','n')}<th></th></tr></thead><tbody>
  ${L.map(m=>`<tr${m.archivado?' class="off"':''}><td><img src="${esc(m.foto_url||'')}" alt="" loading="lazy"></td><td><b>${esc(m.descripcion)}</b> ${inShop.has(m.codigo)?'<span class="tag">en tienda</span>':''}${conts(m)}<div class="hint">${esc(m.codigo)} · ${esc(m.cod_proveedor||'')}</div></td>
   <td class="hide-m">${esc(m.proveedor)}</td><td class="hide-m">${esc(m.subcategoria)}</td><td class="hide-m">${esc(m.material)}<div class="hint">${esc(m.terminacion||'')}</div></td><td class="hide-m">${esc(m.medidas)}</td>
   <td>${sel('estado',m.estado,`data-me="${esc(m.codigo)}" style="width:auto;font-size:12px"`)}</td>
   <td class="n"><input class="num n" style="width:56px" data-mf2="moq" data-cod="${esc(m.codigo)}" value="${m.moq??''}" inputmode="numeric"></td>
   <td class="n"><input class="num n" style="width:76px" data-mf2="fob_usd" data-cod="${esc(m.codigo)}" value="${m.fob_usd??''}" inputmode="decimal"></td>
   <td class="n"><input class="num n" style="width:66px" data-mf2="cbm" data-cod="${esc(m.codigo)}" value="${m.cbm??''}" inputmode="decimal"></td>
   <td class="n" data-mc="${esc(m.codigo)}">${usd(costo(m.fob_usd,m.cbm))}</td>
   <td class="n"><input class="num n" style="width:60px" data-mk="${esc(m.codigo)}" value="${m.markup!=null?Math.round(m.markup*100):''}" placeholder="${Math.round(ST.markup_pro*100)}" title="% sobre costo. Vacío = general"></td>
   <td class="n">${ars(ppro(m))}</td><td style="white-space:nowrap">${inShop.has(m.codigo)?'':`<button class="lnk" data-tienda="${esc(m.codigo)}">+ Tienda</button> · `}<button class="lnk" data-var="${esc(m.codigo)}">Colores y cajas${(()=>{const n=VARS.filter(v=>v.codigo_master===m.codigo&&v.estado!=='discontinuado').length;return n?' ('+n+')':''})()}</button> · <button class="lnk" data-hi="${esc(m.codigo)}">Historial</button> · <button class="lnk" data-oc="${esc(m.codigo)}">+ OC</button> · <button class="lnk" data-addpro="${esc(m.codigo)}">+ Pro</button> · <button class="lnk" data-arch="${esc(m.codigo)}">${m.archivado?'Restaurar':'Archivar'}</button></td></tr>`).join('')}</tbody></table></div>`}
  <p class="hint">FOB, m³, MOQ y estado se editan en la tabla: tocá "Guardar cambios" abajo. Cada cambio queda en el historial del producto. Nada se borra: se archiva, y se puede restaurar.</p>`;
  $('#mq').oninput=e=>{MF.q=e.target.value;const p=e.target.selectionStart;drawMaster();const i=$('#mq');i.focus();i.setSelectionRange(p,p)};
  $('#m').querySelectorAll('[data-mf]').forEach(s=>s.onchange=()=>{MF[s.dataset.mf]=s.value;drawMaster()});
  $('#m').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{MF.view=b.dataset.v;drawMaster()});
  $('#m').querySelectorAll('[data-sort]').forEach(h=>h.onclick=()=>{const k=h.dataset.sort;MF.dir=MF.sort===k?-MF.dir:1;MF.sort=k;drawMaster()});
  $('#m').querySelectorAll('[data-mk]').forEach(i=>i.onchange=()=>{const v=i.value.trim()===''?null:(+i.value.replace(',','.'))/100;byCod(i.dataset.mk).markup=v;mark(i,'master_productos','codigo',i.dataset.mk,'markup',v)});
  $('#m').querySelectorAll('[data-mf2]').forEach(i=>i.onchange=()=>{const k=i.dataset.mf2,m=byCod(i.dataset.cod);let v=pnum(i.value);if(v!=null&&v<0)v=null;if(k==='moq'&&v!=null)v=Math.round(v);if(k==='cbm'&&v!=null)v=Math.round(v*1000)/1000;if(v!=null&&k!=='moq')i.value=v;m[k]=v;mark(i,'master_productos','codigo',m.codigo,k,v);const c=$(`[data-mc="${CSS.escape(m.codigo)}"]`);if(c)c.textContent=usd(costo(m.fob_usd,m.cbm))});
  $('#m').querySelectorAll('[data-me]').forEach(s=>s.onchange=()=>{const m=byCod(s.dataset.me);m.estado=s.value||null;mark(s,'master_productos','codigo',m.codigo,'estado',m.estado)});
  $('#m').querySelectorAll('[data-addpro]').forEach(b=>b.onclick=async()=>{const {error}=await sb.from('catalogo_pro').upsert({codigo:b.dataset.addpro,activo:true});toast(error?'No se pudo agregar':'Agregado al catálogo profesional')});
  $('#m').querySelectorAll('[data-oc]').forEach(b=>b.onclick=()=>{const m=byCod(b.dataset.oc);const l=OC.find(x=>x.codigo===m.codigo);if(l)l.q+=(+m.moq||1);else OC.push({codigo:m.codigo,q:+m.moq||1,color:''});saveOC();toast('Agregado a la orden de compra ('+m.codigo+')');drawMaster()});
  $('#m').querySelectorAll('[data-arch]').forEach(b=>b.onclick=async()=>{const m=byCod(b.dataset.arch),v=!m.archivado;const {error}=await sb.from('master_productos').update({archivado:v}).eq('codigo',m.codigo);if(error)return toast('No se pudo');m.archivado=v;toast(v?'Archivado: lo ves tildando "Ver archivados"':'Restaurado');drawMaster()});
  $('#m').querySelectorAll('[data-tienda]').forEach(b=>b.onclick=()=>editProd(maestroAProducto(byCod(b.dataset.tienda)),true));
  $('#m').querySelectorAll('[data-var]').forEach(b=>b.onclick=()=>abrirVariantes(b.dataset.var));
  $('#march').onchange=e=>{MF_ARCH=e.target.checked;drawMaster()};
  $('#mnew').onclick=()=>{MVIEW='nuevo';drawMaster()};$('#mimp').onclick=()=>{MVIEW='importar';IMP=null;drawMaster()};$('#mexp').onclick=exportarMaestro;
  $('#mbak').onclick=async e=>{const b=e.target;b.disabled=true;b.textContent='Mandando…';const {data:{session}}=await sb.auth.getSession();const r=await fetch('/api/backup',{headers:{Authorization:'Bearer '+session.access_token}});const d=await r.json().catch(()=>({}));b.disabled=false;b.textContent='Mandar respaldo ahora';toast(r.ok?'Respaldo enviado a tu mail':(d.error||'No se pudo mandar'))};
  $('#mhis').onclick=()=>verHistorial(null);$('#m').querySelectorAll('[data-hi]').forEach(b=>b.onclick=()=>verHistorial(b.dataset.hi));
}

/* historial: qué cambió, cuándo, de qué a qué */
async function verHistorial(cod){
  const w=$('#mhist');w.innerHTML='<p class="hint">Cargando…</p>';
  let q=sb.from('master_historial').select('*').order('fecha',{ascending:false}).limit(cod?200:100);if(cod)q=q.eq('codigo',cod);
  const {data}=await q;const m=cod?byCod(cod):null;
  const NOMB={fob_usd:'FOB US$',cbm:'m³',moq:'MOQ',estado:'Estado',archivado:'Archivado',markup:'Margen pro',descripcion:'Descripción',alta:'Alta'};
  w.innerHTML=`<div class="card pad" style="margin-bottom:12px;border-left:3px solid #2a78d6"><div class="bar" style="margin:0"><h4 style="margin:0">${cod?`Historial de ${esc(m?m.descripcion:cod)} <span class="hint">${esc(cod)}</span>`:'Últimos cambios en el Maestro'}</h4><span class="sp"></span><button class="btn" id="mhx">Cerrar</button></div>
   ${(data||[]).length?`<div class="wrap" style="max-height:320px;overflow:auto"><table><thead><tr><th>Cuándo</th>${cod?'':'<th>Producto</th>'}<th>Qué</th><th class="n">Antes</th><th class="n">Después</th><th class="hide-m">Quién</th></tr></thead><tbody>${data.map(h=>`<tr><td class="hint">${new Date(h.fecha).toLocaleString('es-AR',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>${cod?'':`<td>${esc(h.codigo)}</td>`}<td>${esc(NOMB[h.campo]||h.campo)}</td><td class="n">${esc(h.antes??'—')}</td><td class="n"><b>${esc(h.despues??'—')}</b>${h.campo==='fob_usd'&&h.antes&&h.despues?`<div class="${+h.despues>+h.antes?'neg':'pos'}">${eP?eP(+h.despues/+h.antes-1):''}</div>`:''}</td><td class="hide-m hint">${esc((h.quien||'').replace(/@.*/,''))}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Todavía no hay cambios registrados. Desde ahora cada cambio queda acá.</p>'}</div>`;
  $('#mhx').onclick=()=>w.innerHTML='';w.scrollIntoView({behavior:'smooth',block:'start'});
}

/* exportar: respaldo y lo que se le pasa a alguien que no entra al panel */
async function exportarMaestro(){
  try{await loadXLSX()}catch(e){return toast(e.message)}
  const COL=['codigo','descripcion','cod_proveedor','proveedor','unidad','moq','incoterm','fob_usd','cbm','peso_kg','material','terminacion','lead_dias','linea','estado','formato','fecha_cot','medidas','armado','categoria','subcategoria','familia','tipo_proveedor','pais','ciudad','modelo_calculo','tipo_operacion','calidad','aptitud','observaciones','foto_url','markup','archivado','updated_at'];
  const rows=[...master].sort((a,b)=>a.codigo.localeCompare(b.codigo)).map(m=>Object.fromEntries(COL.map(k=>[k,m[k]??''])));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows,{header:COL}),'MAESTRO');
  const LI=Object.entries(ML).flatMap(([c,vs])=>vs.map(v=>({campo:CAMPOS_LISTA[c]||c,valor:v})));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(LI),'LISTAS');
  XLSX.writeFile(wb,`Maestro FORMA Concept ${new Date().toISOString().slice(0,10)}.xlsx`);toast(`Exportados ${rows.length} productos`);
}

/* ---- alta de un producto ---- */
function drawMaestroNuevo(){
  const hoy=new Date().toISOString().slice(0,10),F=[
   ['descripcion','Descripción *','text'],['cod_proveedor','Código del proveedor','text'],['subcategoria','Subcategoría *','sel'],['proveedor','Proveedor * (ej. PROV-CHN-BAI)','dl'],
   ['fob_usd','FOB unitario US$ *','num'],['cbm','m³ por unidad * (3 decimales)','num'],['moq','MOQ','num'],['peso_kg','Peso kg','num'],
   ['material','Material','dl'],['terminacion','Terminación','text'],['medidas','Medidas (mm, ej. 590*460*845)','text'],['armado','Armado','sel'],
   ['linea','Línea','sel'],['estado','Estado','sel'],['incoterm','Incoterm','sel'],['formato','Formato de compra','sel'],['unidad','Unidad','sel'],['lead_dias','Días de fabricación','num'],
   ['familia','Familia (ej. COMEDOR)','text'],['calidad','Calidad','sel'],['aptitud','Aptitud FORMA','sel'],['fecha_cot','Fecha de cotización','date'],['foto_url','Foto (URL)','text'],['observaciones','Observaciones','text']];
  const def={estado:'COTIZADO',incoterm:'FOB',formato:'UNIDAD',unidad:'UNIDAD',fecha_cot:hoy};
  $('#m').innerHTML=`<div class="bar"><button class="btn" id="mback">← Maestro</button><b style="font:500 20px Outfit,sans-serif">Nuevo producto</b></div>
  <div class="card pad"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">
  ${F.map(([k,l,t])=>`<div><label>${l}</label>${t==='sel'?sel(k,def[k]||'',`data-nf="${k}"`):t==='dl'?`<input data-nf="${k}" list="dl_${k}" autocomplete="off">${dl(k,'dl_'+k)}`:`<input data-nf="${k}" type="${t==='date'?'date':'text'}" ${t==='num'?'inputmode="decimal"':''} value="${def[k]||''}">`}</div>`).join('')}</div>
  <div class="bar" style="margin-top:16px"><span>Código: <b id="ncod" style="font:500 18px Outfit,sans-serif">—</b> <span class="hint">se arma solo: prefijo de la subcategoría + número correlativo + proveedor</span></span><span class="sp"></span><label style="margin:0 10px 0 0;white-space:nowrap"><input type="checkbox" id="ntienda" style="width:auto"> Agregarlo también a la tienda</label><button class="btn dk" id="nok">Dar de alta</button></div><div id="nerr" class="hint neg"></div></div>`;
  const V=k=>{const e=$(`[data-nf="${k}"]`);return e?e.value.trim():''};
  const upd=()=>{$('#ncod').textContent=armarCodigo(V('subcategoria'),V('proveedor'),maxNum()+1)||'—'};
  $('#m').querySelectorAll('[data-nf]').forEach(e=>e.oninput=e.onchange=upd);
  $('#mback').onclick=()=>{MVIEW='lista';drawMaster()};
  $('#nok').onclick=async()=>{
    const r={};F.forEach(([k,,t])=>{const v=V(k);r[k]=t==='num'?pnum(v):v||null});
    if(r.cbm!=null)r.cbm=Math.round(r.cbm*1000)/1000;if(r.moq!=null)r.moq=Math.round(r.moq);if(r.lead_dias!=null)r.lead_dias=Math.round(r.lead_dias);
    const E=[];if(!r.descripcion)E.push('falta la descripción');if(!r.subcategoria)E.push('falta la subcategoría');if(!/^PROV-[A-Z]{3}-[A-Z0-9]{3}$/i.test(r.proveedor||''))E.push('el proveedor tiene que tener la forma PROV-CHN-ABC');if(!(r.fob_usd>0))E.push('el FOB tiene que ser un número mayor a 0');if(!(r.cbm>0))E.push('los m³ tienen que ser un número mayor a 0');
    if(r.cod_proveedor&&master.some(m=>m.proveedor===r.proveedor&&(m.cod_proveedor||'').toUpperCase()===r.cod_proveedor.toUpperCase()))E.push(`ese código de proveedor ya existe en el Maestro (${master.find(m=>m.proveedor===r.proveedor&&(m.cod_proveedor||'').toUpperCase()===r.cod_proveedor.toUpperCase()).codigo})`);
    if(E.length){$('#nerr').textContent='No se puede dar de alta: '+E.join(' · ');return}
    r.proveedor=r.proveedor.toUpperCase();
    const base=master.find(m=>m.proveedor===r.proveedor)||{};Object.assign(r,{categoria:'Mobiliario',tipo_proveedor:base.tipo_proveedor||'FABRICANTE',pais:base.pais||null,ciudad:base.ciudad||null});
    /* el número se vuelve a calcular contra la base justo antes de guardar */
    const {data:cs}=await sb.from('master_productos').select('codigo');const n=(cs||[]).reduce((m,x)=>Math.max(m,+((x.codigo.match(/-(\d{3,})-/)||[])[1]||0)),0)+1;
    r.codigo=armarCodigo(r.subcategoria,r.proveedor,n);
    const {data,error}=await sb.from('master_productos').insert(r).select().single();if(error){$('#nerr').textContent='No se pudo guardar: '+error.message;return}
    master.push(data);await Promise.all([sumarALista('material',r.material),sumarALista('proveedor',r.proveedor)]);toast('Alta: '+data.codigo);MVIEW='lista';MF.q=data.codigo;const aT=$('#ntienda').checked;await drawMaster();if(aT)editProd(maestroAProducto(data),true);
  };
}

/* ---- importar una cotización: archivo → mapeo de columnas (se guarda por proveedor) → previsualización con errores → alta en lote ---- */
const IMPC=[['cod_proveedor','Código del proveedor',['item no','item','model','modelo','codigo','código','code','ref','sku','art','no.']],['descripcion','Descripción',['descrip','description','name','product','producto','nombre']],['fob_usd','FOB US$',['fob','unit price','price','precio','usd','valor']],['cbm','m³ por unidad',['cbm','m3','m³','volume','volumen']],['moq','MOQ',['moq','minimum','min']],['peso_kg','Peso kg',['g.w','gw','weight','peso','kg']],['medidas','Medidas',['size','dimension','medida','measure','l*w*h']],['material','Material',['material']],['terminacion','Terminación',['finish','terminac','color']],['subcategoria','Subcategoría',['subcateg','category','categoria']],['armado','Armado (ARMADO / KD)',['kd','armado','assembl','packing']],['familia','Familia',['familia','family','use']],['lead_dias','Días de fabricación',['lead','production','delivery','days']],['foto_url','Foto (URL)',['photo','image','foto','picture','url']],['observaciones','Observaciones',['remark','note','observ','comment']]];
async function drawImportar(){
  const S=IMP||(IMP={paso:1});
  const back=`<div class="bar"><button class="btn" id="mback">← Maestro</button><b style="font:500 20px Outfit,sans-serif">Importar cotización</b><span class="hint">Paso ${S.paso} de 3</span></div>`;
  if(S.paso===1){
    $('#m').innerHTML=back+`<div class="card pad" style="max-width:640px"><p class="hint">Subí la cotización del proveedor (el RFQ procesado) en Excel o CSV. Las columnas se mapean una vez por proveedor y quedan guardadas para la próxima.</p>
     <label>Proveedor</label><input id="ip" list="dl_proveedor" placeholder="PROV-CHN-BAI" value="${esc(S.prov||'')}" autocomplete="off">${dl('proveedor','dl_proveedor')}
     <label style="margin-top:12px">Archivo (.xlsx, .xls o .csv)</label><input type="file" id="if" accept=".xlsx,.xls,.csv">
     <div class="hint neg" id="ie"></div><button class="btn dk" id="igo" style="margin-top:12px">Leer el archivo</button></div>`;
    $('#mback').onclick=()=>{MVIEW='lista';IMP=null;drawMaster()};
    $('#igo').onclick=async()=>{const prov=$('#ip').value.trim().toUpperCase(),f=$('#if').files[0];
      if(!/^PROV-[A-Z]{3}-[A-Z0-9]{3}$/.test(prov))return $('#ie').textContent='El proveedor tiene que tener la forma PROV-CHN-ABC.';if(!f)return $('#ie').textContent='Elegí el archivo.';
      try{await loadXLSX();const wb=XLSX.read(await f.arrayBuffer(),{type:'array',raw:/.csv$/i.test(f.name)});const ws=wb.Sheets[wb.SheetNames[0]];const A=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
        const {data:mp}=await sb.from('import_mapeo').select('*').eq('proveedor',prov).maybeSingle();
        /* fila de encabezados: la guardada, o la que más se parece a nombres de columnas conocidos */
        let hr=mp&&mp.fila_encabezado!=null?mp.fila_encabezado:0,best=-1;if(!mp)A.slice(0,20).forEach((r,i)=>{const s=r.filter(c=>String(c).trim()).length+3*r.filter(c=>IMPC.some(([, ,syn])=>syn.some(w=>String(c).toLowerCase().includes(w)))).length;if(s>best){best=s;hr=i}});
        const cols=(A[hr]||[]).map((c,i)=>({i,t:String(c).trim()||('Columna '+(i+1))}));
        const map={};IMPC.forEach(([k,,syn])=>{if(mp&&mp.mapeo&&mp.mapeo[k]!=null){const c=cols.find(c=>c.t===mp.mapeo[k]);if(c)map[k]=c.i;return}const c=cols.find(c=>syn.some(w=>c.t.toLowerCase().includes(w)));if(c&&!Object.values(map).includes(c.i))map[k]=c.i});
        Object.assign(S,{paso:2,prov,A,hr,cols,map,archivo:f.name,guardado:!!mp,def:{subcategoria:'',estado:'COTIZADO',incoterm:'FOB',formato:'UNIDAD',unidad:'UNIDAD',linea:''}});drawImportar();
      }catch(e){$('#ie').textContent='No se pudo leer el archivo: '+e.message}};
    return;
  }
  if(S.paso===2){
    const ej=S.A.slice(S.hr+1,S.hr+4);
    $('#m').innerHTML=back+`<div class="card pad"><p class="hint">${esc(S.archivo)} · ${S.A.length-S.hr-1} filas · ${S.guardado?'<b>mapeo guardado de '+esc(S.prov)+'</b>':'primera vez con '+esc(S.prov)+': revisá cada columna'}</p>
     <div class="bar"><label style="margin:0">Fila de encabezados</label><input id="ihr" class="num" style="width:60px" value="${S.hr+1}" inputmode="numeric"><span class="hint">${S.cols.map(c=>esc(c.t)).join(' · ').slice(0,200)}</span></div>
     <div class="wrap"><table><thead><tr><th>Campo del Maestro</th><th>Columna del archivo</th><th class="hide-m">Ejemplo</th></tr></thead><tbody>
     ${IMPC.map(([k,l])=>`<tr><td>${l}${['descripcion','fob_usd','cbm'].includes(k)?' *':''}</td><td><select data-im="${k}"><option value="">— no viene —</option>${S.cols.map(c=>`<option value="${c.i}" ${S.map[k]===c.i?'selected':''}>${esc(c.t)}</option>`).join('')}</select></td><td class="hide-m hint">${S.map[k]!=null?ej.map(r=>esc(String(r[S.map[k]]??'').slice(0,40))).join(' · '):''}</td></tr>`).join('')}</tbody></table></div>
     <h4 style="margin-top:16px">Para lo que no viene en el archivo</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">${['subcategoria','estado','incoterm','formato','unidad','linea'].map(k=>`<div><label>${CAMPOS_LISTA[k]}${k==='subcategoria'?' (si no viene por fila)':''}</label>${sel(k,S.def[k],`data-idf="${k}"`)}</div>`).join('')}</div>
     <div class="bar" style="margin-top:14px"><span class="sp"></span><button class="btn dk" id="inx">Ver la previsualización →</button></div></div>`;
    $('#mback').onclick=()=>{MVIEW='lista';IMP=null;drawMaster()};
    $('#ihr').onchange=e=>{const v=Math.max(1,+e.target.value||1)-1;S.hr=v;S.cols=(S.A[v]||[]).map((c,i)=>({i,t:String(c).trim()||('Columna '+(i+1))}));S.map={};drawImportar()};
    $('#m').querySelectorAll('[data-im]').forEach(s=>s.onchange=()=>{S.map[s.dataset.im]=s.value===''?undefined:+s.value;drawImportar()});
    $('#m').querySelectorAll('[data-idf]').forEach(s=>s.onchange=()=>{S.def[s.dataset.idf]=s.value});
    $('#inx').onclick=()=>{if(S.map.descripcion==null||S.map.fob_usd==null||S.map.cbm==null)return toast('Mapeá al menos descripción, FOB y m³');S.paso=3;S.filas=null;drawImportar()};
    return;
  }
  /* paso 3: previsualización con errores marcados */
  if(!S.filas){const subs=ML.subcategoria||[],vistos={};
    S.filas=S.A.slice(S.hr+1).map((r,ix)=>{const g=k=>S.map[k]!=null?r[S.map[k]]:'',tx=k=>String(g(k)??'').trim();
      const f={cod_proveedor:tx('cod_proveedor')||null,descripcion:tx('descripcion')||null,fob_usd:pnum(g('fob_usd')),cbm:pnum(g('cbm')),moq:pnum(g('moq')),peso_kg:pnum(g('peso_kg')),medidas:tx('medidas')||null,material:tx('material')||null,terminacion:tx('terminacion')||null,familia:tx('familia')||null,lead_dias:pnum(g('lead_dias')),foto_url:tx('foto_url')||null,observaciones:tx('observaciones')||null};
      if(!f.cod_proveedor&&!f.descripcion&&f.fob_usd==null)return null;
      if(f.cbm!=null)f.cbm=Math.round(f.cbm*1000)/1000;if(f.moq!=null)f.moq=Math.round(f.moq);if(f.lead_dias!=null)f.lead_dias=Math.round(f.lead_dias);
      const a=tx('armado').toUpperCase();f.armado=/KD|KNOCK/.test(a)?'KD':a?'ARMADO':null;
      const sv=tx('subcategoria'),sm=subs.find(x=>x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')===sv.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));f.subcategoria=sm||S.def.subcategoria||null;
      const E=[],W=[];if(!f.descripcion)E.push('sin descripción');if(!(f.fob_usd>0))E.push('FOB inválido');if(!(f.cbm>0))E.push('m³ inválido');if(!f.subcategoria)E.push(sv?`subcategoría "${sv}" no está en la lista`:'sin subcategoría');
      if(f.cbm>5)W.push('m³ muy alto: ¿no estará en otra unidad?');if(f.fob_usd>3000)W.push('FOB muy alto');
      const k=(f.cod_proveedor||'').toUpperCase();if(k){if(vistos[k])E.push('código repetido en el archivo (fila '+vistos[k]+')');else vistos[k]=S.hr+2+ix}
      const ex=k?master.find(m=>m.proveedor===S.prov&&(m.cod_proveedor||'').toUpperCase()===k):null;
      return {fila:S.hr+2+ix,f,E,W,ex,ok:!E.length}}).filter(Boolean)}
  const F=S.filas,nN=F.filter(x=>x.ok&&!x.ex).length,nA=F.filter(x=>x.ok&&x.ex).length,nE=F.filter(x=>x.E.length).length;
  const dif=(a,b)=>a!=null&&b!=null&&+a!==+b?`<div class="hint">antes ${a}</div>`:'';
  $('#m').innerHTML=back+`<div class="kps">${[['Productos nuevos',nN],['Ya existen (se actualizan)',nA],['Con errores (no entran)',nE]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
   <div class="card wrap"><table><thead><tr><th><input type="checkbox" id="iall" checked style="width:auto"></th><th>Fila</th><th>Acción</th><th>Código prov.</th><th>Descripción</th><th>Subcategoría</th><th class="n">FOB</th><th class="n">m³</th><th class="n">MOQ</th><th>Avisos</th></tr></thead><tbody>
   ${F.map((x,i)=>`<tr${x.E.length?' style="background:rgba(227,73,72,.07)"':''}><td><input type="checkbox" data-iok="${i}" ${x.ok?'checked':'disabled'} style="width:auto"></td><td class="hint">${x.fila}</td><td>${x.E.length?'<b class="neg">no entra</b>':x.ex?`actualiza <span class="hint">${esc(x.ex.codigo)}</span>`:'<b class="pos">nuevo</b>'}</td><td>${esc(x.f.cod_proveedor||'')}</td><td>${esc(x.f.descripcion||'')}</td><td>${esc(x.f.subcategoria||'')}</td>
    <td class="n">${x.f.fob_usd??'—'}${x.ex?dif(x.ex.fob_usd,x.f.fob_usd):''}</td><td class="n">${x.f.cbm??'—'}${x.ex?dif(x.ex.cbm,x.f.cbm):''}</td><td class="n">${x.f.moq??'—'}</td><td class="hint">${[...x.E.map(e=>`<span class="neg">${esc(e)}</span>`),...x.W.map(esc)].join(' · ')}</td></tr>`).join('')}</tbody></table></div>
   <p class="hint">Los nuevos reciben su código solo (prefijo de la subcategoría + número correlativo + ${esc(prov3(S.prov))}). En los que ya existen se actualizan FOB, m³, MOQ, peso y medidas, y queda en el historial.</p>
   <div class="bar"><button class="btn" id="iprev">← Cambiar el mapeo</button><span class="sp"></span><button class="btn dk" id="igo2">Confirmar e importar</button></div>`;
  $('#mback').onclick=()=>{MVIEW='lista';IMP=null;drawMaster()};$('#iprev').onclick=()=>{S.paso=2;drawImportar()};
  $('#iall').onchange=e=>$('#m').querySelectorAll('[data-iok]:not(:disabled)').forEach(c=>c.checked=e.target.checked);
  $('#igo2').onclick=async()=>{const b=$('#igo2');b.disabled=true;b.textContent='Importando…';
    const sel_=[...$('#m').querySelectorAll('[data-iok]:checked')].map(c=>F[+c.dataset.iok]);
    /* se guarda el mapeo para la próxima cotización de este proveedor */
    await sb.from('import_mapeo').upsert({proveedor:S.prov,fila_encabezado:S.hr,mapeo:Object.fromEntries(Object.entries(S.map).filter(([,v])=>v!=null).map(([k,v])=>[k,S.cols.find(c=>c.i===v).t])),updated_at:new Date().toISOString()});
    const {data:cs}=await sb.from('master_productos').select('codigo');let n=(cs||[]).reduce((m,x)=>Math.max(m,+((x.codigo.match(/-(\d{3,})-/)||[])[1]||0)),0);
    const base=master.find(m=>m.proveedor===S.prov)||{},hoy=new Date().toISOString().slice(0,10);
    const nuevos=sel_.filter(x=>!x.ex).map(x=>({...x.f,codigo:armarCodigo(x.f.subcategoria,S.prov,++n),proveedor:S.prov,categoria:'Mobiliario',estado:S.def.estado||'COTIZADO',incoterm:S.def.incoterm||'FOB',formato:S.def.formato||'UNIDAD',unidad:S.def.unidad||'UNIDAD',linea:S.def.linea||null,fecha_cot:hoy,tipo_proveedor:base.tipo_proveedor||'FABRICANTE',pais:base.pais||null,ciudad:base.ciudad||null}));
    let ok=0,mal=[];
    for(let i=0;i<nuevos.length;i+=50){const {data,error}=await sb.from('master_productos').insert(nuevos.slice(i,i+50)).select();if(error)mal.push(error.message);else{ok+=data.length;master.push(...data)}}
    let act=0;for(const x of sel_.filter(x=>x.ex)){const u={fecha_cot:hoy};['fob_usd','cbm','moq','peso_kg','medidas'].forEach(k=>{if(x.f[k]!=null)u[k]=x.f[k]});const {error}=await sb.from('master_productos').update(u).eq('codigo',x.ex.codigo);if(error)mal.push(error.message);else{Object.assign(x.ex,u);act++}}
    await sumarALista('proveedor',S.prov);for(const m of new Set(nuevos.map(x=>x.material).filter(Boolean)))await sumarALista('material',m);
    toast(`Listo: ${ok} nuevos y ${act} actualizados${mal.length?' · '+mal.length+' con error':''}`);if(mal.length)console.error(mal);
    MVIEW='lista';IMP=null;MF.prov=S.prov;drawMaster()};
}
