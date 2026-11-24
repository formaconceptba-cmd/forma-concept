/* ---------- Packing en el Maestro: validaciones V1–V4, ficha de packing, plantilla RFQ y control contra la orden (V3) ----------
   Regla: fob_usd y cbm del Maestro son SIEMPRE por pieza. El packing (piezas por caja, cajas por unidad, medidas de cada caja)
   es lo que permite comprobar que esos dos números estén bien. */

/* medidas del producto en mm → [a,p,h]. Redondas (Φ1000*350) = D×D×H */
const dimsMM=s=>{s=String(s||'');const ro=/[Φφ⌀Ø]|^\s*D\s*\d/i.test(s);const n=(s.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>+x.replace(',','.')).filter(x=>x>0);if(ro&&n.length===2)return [n[0],n[0],n[1]];return n.length===3?n:null};
const volK=k=>k&&+k.largo_cm>0&&+k.ancho_cm>0&&+k.alto_cm>0?k.largo_cm*k.ancho_cm*k.alto_cm/1e6:null;
/* medida de caja en cm desde texto "62*59*82" (si viene en mm, se pasa a cm) */
const parseCaja=s=>{const n=(String(s||'').match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>+x.replace(',','.')).filter(x=>x>0);if(n.length<3)return null;let [l,a,h]=n;if(Math.max(l,a,h)>300){l/=10;a/=10;h/=10}return {largo_cm:l,ancho_cm:a,alto_cm:h}};
/* 1 caja = UNICA; 2 cajas = la más baja es la TAPA y la otra la BASE */
const ponerPartes=K=>{if(K.length===1)K[0].parte='UNICA';else if(K.length>1){const t=K.reduce((b,k,i)=>k.alto_cm<K[b].alto_cm?i:b,0);K.forEach((k,i)=>k.parte=i===t?'TAPA':'BASE')}return K};
/* m³ y peso por pieza calculados desde las cajas: (Σ cajas del kit) / piezas por caja */
function packCalc(m){const K=Array.isArray(m.cajas_pack)?m.cajas_pack:[];if(!K.length)return null;const vs=K.map(volK);if(vs.some(v=>v==null))return null;
  const p=+m.piezas_por_caja||1,ps=K.map(k=>+k.peso_bruto_kg||0);return {cbm:vs.reduce((a,b)=>a+b,0)/p,peso:ps.every(x=>x>0)?ps.reduce((a,b)=>a+b,0)/p:null}}
/* alertas de un producto. Ninguna bloquea: avisan */
function alertasM(m){const A=[],p=+m.piezas_por_caja||1,c=+m.cajas_por_unidad||1;
  if(p>1&&c>1)A.push({v:'Packing',g:'bad',t:'Piezas por caja y cajas por producto no pueden ser las dos mayores que 1'});
  const pc=packCalc(m);
  /* V1: se compara contra el calculado redondeado a los mismos decimales que el cargado (0,0655 → 0,07), con 8% de tolerancia */
  if(pc&&m.cbm>0){const dec=Math.min(4,(String(m.cbm).split('.')[1]||'').length),cr=Math.round(pc.cbm*10**dec)/10**dec,d=cr>0?Math.abs(m.cbm-cr)/cr:Math.abs(m.cbm-pc.cbm)/pc.cbm;if(d>.08)A.push({v:'V1',g:'bad',t:`m³ cargado ${m.cbm}, según las cajas da ${pc.cbm.toFixed(3)} por pieza (desvío ${Math.round(d*100)}%)`,fix:Math.round(pc.cbm*1000)/1000})}
  const D=dimsMM(m.medidas);
  if(!D)A.push({v:'V4',g:'warn',t:'Medidas incompletas: hacen falta ancho × profundidad × alto en mm'});
  else{const mx=Math.max(...D),mn=Math.min(...D);
    if(mn<50&&mx>=300)A.push({v:'V4',g:'warn',t:`Medida sospechosa (${mn} mm en ${esc(m.medidas)}): ¿error de tipeo?`});
    else if(m.cbm>0){const vp=D[0]*D[1]*D[2]/1e9,r=m.cbm/vp;
      if(r>1.6)A.push({v:'V2',g:'bad',t:`El m³ (${m.cbm}) es ${r.toFixed(1).replace('.',',')} veces el volumen del producto (${vp.toFixed(3)}): parece el m³ de la caja cargado como si fuera de una pieza`});
      else if(r<.25)A.push({v:'V2',g:'warn',t:`El m³ es ${Math.round(r*100)}% del volumen del producto: o viene desarmado/apilable, o falta dividir`})}}
  return A}
const alertaTag=A=>A.length?`<span class="tag" style="background:${A.some(a=>a.g==='bad')?'#fde8e8;color:#b42318':'#fff4db;color:#8a5a00'}" title="${esc(A.map(a=>a.v+': '+a.t.replace(/<[^>]+>/g,'')).join('\n'))}">⚠ ${[...new Set(A.map(a=>a.v))].join(' ')}</span>`:'';
const packTxt=m=>{const p=+m.piezas_por_caja||0,c=+m.cajas_por_unidad||0;if(!p&&!c)return '';return p>1?`${p} por caja`:c>1?`en ${c} cajas`:'1 por caja'};

/* ---- ficha de packing de un producto ---- */
function abrirPacking(cod){
  const m=byCod(cod);if(!m)return;
  const S={unidad_precio:m.unidad_precio||'PIEZA',p:+m.piezas_por_caja||1,c:+m.cajas_por_unidad||1,K:JSON.parse(JSON.stringify(Array.isArray(m.cajas_pack)?m.cajas_pack:[])),cbm:m.cbm};
  const d=document.createElement('dialog');d.style.maxWidth='860px';document.body.appendChild(d);
  const ajustarK=()=>{while(S.K.length<S.c)S.K.push({parte:'',largo_cm:null,ancho_cm:null,alto_cm:null,peso_bruto_kg:null});S.K=S.K.slice(0,S.c);
    S.K.forEach((k,i)=>{if(S.c===1)k.parte='UNICA';else if(!['TAPA','BASE'].includes(k.parte))k.parte=i?'BASE':'TAPA'})};
  const pintar=()=>{ajustarK();const prov={...m,piezas_por_caja:S.p,cajas_por_unidad:S.c,cajas_pack:S.K,cbm:S.cbm},pc=packCalc(prov),A=alertasM(prov),D=dimsMM(m.medidas);
    d.innerHTML=`<div class="dh"><h2>Packing · ${esc(m.descripcion)} <span class="hint">${esc(m.codigo)}</span></h2><button class="btn" data-x>Cerrar</button></div><div class="db">
    <p class="hint">FOB y m³ del Maestro son siempre <b>por pieza</b>. Acá se carga cómo viene embalado, para poder comprobarlos. O varias piezas en una caja, o una pieza en varias cajas: nunca las dos cosas.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px">
     <div><label>El proveedor cotizó por</label><select data-pk="unidad_precio"><option ${S.unidad_precio==='PIEZA'?'selected':''} value="PIEZA">Pieza</option><option ${S.unidad_precio==='CAJA'?'selected':''} value="CAJA">Caja</option></select></div>
     <div><label>Piezas por caja</label><input class="num" data-pk="p" value="${S.p}" inputmode="numeric"></div>
     <div><label>Cajas por producto completo</label><select data-pk="c"><option ${S.c===1?'selected':''}>1</option><option ${S.c===2?'selected':''}>2</option></select></div>
     <div><label>Medidas del producto (mm)</label><div style="padding:8px 0">${esc(m.medidas||'—')}${D?` <span class="hint">= ${(D[0]*D[1]*D[2]/1e9).toFixed(3)} m³</span>`:''}</div></div></div>
    <h4 style="margin:14px 0 6px">Cajas (medidas del proveedor)</h4><div class="wrap"><table><thead><tr><th>Parte</th><th class="n">Largo cm</th><th class="n">Ancho cm</th><th class="n">Alto cm</th><th class="n">Peso bruto kg</th><th class="n">m³ caja</th></tr></thead><tbody>
    ${S.K.map((k,i)=>`<tr><td>${S.c===1?'Única':`<select data-kp="${i}"><option ${k.parte==='TAPA'?'selected':''}>TAPA</option><option ${k.parte==='BASE'?'selected':''}>BASE</option></select>`}</td>${['largo_cm','ancho_cm','alto_cm','peso_bruto_kg'].map(f=>`<td class="n"><input class="num n" style="width:70px" data-kf="${i}|${f}" value="${k[f]??''}" inputmode="decimal"></td>`).join('')}<td class="n">${volK(k)?volK(k).toFixed(4):'—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="kps" style="margin-top:12px"><div class="card kp"><span>m³ por pieza en el Maestro</span><b>${m.cbm??'—'}</b></div><div class="card kp"><span>m³ por pieza según las cajas</span><b>${pc?pc.cbm.toFixed(3):'—'}</b></div><div class="card kp"><span>Peso por pieza según las cajas</span><b>${pc&&pc.peso?pc.peso.toFixed(1)+' kg':'—'}</b></div></div>
    ${A.length?A.map(a=>`<div class="card pad ${a.g==='bad'?'ibad':'iwarn'}" style="margin-top:8px"><b>${a.v}</b> · ${a.t}</div>`).join(''):'<p class="pos" style="margin-top:10px">Sin alertas: el packing cierra con el m³ cargado.</p>'}
    <div class="bar" style="margin-top:14px"><span class="hint" id="pkerr"></span><span class="sp"></span>${pc&&Math.abs((m.cbm||0)-pc.cbm)>0.0005?`<button class="btn" data-usar>Guardar y usar ${pc.cbm.toFixed(3)} como m³ por pieza</button>`:''}<button class="btn dk" data-ok>Guardar packing</button></div></div>`;
    d.querySelector('[data-x]').onclick=()=>{d.close();d.remove()};
    d.querySelectorAll('[data-pk]').forEach(e=>e.onchange=()=>{const k=e.dataset.pk;if(k==='unidad_precio')S.unidad_precio=e.value;else if(k==='p')S.p=Math.max(1,Math.round(pnum(e.value)||1));else S.c=+e.value;if(S.p>1&&S.c>1){S.c=1;toast('Con varias piezas por caja, el producto va en 1 caja')}pintar()});
    d.querySelectorAll('[data-kp]').forEach(e=>e.onchange=()=>{S.K[+e.dataset.kp].parte=e.value;pintar()});
    d.querySelectorAll('[data-kf]').forEach(e=>e.onchange=()=>{const [i,f]=e.dataset.kf.split('|');const v=pnum(e.value);S.K[+i][f]=v!=null&&v>0?v:null;pintar()});
    const guardar=async usar=>{const u={unidad_precio:S.unidad_precio,piezas_por_caja:S.p,cajas_por_unidad:S.c,cajas_pack:S.K.some(k=>volK(k)||k.peso_bruto_kg)?S.K:null};
      if(usar&&pc)u.cbm=Math.round(pc.cbm*1000)/1000;if(usar&&pc&&pc.peso)u.peso_kg=Math.round(pc.peso*10)/10;
      const {error}=await sb.from('master_productos').update(u).eq('codigo',m.codigo);if(error){d.querySelector('#pkerr').textContent='No se pudo guardar: '+error.message;return}
      Object.assign(m,u);toast('Packing guardado'+(u.cbm!=null?' · m³ actualizado':''));d.close();d.remove();if(tab==='maestro')drawMaster()};
    d.querySelector('[data-ok]').onclick=()=>guardar(false);const us=d.querySelector('[data-usar]');if(us)us.onclick=()=>guardar(true)};
  pintar();d.showModal();
}

/* ---- plantilla de RFQ para mandar al proveedor (con los productos filtrados, o vacía) ---- */
const RFQ_COLS=['Item No. (your code)','FC Code','Description','Photo','Size L×W×H (mm)','Material','Finish / Color','MOQ','Incoterm','Price unit (PIECE / CARTON)','Unit price USD','Unit CBM (per piece)','Gross weight per piece (kg)','Pieces per carton','Cartons per complete unit (1 or 2)','Carton 1 size L×W×H (cm)','Carton 1 gross weight (kg)','Carton 2 size L×W×H (cm)','Carton 2 gross weight (kg)','Production lead time (days)','Remarks'];
async function plantillaRFQ(L){
  try{await loadXLSX()}catch(e){return toast(e.message)}
  const filas=(L&&L.length?L:[]).map(m=>{const K=Array.isArray(m.cajas_pack)?m.cajas_pack:[],md=k=>volK(k)?`${k.largo_cm}*${k.ancho_cm}*${k.alto_cm}`:'';
    return [m.cod_proveedor||'',m.codigo,m.descripcion||'',m.foto_url||'',m.medidas||'',m.material||'',m.terminacion||'',m.moq??'',m.incoterm||'FOB',m.unidad_precio==='CAJA'?'CARTON':'PIECE','','','',m.piezas_por_caja??'',m.cajas_por_unidad??'',md(K[0]||{}),(K[0]||{}).peso_bruto_kg??'',md(K[1]||{}),(K[1]||{}).peso_bruto_kg??'',m.lead_dias??'','']});
  while(filas.length<(L&&L.length?0:30))filas.push(RFQ_COLS.map(()=>''));
  const A=[['FORMA Concept · Request for Quotation'],['IMPORTANT: Unit price and CBM must be PER PIECE, not per carton. If you quote per carton, write CARTON in "Price unit". If one piece comes in 2 cartons (e.g. top + base), fill Carton 1 and Carton 2. One line per model and color.'],[],RFQ_COLS,...filas];
  const ws=XLSX.utils.aoa_to_sheet(A);ws['!cols']=RFQ_COLS.map((c,i)=>({wch:[2,10,15,19,20].includes(i)?28:Math.max(12,Math.min(24,c.length))}));ws['!merges']=[{s:{r:1,c:0},e:{r:1,c:12}}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'RFQ');XLSX.writeFile(wb,`RFQ FORMA Concept ${new Date().toISOString().slice(0,10)}.xlsx`);
  toast(L&&L.length?`Plantilla RFQ con ${L.length} productos`:'Plantilla RFQ vacía');
}

/* ---- V3: la orden de compra contra el Maestro (packing y m³) ---- */
function v3Orden(pe,r){
  const ING=ECO.ing.filter(x=>x.pedido_id===pe.id),out=[];
  for(const it of r.items){const m=byCod(it.codigo);if(!m)continue;const V=VARS.filter(v=>v.codigo_master===it.codigo&&v.estado!=='discontinuado');if(!V.length)continue;
    let cbmO=0,uds=0,completo=true,p=1,c=1,pack=null;
    for(const v of V){const K=CAJAS.filter(k=>k.sku===v.sku);if(!K.length)continue;let u=Infinity;
      for(const k of K){const n=(ING.find(x=>x.sku_caja===k.sku_caja)||{}).cajas||0;u=Math.min(u,n*k.piezas);const vk=cbmCaja(k);if(n&&vk==null)completo=false;cbmO+=n*(vk||0)}
      if(isFinite(u))uds+=u;p=Math.max(p,...K.map(k=>k.piezas));c=Math.max(c,K.length);
      if(!pack&&K.every(k=>cbmCaja(k)))pack=[...K].sort((a,b)=>(a.orden||0)-(b.orden||0)).map(k=>({parte:k.parte==='COMPLETA'?'UNICA':k.parte,largo_cm:+k.largo_cm,ancho_cm:+k.ancho_cm,alto_cm:+k.alto_cm,peso_bruto_kg:k.peso_bruto!=null?+k.peso_bruto:null}))}
    const cbmM=(+m.cbm||0)*it.cant,difPack=(m.piezas_por_caja!=null&&+m.piezas_por_caja!==p)||(m.cajas_por_unidad!=null&&+m.cajas_por_unidad!==c);
    const dev=completo&&cbmO>0?(cbmM-cbmO)/cbmO:null;
    if((dev!=null&&Math.abs(dev)>.08)||difPack)out.push({m,cant:it.cant,uds,cbmO:completo?cbmO:null,cbmM,dev,p,c,pack,difPack,cbmPieza:completo&&uds?cbmO/uds:null})}
  return out}
function v3Html(pe,r){const L=v3Orden(pe,r);if(!L.length)return '';
  return `<div class="card pad ibad" style="margin-bottom:12px"><b>El packing de la orden no coincide con el Maestro</b><p class="hint">La orden manda: es lo que el proveedor va a mandar. Si actualizás, cambia el m³ por pieza del Maestro y con eso el flete prorrateado de <b>todos</b> los productos del pedido.</p>
   <div class="wrap"><table><thead><tr><th>Producto</th><th class="n">Unidades</th><th>Packing Maestro → orden</th><th class="n">m³ total Maestro</th><th class="n">m³ total orden</th><th class="n">Desvío</th><th></th></tr></thead><tbody>
   ${L.map((x,i)=>`<tr><td><b>${esc(x.m.descripcion)}</b><div class="hint">${esc(x.m.codigo)}</div></td><td class="n">${x.cant}</td><td>${esc(packTxt(x.m)||'sin cargar')} → <b>${esc(packTxt({piezas_por_caja:x.p,cajas_por_unidad:x.c}))}</b></td><td class="n">${eN(x.cbmM,2)}</td><td class="n">${x.cbmO!=null?eN(x.cbmO,2):'<span class="hint">faltan medidas de caja</span>'}</td><td class="n ${x.dev!=null&&x.dev<0?'neg':''}">${x.dev!=null?(x.dev>0?'+':'')+Math.round(x.dev*100)+'%':'—'}</td>
    <td><button class="btn" data-v3="${i}">Actualizar el Maestro${x.cbmPieza?` (${x.cbmPieza.toFixed(3)} m³/pieza)`:''}</button></td></tr>`).join('')}</tbody></table></div></div>`}
function bindV3(pe,r){const L=v3Orden(pe,r);
  $('#m').querySelectorAll('[data-v3]').forEach(b=>b.onclick=async()=>{const x=L[+b.dataset.v3];
    const msg=`${x.m.codigo}\n\nPacking: ${packTxt(x.m)||'sin cargar'} → ${packTxt({piezas_por_caja:x.p,cajas_por_unidad:x.c})}\nm³ por pieza: ${x.m.cbm} → ${x.cbmPieza?x.cbmPieza.toFixed(3):'(sin cambio, faltan medidas)'}\n\nQueda en el historial como "OC ${pe.nombre}". ¿Actualizo el Maestro?`;
    if(!confirm(msg))return;
    const cbm=x.cbmPieza?Math.round(x.cbmPieza*1000)/1000:null;
    const {error}=await sb.rpc('master_packing_desde_orden',{p_codigo:x.m.codigo,p_origen:'OC '+pe.nombre,p_piezas:x.p,p_cajas:x.c,p_pack:x.pack||x.m.cajas_pack||null,p_cbm:cbm});
    if(error)return toast('No se pudo: '+error.message);
    Object.assign(x.m,{piezas_por_caja:x.p,cajas_por_unidad:x.c,cajas_pack:x.pack||x.m.cajas_pack},cbm!=null?{cbm}:{});toast('Maestro actualizado · el contenedor se recalculó');drawEcoPedido()})}
