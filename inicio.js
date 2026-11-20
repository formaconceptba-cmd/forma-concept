/* ---------- Inicio: todo el negocio en vivo, en un solo lugar ----------
   Ventas, ganancia neta, márgenes, anuncios, medios de pago, productos, precios y contenedores.
   Se actualiza solo cada 30 segundos. Usa ventasRent() y drawResultados() de admin.html y ecoCalc() de eco-ui.js. */
let INI_T=null, INI_DET=false, INI_AT=0;
const C_V='#2a78d6', C_G='#1baf7a', C_CH=['#2a78d6','#eb6834','#1baf7a'];
const kM=n=>{const a=Math.abs(n),s=n<0?'−':'';return a>=1e6?s+'$'+(a/1e6).toFixed(a>=1e7?0:1).replace('.',',')+' M':a>=1e3?s+'$'+Math.round(a/1e3)+' mil':s+'$'+Math.round(a)};
const hace=d=>{const s=Math.round((Date.now()-new Date(d))/1000);return s<60?'recién':s<3600?`hace ${Math.round(s/60)} min`:s<86400?`hace ${Math.round(s/3600)} h`:`hace ${Math.round(s/86400)} d`};
const medioGrupo=v=>v.mp==='transferencia'?'Transferencia':v.mp==='credit_card'?(v.cuotas>1?`Tarjeta en ${v.cuotas} cuotas`:'Tarjeta, 1 pago'):v.mp==='debit_card'?'Débito':v.mp==='account_money'?'Dinero en cuenta MP':v.mp==='ticket'?'Efectivo':v.mp?v.medio:'Mercado Pago (sin dato)';

function spark(vals,color){if(vals.length<2)return '';const W=120,H=28,mx=Math.max(...vals),mn=Math.min(0,...vals),r=mx-mn||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*W).toFixed(1)},${(H-2-(v-mn)/r*(H-4)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-hidden="true" style="display:block;margin-top:6px"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`}

/* ventas sin IVA (barras) y ganancia de cada día (línea), con marcas de cambios de precio */
function chartDias(D){
  const W=760,H=230,L=58,R=10,T=16,B=26,iw=W-L-R,ih=H-T-B,n=D.length,bw=iw/n;
  const mx=Math.max(10000,...D.map(d=>Math.max(d.v,d.g))),mn=Math.min(0,...D.map(d=>d.g)),rg=mx-mn,y=v=>T+(mx-v)/rg*ih,y0=y(0);
  const tk=[mn,0,mx/2,mx].filter((v,i,a)=>a.indexOf(v)===i&&(v===0||Math.abs(v)>rg*0.08));
  const step=Math.max(1,Math.ceil(n/8));
  return `<div class="ich" style="position:relative"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Ventas y ganancia por día">
   ${tk.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="${v===0?'#bdbab3':'#ebe9e4'}" stroke-width="1"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#77756F">${kM(v)}</text>`).join('')}
   ${D.map((d,i)=>{const x=L+i*bw+bw*0.18,w=Math.max(2,bw*0.64),h=Math.max(0,y0-y(d.v));return h>0.5?`<path d="M${x},${y0}V${y0-h+Math.min(4,h)}q0,-${Math.min(4,h)} ${Math.min(4,w/2)},-${Math.min(4,h)}H${x+w-Math.min(4,w/2)}q${Math.min(4,w/2)},0 ${Math.min(4,w/2)},${Math.min(4,h)}V${y0}Z" fill="${C_V}" opacity="${d.hoy?1:.85}"/>`:''}).join('')}
   <polyline points="${D.map((d,i)=>`${L+i*bw+bw/2},${y(d.g)}`).join(' ')}" fill="none" stroke="${C_G}" stroke-width="2" stroke-linejoin="round"/>
   ${D.map((d,i)=>d.g?`<circle cx="${L+i*bw+bw/2}" cy="${y(d.g)}" r="4" fill="${C_G}" stroke="#fff" stroke-width="2"/>`:'').join('')}
   ${D.map((d,i)=>d.pc?`<path d="M${L+i*bw+bw/2-5},${T-12}h10l-5,7z" fill="#141414"/>`:'').join('')}
   ${D.map((d,i)=>i%step===0||i===n-1?`<text x="${L+i*bw+bw/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="#77756F">${d.l}</text>`:'').join('')}
   ${D.map((d,i)=>`<rect x="${L+i*bw}" y="${T-14}" width="${bw}" height="${ih+14}" fill="transparent" data-tip="${esc(`<b>${d.l}</b><br>Vendido sin IVA: ${ars(d.v)}<br>Ganancia de las ventas: ${ars(d.g)}<br>${d.n} venta${d.n===1?'':'s'}${d.pc?`<br>▼ ${d.pc} cambio${d.pc>1?'s':''} de precio`:''}`)}"/>`).join('')}
  </svg><div class="itip" hidden></div></div>
  <div class="ileg"><span><i style="background:${C_V}"></i>Vendido sin IVA</span><span><i style="background:${C_G};height:3px"></i>Ganancia de las ventas</span><span><i style="background:#141414;clip-path:polygon(0 0,100% 0,50% 100%)"></i>Cambio de precio</span></div>`;
}

async function drawInicio(silencioso){
  clearTimeout(INI_T);
  if(!silencioso)$('#m').innerHTML='<p class="hint">Cargando…</p>';
  const now=Date.now(),hoy0=new Date();hoy0.setHours(0,0,0,0);
  const from=PER===1?hoy0:PER?new Date(now-PER*DIA):new Date(0),largo=now-from,prev=PER?new Date(+from-largo):null;
  const [V,{data:ev},{data:pend},{data:hi},{data:pca},{data:st}]=await Promise.all([ventasRent(),
    sb.from('eventos').select('created_at,visitante,sesion,tipo,producto,ref,utm,dispositivo,valor').gte('created_at',(prev||from).toISOString()).order('created_at',{ascending:false}).limit(20000),
    sb.from('orders').select('*,order_items(*,products(tipo,nombre))').eq('estado','pendiente').order('created_at',{ascending:false}).limit(60),
    sb.from('precio_historial').select('*').order('fecha',{ascending:false}).limit(200),sb.rpc('precios_admin'),sb.from('settings').select('*')]);
  if(tab!=='inicio')return;
  ST=Object.fromEntries((st||[]).map(x=>[x.key,+x.value]));
  const T=TX(),PB=Object.fromEntries(prods.map(p=>[p.id,p])),PCA=Object.fromEntries((pca||[]).map(x=>[x.id,x])),nom=id=>PB[id]?PB[id].tipo+' '+PB[id].nombre:id;
  const inP=d=>new Date(d)>=from,inPrev=d=>prev&&new Date(d)>=prev&&new Date(d)<from;
  const cur=V.filter(v=>inP(v.f)),old=V.filter(v=>inPrev(v.f));
  const ini0=PER?+from:Math.min(now-DIA,V.reduce((m,v)=>Math.min(m,+new Date(v.f)),now),(ev||[]).reduce((m,x)=>Math.min(m,+new Date(x.created_at)),now)),dias=Math.max(1,(now-ini0)/DIA),S=(a,k)=>a.reduce((s,v)=>s+v[k],0);
  const res=a=>{const venta=S(a,'venta'),g=S(a,'g'),ads=T.ADS*dias/30,fij=T.FIJ*dias/30,antes=g-ads-fij,gan=Math.max(0,antes)*T.GAN;return {total:S(a,'total'),venta,g,ads,fij,antes,gan,neto:antes-gan,n:a.length}};
  const R=res(cur),RP=res(old);
  const E=(ev||[]).filter(x=>inP(x.created_at)),EP=(ev||[]).filter(x=>inPrev(x.created_at));
  const uv=(a,t)=>new Set(a.filter(x=>!t||x.tipo===t).map(x=>x.visitante)).size;
  const vis=uv(E,'visita')||uv(E),visP=uv(EP,'visita')||uv(EP),live=new Set((ev||[]).filter(x=>now-new Date(x.created_at)<5*6e4).map(x=>x.visitante)).size;
  /* series por día */
  const nd=PER===1?14:PER||Math.min(90,Math.max(14,Math.ceil((now-Math.min(now,...V.map(v=>+new Date(v.f))))/DIA)+1));
  const key=d=>new Date(d).toDateString();
  const D=[...Array(nd)].map((_,i)=>{const d=new Date(hoy0-(nd-1-i)*DIA),k=d.toDateString(),x=V.filter(v=>key(v.f)===k);
    return {l:fmtD(d),hoy:i===nd-1,v:S(x,'venta'),g:S(x,'g'),n:x.length,t:S(x,'total'),u:new Set((ev||[]).filter(e=>key(e.created_at)===k).map(e=>e.visitante)).size,pc:(hi||[]).filter(h=>key(h.fecha)===k).length}});
  /* de cada $100 que cobrás */
  const cob=R.total,P100=[['IVA (va a ARCA)',cob-R.venta],['Costo de los productos',S(cur,'cprod')],['Comisión de Mercado Pago',S(cur,'com')],['Envíos que pagás vos',S(cur,'env')],['Ingresos Brutos e impuesto al cheque',S(cur,'iibb')+S(cur,'chq')],['Anuncios',R.ads],['Gastos fijos',R.fij],['Impuesto a las Ganancias (estimado)',R.gan]];
  /* canales, medios de pago, productos */
  const grp=(f)=>{const m={};cur.forEach(v=>{const k=f(v);const x=m[k]||(m[k]={k,n:0,t:0,ve:0,g:0,com:0});x.n++;x.t+=v.total;x.ve+=v.venta;x.g+=v.g;x.com+=v.com});return Object.values(m).sort((a,b)=>b.t-a.t)};
  const CAN=['pub','pro','may'].map(c=>{const x=cur.filter(v=>v.canal===c);return {c,n:x.length,ve:S(x,'venta'),g:S(x,'g')}});
  const MED=grp(medioGrupo);
  const PR={};cur.forEach(v=>{const tot=v.its.reduce((s,i)=>s+(i.p||0)*i.q,0)||1;v.its.forEach(i=>{const x=PR[i.id]||(PR[i.id]={id:i.id,u:0,t:0,g:0,ls:0,lq:0});x.u+=i.q;x.t+=(i.p||0)*i.q;x.g+=v.g*((i.p||0)*i.q/tot);if(i.l){x.ls+=i.l*i.q;x.lq+=i.q}})});
  const PRL=Object.values(PR).sort((a,b)=>b.g-a.g);
  const vistas=id=>E.filter(x=>x.tipo==='vista_producto'&&x.producto===id).length;
  /* contenedores: proyectado contra real */
  let CONT=[];try{CONT=(ECO.ped||[]).map(pe=>{const r=ecoCalc(pe),cods=new Set(r.items.map(i=>i.codigo)),desde=new Date(pe.created_at);
    const vs=V.filter(v=>new Date(v.f)>=desde);let u=0,vt=0,gg=0,f1=null;vs.forEach(v=>{const tot=v.its.reduce((s,i)=>s+(i.p||0)*i.q,0)||1;v.its.forEach(i=>{if(!cods.has(i.id))return;u+=i.q;vt+=(i.p||0)*i.q;gg+=v.g*((i.p||0)*i.q/tot);if(!f1||new Date(v.f)<f1)f1=new Date(v.f)})});
    const vU=vt/(1+T.IVA)/ST.tc,gU=gg/ST.tc,dd=f1?Math.max(1,(now-f1)/DIA):0,mesesRit=u&&dd?(r.unidades/u)*dd/30.42:null;
    const precioLista=r.items.reduce((s,i)=>s+i.precioARSef*i.cant,0)/(r.unidades||1),precioReal=u?vt/u:null;
    return {pe,r,u,vU,gU,mesesRit,precioLista,precioReal}})}catch(e){CONT=[]}
  /* actividad en vivo */
  const TIPO={visita:'entró a la tienda',vista_producto:'miró',agregar_carrito:'agregó al carrito',inicio_checkout:'empezó a pagar',compra:'compró',compra_transferencia:'pidió pagar con transferencia'};
  const feed=[...V.slice(0,10).map(v=>({f:v.f,h:`<b>${esc(v.cli||'Alguien')}</b> compró ${ars(v.total)} · ${esc(medioGrupo(v))}`,k:'$'})),...(ev||[]).slice(0,40).filter(x=>TIPO[x.tipo]).map(x=>({f:x.created_at,h:`Un visitante ${TIPO[x.tipo]}${x.producto?' <b>'+esc(nom(x.producto))+'</b>':''}${x.dispositivo?` · <span class="hint">${esc(x.dispositivo)}</span>`:''}${x.utm||x.ref?` · <span class="hint">${esc(x.utm||x.ref)}</span>`:''}`,k:x.tipo==='compra'?'$':'·'}))].sort((a,b)=>new Date(b.f)-new Date(a.f)).slice(0,14);
  const F=[['Visitaron',uv(E)],['Vieron un producto',uv(E,'vista_producto')],['Agregaron al carrito',uv(E,'agregar_carrito')],['Empezaron a pagar',uv(E,'inicio_checkout')],['Compraron',Math.max(uv(E,'compra'),cur.filter(v=>v.canal!=='may').length)]];
  const firstHits=Object.values(Object.fromEntries(E.filter(x=>x.tipo==='visita').map(x=>[x.sesion,x])));
  const cnt=(a,f)=>{const m={};a.forEach(x=>{const k=f(x)||'Directo';m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6)};
  const fuentes=cnt(firstHits,x=>x.utm||x.ref);
  const aband=(pend||[]).filter(x=>now-new Date(x.created_at)>30*6e4&&inP(x.created_at)),transfPend=(pend||[]).filter(x=>x.medio_pago==='transferencia');
  const dl=(a,b,inv)=>PER&&b?(()=>{const up=a>=b,good=inv?!up:up;return `<em class="${good?'pos':'neg'}">${up?'▲':'▼'} ${Math.abs(Math.round((a-b)/Math.abs(b)*100))}%</em>`})():'';
  const mrg=R.venta?R.neto/R.venta:null,roas=R.ads?R.total/R.ads:null,cac=R.ads&&R.n?R.ads/R.n:null;
  const K=(t,v,s,sp)=>`<div class="card ik"><span>${t}</span><b>${v}</b><small>${s||'&nbsp;'}</small>${sp||''}</div>`;
  const per=PER===1?'hoy':PER?`últimos ${PER} días`:'desde el inicio';
  INI_AT=now;
  $('#m').innerHTML=`<div class="bar ihd"><b style="font:500 22px Outfit,sans-serif">Así va el negocio</b><span class="live"><i></i>En vivo · ${live} ${live===1?'persona':'personas'} en la tienda</span><span class="hint" id="iupd">actualizado recién</span><span class="sp"></span>
   ${[[1,'Hoy'],[7,'7 días'],[30,'30 días'],[0,'Todo']].map(([d,l])=>`<button class="btn ${PER===d?'dk':''}" data-per="${d}">${l}</button>`).join('')}</div>
  ${transfPend.length?`<div class="card pad iwarn"><b>${transfPend.length} pedido${transfPend.length>1?'s':''} esperando transferencia</b> · ${transfPend.map(o=>`#${o.id} ${esc(o.nombre||'')} ${ars(o.total)} (${hace(o.created_at)})`).join(' · ')}. Cuando veas la plata, marcalo <b>Pagado</b> en <a href="#pedidos">Pedidos</a>.</div>`:''}
  <div class="iks">
   ${K('Ventas',ars(R.total),`${dl(R.total,RP.total)} ${per}`,spark(D.map(d=>d.t),C_V))}
   ${K('Te queda limpio',`<span class="${R.neto<0?'neg':''}">${R.neto<0?'− '+ars(-R.neto):ars(R.neto)}</span>`,`${dl(R.neto,RP.neto)} después de todo`,spark(D.map(d=>d.g),C_G))}
   ${K('Margen neto',mrg==null?'—':`<span class="${mrg<0.1?'neg':'pos'}">${pct(mrg)}</span>`,'de cada $100 sin IVA')}
   ${K('Pedidos',R.n,`${dl(R.n,RP.n)} ticket ${ars(R.n?R.total/R.n:0)}`,spark(D.map(d=>d.n),C_V))}
   ${K('Anuncios',ars(R.ads),roas&&R.n?`ROAS ${roas.toFixed(1).replace('.',',')}× · ${ars(cac)} por venta`:R.ads?'sin ventas todavía para medir el ROAS':'cargá el gasto abajo, en "Tus números"')}
   ${K('Visitantes',vis,`${dl(vis,visP)} conversión ${vis?(R.n/vis*100).toFixed(1).replace('.',','):'0'}%`,spark(D.map(d=>d.u),'#77756F'))}
  </div>
  <div class="g2d" style="align-items:start"><div class="card pad"><h4>Ventas y ganancia por día</h4>${chartDias(D)}</div>
   <div class="card pad"><h4>De cada $100 que cobrás <small class="hint">— ${per}</small></h4>${cob?P100.map(([t,v])=>`<div class="i100"><span>${t}</span><div><i style="width:${Math.min(100,v/cob*100)}%"></i></div><b>$${(v/cob*100).toFixed(1).replace('.',',')}</b></div>`).join('')+`<div class="i100 ok"><span><b>Te queda limpio</b></span><div><i style="width:${Math.max(0,Math.min(100,R.neto/cob*100))}%"></i></div><b class="${R.neto<0?'neg':''}">$${(R.neto/cob*100).toFixed(1).replace('.',',')}</b></div>`:'<p class="hint">Cuando haya ventas en este período vas a ver acá en qué se va cada peso: IVA, costo, comisiones, impuestos, anuncios y lo que te queda.</p>'}</div></div>
  <div class="g3d">
   <div class="card pad"><h4>Quién compra</h4>${CAN.map((c,i)=>`<div class="ibar"><span><i style="background:${C_CH[i]}"></i>${CANAL[c.c]}</span><b>${ars(c.ve)}</b><small>${c.n} · ${c.ve?'margen '+pct(c.g/c.ve):'sin ventas'}</small></div>`).join('')}<p class="hint">Sin IVA. Margen antes de anuncios y gastos fijos.</p></div>
   <div class="card pad"><h4>Cómo pagan</h4>${MED.length?MED.map(m=>`<div class="ibar"><span>${esc(m.k)}</span><b>${ars(m.t)}</b><small>${m.n} · comisión ${m.t?pct(m.com/m.t):'—'}</small></div>`).join(''):'<p class="hint">Todavía no hay ventas en este período.</p>'}<p class="hint">La comisión es la real que informa Mercado Pago. Transferencia no paga.</p></div>
   <div class="card pad"><h4>Actividad en vivo</h4><div class="ifeed">${feed.map(x=>`<div><em>${x.k==='$'?'●':'·'}</em><span>${x.h}</span><small>${hace(x.f)}</small></div>`).join('')||'<p class="hint">Sin movimiento todavía.</p>'}</div></div></div>
  <div class="card pad" style="margin-bottom:14px"><h4>Productos <small class="hint">— ${per}: qué se vende, a qué precio y cuánto deja</small></h4><div class="wrap"><table><thead><tr><th>Producto</th><th class="n">Vistas</th><th class="n">Vendidas</th><th class="n">Vendido</th><th class="n">Precio promedio cobrado</th><th class="n">Precio público hoy</th><th class="n">Ganancia</th><th class="n">Margen</th></tr></thead><tbody>
   ${(PRL.length?PRL:prods.filter(p=>p.activo).map(p=>({id:p.id,u:0,t:0,g:0,lq:0}))).slice(0,14).map(x=>{const p=PCA[x.id],avg=x.u?x.t/x.u:null,ve=x.t/(1+T.IVA);return `<tr><td><b>${esc(nom(x.id))}</b>${x.lq?`<div class="hint">lista al vender ${ars(x.ls/x.lq)}</div>`:''}</td><td class="n">${vistas(x.id)}</td><td class="n">${x.u}</td><td class="n">${ars(x.t)}</td><td class="n">${avg?ars(avg):'—'}</td><td class="n">${p?ars(p.publico):'—'}${p&&avg&&Math.abs(avg-p.publico)>500?`<div class="hint">${avg<p.publico?'hoy es más caro':'hoy es más barato'}</div>`:''}</td><td class="n">${x.u?ars(x.g):'—'}</td><td class="n">${ve?`<span class="${x.g/ve<0.15?'neg':'pos'}">${pct(x.g/ve)}</span>`:'—'}</td></tr>`}).join('')}</tbody></table></div></div>
  <div class="card pad" style="margin-bottom:14px"><h4>Contenedores: lo planeado contra lo que está pasando</h4>${CONT.length?`<div class="wrap"><table><thead><tr><th>Contenedor</th><th class="n">Vendido</th><th class="n">Venta sin IVA<br><small>real / planeada</small></th><th class="n">Precio promedio<br><small>real / lista del pedido</small></th><th class="n">Ganancia hasta hoy<br><small>contra la plata puesta</small></th><th class="n">Meses para venderlo todo<br><small>al ritmo actual / supuesto</small></th><th class="n">Rinde por año<br><small>planeado</small></th></tr></thead><tbody>
   ${CONT.map(c=>`<tr><td><b>${esc(c.pe.nombre)}</b><div class="hint">${ESTP[c.pe.estado]||c.pe.estado} · ${c.r.unidades} unidades</div></td><td class="n"><b>${c.u} u.</b> · ${pct(c.r.unidades?c.u/c.r.unidades:0)}<div class="fb sm" style="margin-top:4px"><i style="width:${Math.min(100,c.r.unidades?c.u/c.r.unidades*100:0)}%"></i></div></td>
    <td class="n">${eU(c.vU)}<div class="hint">de ${eU(c.r.venta)}</div></td><td class="n">${c.precioReal?ars(c.precioReal):'—'}<div class="hint">${ars(c.precioLista)}</div></td><td class="n">${eU(c.gU)}<div class="hint">pico ${eU(c.r.pico)} · ${pct(c.r.pico?c.gU/c.r.pico:0)}</div></td>
    <td class="n">${c.mesesRit?`<b class="${c.mesesRit>c.r.p.meses*1.2?'neg':'pos'}">${c.mesesRit.toFixed(1).replace('.',',')}</b>`:'—'}<div class="hint">supuesto ${c.r.p.meses}</div></td><td class="n">${eP(c.r.anualizado)}<div class="hint">objetivo ${eP(c.r.p.objetivo,0)}</div></td></tr>`).join('')}</tbody></table></div><p class="hint">Cuenta las ventas de los productos de cada contenedor desde que se creó. Si el ritmo real proyecta más de 20% del tiempo supuesto, se marca en rojo. El detalle está en Gestión → Contenedores.</p>`:'<p class="hint">Todavía no hay contenedores cargados.</p>'}</div>
  <div class="g3d">
   <div class="card pad"><h4>Embudo de compra</h4>${F.map(([t,n],i)=>`<div class="fn"><span>${t}</span><div class="fb"><i style="width:${F[0][1]?n/F[0][1]*100:0}%"></i></div><b>${n}</b><small>${i&&F[i-1][1]?pct(n/F[i-1][1]):''}</small></div>`).join('')}<p class="hint">El % compara con el paso anterior: donde más se cae la gente es lo primero a mejorar.</p></div>
   <div class="card pad"><h4>De dónde vienen</h4>${fuentes.map(([k,n])=>`<div class="rw"><span>${esc(k)}</span><b>${n}</b></div>`).join('')||'<p class="hint">Sin visitas en este período.</p>'}</div>
   <div class="card pad"><h4>Cambios de precio</h4>${(hi||[]).slice(0,8).map(h=>`<div class="rw" style="gap:8px"><span>${esc(h.ref==='regla'?'Regla '+h.campo.replace('regla_','').replace('desc_','').replace('_',' '):nom(h.ref))}<div class="hint">${hace(h.fecha)}</div></span><b style="white-space:nowrap">${/pct|regla|desc|descuento/.test(h.campo)?pct(+h.antes)+' → '+pct(+h.despues):h.campo==='preventa_activa'?(+h.despues?'preventa on':'preventa off'):ars(h.antes)+' → '+ars(h.despues)}</b></div>`).join('')||'<p class="hint">Desde ahora cada cambio de precio o de regla queda acá y marcado en el gráfico.</p>'}</div></div>
  <div class="card pad" style="margin-bottom:14px"><h4>Carritos abandonados <small class="hint">— empezaron a pagar y no terminaron</small></h4>
   ${aband.length?`<div class="wrap"><table><thead><tr><th>Cuándo</th><th>Cliente</th><th class="hide-m">Productos</th><th class="n">Total</th><th></th></tr></thead><tbody>${aband.map(x=>`<tr><td>${hace(x.created_at)}</td><td><b>${esc(x.nombre||'—')}</b><div class="hint">${esc(x.email||'')} · ${esc(x.telefono||'')}</div></td><td class="hide-m">${(x.order_items||[]).map(i=>`${i.cantidad}× ${esc(i.products?i.products.tipo+' '+i.products.nombre:i.product_id)}`).join('<br>')}</td><td class="n">${ars(x.total)}</td>
    <td style="white-space:nowrap">${x.telefono?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${String(x.telefono).replace(/\D/g,'').replace(/^0?(11|15)/,'54911').replace(/^(?!54)/,'549')}?text=${encodeURIComponent('Hola '+(x.nombre||'').split(' ')[0]+', vimos que te quedó una compra sin terminar en FORMA Concept. ¿Te ayudamos?')}">WhatsApp</a>`:''} ${x.email?`<button class="btn" data-rem="${x.id}">${x.recordado_at?'Reenviar mail':'Mandar mail'}</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">No hay carritos abandonados en este período.</p>'}</div>
  <details class="card pad" id="idet" ${INI_DET?'open':''}><summary><b>Estado de resultados completo, venta por venta y tus números</b> <span class="hint">(comisiones, impuestos, gastos fijos, anuncios)</span></summary><div id="rentw" style="margin-top:12px"></div></details>
  <div id="subsw"></div>`;
  $('#m').querySelectorAll('[data-per]').forEach(b=>b.onclick=()=>{PER=+b.dataset.per;drawInicio()});
  $('#idet').ontoggle=e=>{INI_DET=e.target.open};
  $('#m').querySelectorAll('[data-rem]').forEach(b=>b.onclick=async()=>{b.disabled=true;const {data:{session}}=await sb.auth.getSession();
    const r=await fetch('/api/recordatorio',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({id:+b.dataset.rem})});const d=await r.json().catch(()=>({}));
    b.disabled=false;toast(r.ok?'Mail enviado':(d.error||'No se pudo enviar'));if(r.ok)b.textContent='Reenviar mail'});
  /* tooltip del gráfico */
  const ich=$('#m .ich'),tip=ich&&ich.querySelector('.itip');
  if(ich){ich.onmousemove=e=>{const t=e.target.closest('[data-tip]');if(!t){tip.hidden=true;return}tip.innerHTML=t.dataset.tip;tip.hidden=false;const b=ich.getBoundingClientRect(),x=e.clientX-b.left;tip.style.left=Math.min(b.width-tip.offsetWidth-4,Math.max(4,x+12))+'px';tip.style.top=Math.max(0,e.clientY-b.top-tip.offsetHeight-10)+'px'};ich.onmouseleave=()=>tip.hidden=true}
  await drawResultados(from,V);
  /* en vivo: se actualiza solo */
  const tick=()=>{const u=$('#iupd');if(u)u.textContent='actualizado '+hace(INI_AT)};const iv=setInterval(()=>{if(tab!=='inicio'||!$('#iupd'))return clearInterval(iv);tick()},10000);
  INI_T=setTimeout(()=>{if(tab!=='inicio')return;const a=document.activeElement;if(document.hidden||(a&&a.matches&&a.matches('input,select,textarea'))){INI_T=setTimeout(()=>drawInicio(true),30000);return}clearInterval(iv);drawInicio(true).then(()=>typeof drawSubs==='function'&&drawSubs())},30000);
}
