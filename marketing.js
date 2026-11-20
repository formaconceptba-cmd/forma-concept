/* ---------- Anuncios por campaña (bloque E) y Clientes (bloque F) ----------
   Usa ventasRent() de admin.html: cada venta trae tk (seguimiento del clic), em (mail), its (productos), g, venta, cprod, com, env. */
let MKP=30;
const ATRIB_DIAS=7;
/* atribución: último clic, ventana de 7 días */
function atribucion(v){
  const t=v.tk;if(!t)return {plat:v.canal==='may'?'Mayorista (directo)':'Sin datos',camp:'Directo / orgánico',conj:'—',anun:'—'};
  const vieja=t.clic_ts&&(new Date(v.f)-t.clic_ts)>ATRIB_DIAS*DIA,u=vieja?{}:(t.utm||{});
  const plat=vieja?'Directo / orgánico':u.source?u.source:t.fbc?'Meta':t.gclid?'Google':t.ttclid?'TikTok':t.referrer?(()=>{try{return new URL(t.referrer).hostname.replace(/^www\./,'')}catch(e){return 'Referido'}})():'Directo / orgánico';
  return {plat,camp:u.campaign||(vieja?'Directo / orgánico':t.fbc?'Meta (sin utm)':t.gclid?'Google (sin utm)':t.ttclid?'TikTok (sin utm)':plat),conj:u.term||'—',anun:u.content||'—'};
}
/* la cuenta que importa, por pedido (brief): venta neta − costo puesto − comisión sin IVA − envío */
const margenNeto=v=>v.venta-v.cprod-v.com/1.21-v.env;

async function drawCampanias(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';
  const [V,{data:G}]=await Promise.all([ventasRent(),sb.from('ads_campania').select('*').order('fecha',{ascending:false})]);
  if(tab!=='campanias')return;
  const from=MKP?Date.now()-MKP*DIA:0,inP=d=>+new Date(d)>=from;
  const VV=V.filter(v=>inP(v.f)&&v.canal!=='may'),GG=(G||[]).filter(g=>inP(g.fecha+'T12:00'));
  /* árbol campaña → conjunto → anuncio */
  const T={};const nodo=(o,k)=>o[k]||(o[k]={k,gasto:0,n:0,neta:0,mn:0,hijos:{}});
  VV.forEach(v=>{const a=atribucion(v),c=nodo(T,a.camp),s=nodo(c.hijos,a.conj),d=nodo(s.hijos,a.anun);[c,s,d].forEach(x=>{x.n++;x.neta+=v.venta;x.mn+=margenNeto(v)})});
  GG.forEach(g=>{const c=nodo(T,g.campania),s=nodo(c.hijos,g.conjunto||'—'),d=nodo(s.hijos,g.anuncio||'—');[c,s,d].forEach(x=>x.gasto+=+g.gasto)});
  const met=x=>({rb:x.gasto?x.neta/x.gasto:null,rn:x.gasto?x.mn/x.gasto:null,res:x.mn-x.gasto,cpa:x.gasto&&x.n?x.gasto/x.n:null});
  const ord=o=>Object.values(o).sort((a,b)=>met(b).res-met(a).res);
  const tot=Object.values(T).reduce((a,x)=>({gasto:a.gasto+x.gasto,n:a.n+x.n,neta:a.neta+x.neta,mn:a.mn+x.mn}),{gasto:0,n:0,neta:0,mn:0});
  const fila=(x,niv,id)=>{const m=met(x),trampa=m.rb!=null&&m.rb>=1&&m.res<0,h=Object.keys(x.hijos).length&&niv<2;
    return `<tr class="mk${niv}" ${niv?`data-par="${id.split('|').slice(0,niv).join('|')}" hidden`:''}${trampa?' style="background:rgba(227,73,72,.08)"':''}><td style="padding-left:${10+niv*20}px">${h?`<button class="lnk" data-tg="${esc(id)}">▸</button> `:''}<b>${esc(x.k)}</b>${trampa?'<div class="hint neg">ROAS positivo pero pierde plata</div>':''}</td>
    <td class="n">${ars(x.gasto)}</td><td class="n">${x.n}</td><td class="n">${ars(x.neta)}</td><td class="n">${ars(x.mn)}</td><td class="n">${m.rb==null?'—':m.rb.toFixed(2).replace('.',',')}</td><td class="n">${m.rn==null?'—':m.rn.toFixed(2).replace('.',',')}</td><td class="n"><b class="${m.res<0?'neg':'pos'}">${m.res<0?'− '+ars(-m.res):ars(m.res)}</b></td><td class="n">${m.cpa==null?'—':ars(m.cpa)}</td></tr>`
    +(h?ord(x.hijos).map(y=>fila(y,niv+1,id+'|'+y.k)).join(''):'')};
  const camps=[...new Set([...(G||[]).map(g=>g.campania),...V.map(v=>atribucion(v).camp)])];
  const mt=met(tot);
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Anuncios por campaña</b><span class="sp"></span>${[[7,'7 días'],[30,'30 días'],[90,'90 días'],[0,'Todo']].map(([d,l])=>`<button class="btn ${MKP===d?'dk':''}" data-mkp="${d}">${l}</button>`).join('')}</div>
  <div class="kps">${[['Gasto',ars(tot.gasto)],['Pedidos atribuidos',tot.n],['Venta neta (sin IVA)',ars(tot.neta)],['Margen neto',ars(tot.mn)],['ROAS bruto / neto',mt.rb==null?'—':`${mt.rb.toFixed(2).replace('.',',')} / ${mt.rn.toFixed(2).replace('.',',')}`],['Resultado',`<span class="${mt.res<0?'neg':'pos'}">${mt.res<0?'− '+ars(-mt.res):ars(mt.res)}</span>`]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
  <div class="card wrap"><table><thead><tr><th>Campaña → conjunto → anuncio</th><th class="n">Gasto</th><th class="n">Pedidos</th><th class="n">Venta neta</th><th class="n">Margen neto</th><th class="n">ROAS bruto</th><th class="n">ROAS neto</th><th class="n">Resultado</th><th class="n">Costo por venta</th></tr></thead><tbody>
  ${ord(T).map(x=>fila(x,0,x.k)).join('')||'<tr><td colspan="9" class="hint">Todavía no hay ventas ni gasto cargado en este período.</td></tr>'}</tbody></table></div>
  <p class="hint" style="max-width:860px"><b>El que decide es el Resultado, no el ROAS.</b> Resultado = margen neto − gasto. Margen neto = venta sin IVA − costo puesto en Argentina − comisión de Mercado Pago sin IVA − envío. En rojo, campañas con ROAS bruto de 1 o más que igual pierden plata: es la trampa más común.<br>
  Atribución: <b>último clic, ventana de ${ATRIB_DIAS} días</b>. Meta siempre muestra más ventas porque cuenta 7 días clic + 1 día vista: no se comparan directo. Las reservas mayoristas no entran.</p>
  <div class="g2d" style="align-items:start"><div class="card pad"><h4>Cargar gasto</h4><p class="hint">Mientras no conectemos la API de Meta, cargalo a mano (por campaña y día, o el total de la semana en un día). Son cinco minutos por semana.</p>
   <div style="display:grid;gap:8px"><input type="date" id="g_f" value="${new Date().toISOString().slice(0,10)}"><input id="g_c" list="g_cl" placeholder="Campaña (igual que en Meta)"><datalist id="g_cl">${camps.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
   <input id="g_s" placeholder="Conjunto de anuncios (opcional)"><input id="g_a" placeholder="Anuncio (opcional)"><input id="g_m" class="num" placeholder="Gasto en pesos" inputmode="numeric"><button class="btn dk" id="g_ok">Agregar gasto</button></div>
   ${(G||[]).length?`<div class="wrap" style="max-height:240px;overflow:auto;margin-top:10px"><table><tbody>${G.slice(0,50).map(g=>`<tr><td class="hint">${new Date(g.fecha+'T12:00').toLocaleDateString('es-AR')}</td><td>${esc(g.campania)}${g.conjunto?` · ${esc(g.conjunto)}`:''}${g.anuncio?` · ${esc(g.anuncio)}`:''}</td><td class="n">${ars(g.gasto)}</td><td><button class="btn" data-gx="${g.id}">×</button></td></tr>`).join('')}</tbody></table></div>`:''}</div>
   <div class="card pad"><h4>Para que cada venta sepa de qué anuncio vino</h4><p class="hint">En cada anuncio de Meta, en "Parámetros de URL", pegá esto tal cual:</p><code style="display:block;padding:10px;background:var(--box);font-size:12px;word-break:break-all;user-select:all">utm_source=meta&amp;utm_medium=paid&amp;utm_campaign={{campaign.name}}&amp;utm_term={{adset.name}}&amp;utm_content={{ad.name}}</code><p class="hint">Así la campaña, el conjunto y el anuncio llegan solos con cada venta. Si falta, igual se reconoce que vino de Meta por el clic, pero sin saber de qué campaña.</p></div></div>`;
  $('#m').querySelectorAll('[data-mkp]').forEach(b=>b.onclick=()=>{MKP=+b.dataset.mkp;drawCampanias()});
  $('#m').querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>{const id=b.dataset.tg,abrir=b.textContent==='▸';b.textContent=abrir?'▾':'▸';$('#m').querySelectorAll('tr[data-par]').forEach(tr=>{const p=tr.dataset.par;if(abrir?p===id:p.startsWith(id))tr.hidden=!abrir;if(!abrir){const t=tr.querySelector('[data-tg]');if(t)t.textContent='▸'}})});
  $('#g_ok').onclick=async()=>{const c=$('#g_c').value.trim(),m=+$('#g_m').value.replace(/\D/g,'');if(!c||!m)return toast('Poné la campaña y el gasto');const {error}=await sb.from('ads_campania').insert({fecha:$('#g_f').value,campania:c,conjunto:$('#g_s').value.trim()||null,anuncio:$('#g_a').value.trim()||null,gasto:m});toast(error?'No se pudo guardar':'Gasto cargado');if(!error)drawCampanias()};
  $('#m').querySelectorAll('[data-gx]').forEach(b=>b.onclick=async()=>{const {error}=await sb.from('ads_campania').delete().eq('id',+b.dataset.gx);if(!error)drawCampanias()});
}

/* ---------- Clientes ---------- */
let CLSORT='mn';
async function drawClientes(){
  $('#m').innerHTML='<p class="hint">Cargando…</p>';
  const V=await ventasRent();if(tab!=='clientes')return;
  const C={};[...V].sort((a,b)=>a.f.localeCompare(b.f)).forEach(v=>{const k=v.em||('sin-mail-'+v.id);const c=C[k]||(C[k]={em:v.em,nombre:v.cli,tel:v.tel,tipo:v.canal,primera:v.f,ultima:v.f,ped:[],u:0,neta:0,mn:0,g:0,canal:'',camp:''});
    if(!c.ped.length){const a=atribucion(v);c.canal=a.plat;c.camp=a.camp}c.ped.push(v);c.ultima=v.f;c.u+=v.its.reduce((s,i)=>s+i.q,0);c.neta+=v.venta;c.mn+=margenNeto(v);c.g+=v.g;if(v.canal!=='pub')c.tipo=v.canal});
  const L=Object.values(C),now=Date.now();
  const S=[...L].sort((a,b)=>CLSORT==='mn'?b.mn-a.mn:CLSORT==='ped'?b.ped.length-a.ped.length:b.ultima.localeCompare(a.ultima));
  /* cohortes: % que volvió a comprar a 30/90/180 días de la primera compra */
  const coh={};L.forEach(c=>{const m=c.primera.slice(0,7),x=coh[m]||(coh[m]={n:0,v:{30:0,90:0,180:0},base:{30:0,90:0,180:0}});x.n++;[30,90,180].forEach(d=>{const lim=+new Date(c.primera)+d*DIA;if(lim<=now){x.base[d]++;if(c.ped.slice(1).some(p=>+new Date(p.f)<=lim))x.v[d]++}})});
  /* LTV por canal de adquisición */
  const ltv={};L.forEach(c=>{const x=ltv[c.canal]||(ltv[c.canal]={n:0,mn:0,neta:0,rep:0});x.n++;x.mn+=c.mn;x.neta+=c.neta;if(c.ped.length>1)x.rep++});
  /* qué se compra junto */
  const par={};V.forEach(v=>{const ids=[...new Set(v.its.map(i=>i.id))].sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const k=ids[i]+'|'+ids[j];par[k]=(par[k]||0)+1}});
  const nom=id=>{const p=prods.find(x=>x.id===id);return p?p.tipo+' '+p.nombre:id};
  const pares=Object.entries(par).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const rep=L.filter(c=>c.ped.length>1).length;
  $('#m').innerHTML=`<div class="bar"><b style="font:500 20px Outfit,sans-serif">Clientes</b><span class="sp"></span><label style="margin:0">Ordenar por</label><select id="clsort">${[['mn','Margen neto acumulado'],['ped','Cantidad de pedidos'],['ult','Última compra']].map(([k,l])=>`<option value="${k}" ${CLSORT===k?'selected':''}>${l}</option>`).join('')}</select></div>
  <div class="kps">${[['Clientes',L.length],['Volvieron a comprar',`${rep} · ${pct(L.length?rep/L.length:0)}`],['Margen neto por cliente',ars(L.length?L.reduce((a,c)=>a+c.mn,0)/L.length:0)],['Pedidos por cliente',(L.length?V.length/L.length:0).toFixed(2).replace('.',',')]].map(([t,v])=>`<div class="card kp"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
  <div class="card wrap" style="margin-bottom:14px"><table><thead><tr><th>Cliente</th><th>Tipo</th><th class="n">Pedidos</th><th class="n">Unidades</th><th class="n">Venta neta</th><th class="n">Margen neto</th><th>Primera / última</th><th class="hide-m">Llegó por</th></tr></thead><tbody>
  ${S.slice(0,200).map(c=>`<tr><td><b>${esc(c.nombre||'—')}</b><div class="hint">${esc(c.em||'sin mail')}</div></td><td>${CANAL[c.tipo]||c.tipo}</td><td class="n">${c.ped.length}</td><td class="n">${c.u}</td><td class="n">${ars(c.neta)}</td><td class="n"><b class="${c.mn<0?'neg':''}">${ars(c.mn)}</b></td><td class="hint">${new Date(c.primera).toLocaleDateString('es-AR')}${c.ped.length>1?' · '+new Date(c.ultima).toLocaleDateString('es-AR'):''}</td><td class="hide-m hint">${esc(c.canal)}${c.camp&&c.camp!==c.canal?' · '+esc(c.camp):''}</td></tr>`).join('')||'<tr><td colspan="8" class="hint">Todavía no hay clientes con compras.</td></tr>'}</tbody></table></div>
  <div class="g3d">
   <div class="card pad"><h4>Cohortes: ¿vuelven a comprar?</h4><div class="wrap"><table><thead><tr><th>Primera compra</th><th class="n">Clientes</th><th class="n">30 días</th><th class="n">90 días</th><th class="n">180 días</th></tr></thead><tbody>${Object.entries(coh).sort().reverse().map(([m,x])=>`<tr><td>${m.slice(5)}/${m.slice(0,4)}</td><td class="n">${x.n}</td>${[30,90,180].map(d=>`<td class="n">${x.base[d]?pct(x.v[d]/x.base[d]):'<span class="hint">—</span>'}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="5" class="hint">Sin datos todavía.</td></tr>'}</tbody></table></div><p class="hint">"—" es que todavía no pasó ese tiempo desde la primera compra.</p></div>
   <div class="card pad"><h4>Cuánto deja un cliente según de dónde vino</h4>${Object.entries(ltv).sort((a,b)=>b[1].mn/b[1].n-a[1].mn/a[1].n).map(([k,x])=>`<div class="ibar"><span>${esc(k)}</span><b>${ars(x.mn/x.n)}</b><small>${x.n} cliente${x.n>1?'s':''} · ${pct(x.rep/x.n)} volvió a comprar</small></div>`).join('')||'<p class="hint">Sin datos todavía.</p>'}<p class="hint">Margen neto acumulado promedio por cliente. Es lo máximo que conviene pagar en anuncios para conseguir uno.</p></div>
   <div class="card pad"><h4>Qué se compra junto</h4>${pares.map(([k,n])=>{const [a,b]=k.split('|');return `<div class="rw" style="gap:8px"><span>${esc(nom(a))} + ${esc(nom(b))}</span><b>${n}</b></div>`}).join('')||'<p class="hint">Cuando haya pedidos con más de un producto, aparecen acá los pares. Sirve para armar combos y decidir el próximo pedido.</p>'}</div></div>`;
  $('#clsort').onchange=e=>{CLSORT=e.target.value;drawClientes()};
}
