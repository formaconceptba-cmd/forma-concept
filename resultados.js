/* ---------- Inicio → Estado de resultados: cuánto ganaste de verdad, en vivo ----------
   Ventas cobradas (tienda, profesionales, mayoristas) − costo de lo vendido − costos de vender (comisiones, envíos, IIBB, cheque)
   − anuncios (Estadísticas: gasto por campaña) − gastos del negocio (6. Gastos: fijos, depósito Pailos, puntuales) − Ganancias.
   Con período, gráfico de "en qué se va cada $100", comparación por mes y venta por venta. */
(function(){
let RPER='mes',RV=null;
const PERS=[['mes','Este mes'],['mesant','Mes pasado'],['30','Últimos 30 días'],['90','Últimos 90 días'],['anio','Este año'],['todo','Todo']];
const COL={ing:'#1baf7a',merc:'#e07b39',vend:'#d6a21e',mkt:'#8e5bd6',neg:'#2a78d6',imp:'#8a8f94',res:'#141414'};
function rango(k){const n=new Date(),y=n.getFullYear(),m=n.getMonth(),fin=new Date(+n+864e5);
  if(k==='mes')return [new Date(y,m,1),fin];if(k==='mesant')return [new Date(y,m-1,1),new Date(y,m,1)];if(k==='anio')return [new Date(y,0,1),fin];
  if(k==='todo')return [new Date(2020,0,1),fin];return [new Date(+n-(+k)*864e5),fin]}
function calc(V,AC,d0,d1){const T=TX(),x=V.filter(v=>{const t=new Date(v.f);return t>=d0&&t<d1}),S=k=>x.reduce((a,v)=>a+(v[k]||0),0);
  const dias=Math.max(1,(Math.min(+d1,Date.now())-Math.max(+d0,x.length?Math.min(...x.map(v=>+new Date(v.f))):+d0))/864e5);
  const ads=(AC||[]).length?(AC||[]).filter(a=>{const t=new Date(a.fecha+'T12:00');return t>=d0&&t<d1}).reduce((s,a)=>s+(+a.gasto),0):0;
  const g=window.GST?GST.rango(d0,d1):{fijos:T.FIJ*dias/30,cats:{},dep:0,unicos:0,unicosL:[]};
  const total=S('total'),venta=S('venta'),cprod=S('cprod'),com=S('com'),env=S('env'),iibb=S('iibb'),chq=S('chq');
  const bruta=venta-cprod,contrib=bruta-com-env-iibb-chq,neg=g.fijos+g.dep+g.unicos,antes=contrib-ads-neg,gan=Math.max(0,antes)*T.GAN,neto=antes-gan;
  return {x,n:x.length,total,iva:total-venta,venta,cprod,com,env,iibb,chq,bruta,contrib,ads,g,neg,antes,gan,neto,T}}

function pl(r){const pc=v=>r.venta>0?(v/r.venta*100).toFixed(1).replace('.',',')+'%':'';
  const fila=(t,v,h,col,neg)=>`<tr><td style="padding-left:22px">${t}${h?`<div class="hint">${h}</div>`:''}</td><td class="n">${v?(neg?'− ':'')+ars(Math.abs(v)):'—'}</td><td class="n hint">${v?pc(Math.abs(v)):''}</td><td style="width:120px"><div style="height:6px;background:#f0efeb;border-radius:3px"><div style="height:6px;border-radius:3px;background:${col};width:${r.venta>0?Math.min(100,Math.abs(v)/r.venta*100):0}%"></div></div></td></tr>`;
  const sec=(t,col)=>`<tr><td colspan="4" style="padding-top:16px"><span style="display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:${col}"><i style="width:10px;height:10px;border-radius:2px;background:${col};display:inline-block"></i>${t}</span></td></tr>`;
  const sub=(t,v,big)=>`<tr style="background:${big?'#141414':'#f6f6f3'};${big?'color:#fff':''}"><td style="padding:${big?'12px':'8px'} 10px"><b style="${big?'font-size:15px':''}">${t}</b></td><td class="n" style="padding:${big?'12px':'8px'} 10px"><b style="${big?'font-size:17px;':''}${v<0?'color:'+(big?'#ff8a80':'#c0392b'):''}">${v<0?'− ':''}${ars(Math.abs(v))}</b></td><td class="n" style="${big?'color:#ddd':''}">${pc(v)}</td><td></td></tr>`;
  const cats=Object.entries(r.g.cats).sort((a,b)=>b[1]-a[1]);
  return `<div class="card wrap"><table style="width:100%"><tbody>
   ${sec('Ingresos',COL.ing)}${fila('Cobraste (lo que pagaron los clientes, con IVA)',r.total,'',COL.ing)}${fila('IVA',r.iva,'No es tuyo: va a ARCA (menos el IVA que pagaste al importar).',COL.imp,true)}
   ${sub('Ventas netas (sin IVA)',r.venta)}
   ${sec('Costo de la mercadería',COL.merc)}${fila('Costo de los productos vendidos',r.cprod,'Fábrica + flete + aduana + impuestos de importación, de cada unidad vendida.',COL.merc,true)}
   ${sub('Ganancia bruta',r.bruta)}
   ${sec('Costos de vender',COL.vend)}${fila('Comisiones de Mercado Pago',r.com,'',COL.vend,true)}${fila('Envíos que pagás vos',r.env,'',COL.vend,true)}${fila('Ingresos Brutos',r.iibb,'',COL.vend,true)}${fila('Impuesto al cheque',r.chq,'',COL.vend,true)}
   ${sub('Lo que dejan las ventas',r.contrib)}
   ${sec('Marketing',COL.mkt)}${fila('Anuncios',r.ads,'Lo cargado en Inicio → Anuncios y ROAS.',COL.mkt,true)}
   ${sec('Gastos del negocio',COL.neg)}${cats.length?cats.map(([c,v])=>fila(esc(c),v,'',COL.neg,true)).join(''):fila('Gastos fijos',r.g.fijos,'Todavía no cargaste ninguno: 6. Gastos.',COL.neg,true)}${fila('Depósito Pailos',r.g.dep,'Almacenamiento, recepción y salidas (se calcula solo).',COL.neg,true)}${fila('Gastos puntuales',r.g.unicos,r.g.unicosL.slice(0,4).map(g=>esc(g.descripcion||g.categoria)).join(' · '),COL.neg,true)}
   ${sub('Resultado antes de Ganancias',r.antes)}
   ${sec('Impuestos',COL.imp)}${fila('Impuesto a las Ganancias (estimado)',r.gan,`${pct(r.T.GAN)} de la ganancia, si hay ganancia. Confirmalo con tu contador.`,COL.imp,true)}
   ${sub('Resultado neto: te queda limpio',r.neto,true)}
  </tbody></table></div>`}

function barra(r){if(!(r.total>0))return '';const P=[['IVA',r.iva,COL.imp],['Productos',r.cprod,COL.merc],['Vender',r.com+r.env+r.iibb+r.chq,COL.vend],['Anuncios',r.ads,COL.mkt],['Gastos del negocio',r.neg,COL.neg],['Ganancias',r.gan,'#b8bcc0']],usado=P.reduce((a,p)=>a+p[1],0),q=r.total-usado;
  const seg=P.concat([[q>=0?'Te queda':'Pérdida',Math.abs(q),q>=0?COL.ing:'#c0392b']]),tot=seg.reduce((a,s)=>a+s[1],0)||1;
  return `<div class="card pad" style="margin-bottom:14px"><h4 style="margin:0 0 10px">En qué se va cada $100 que cobrás</h4>
   <div style="display:flex;height:26px;border-radius:6px;overflow:hidden">${seg.map(([t,v,c])=>v>0?`<div title="${t}: ${ars(v)}" style="background:${c};width:${v/tot*100}%"></div>`:'').join('')}</div>
   <div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:12.5px">${seg.map(([t,v,c])=>`<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:2px;background:${c};display:inline-block"></i>${t} <b>$${(v/r.total*100).toFixed(1).replace('.',',')}</b></span>`).join('')}</div></div>`}

function meses(V,AC){const n=new Date(),M=[];for(let i=5;i>=0;i--){const d0=new Date(n.getFullYear(),n.getMonth()-i,1),d1=new Date(n.getFullYear(),n.getMonth()-i+1,1);M.push({l:d0.toLocaleDateString('es-AR',{month:'short',year:'2-digit'}),r:calc(V,AC,d0,d1)})}
  const F=[['Ventas netas',r=>r.venta,COL.ing],['Costo de los productos',r=>-r.cprod,COL.merc],['Costos de vender',r=>-(r.com+r.env+r.iibb+r.chq),COL.vend],['Anuncios',r=>-r.ads,COL.mkt],['Gastos del negocio',r=>-r.neg,COL.neg],['Ganancias (impuesto)',r=>-r.gan,COL.imp],['Resultado neto',r=>r.neto,COL.res,1],['Margen neto',r=>r.venta?r.neto/r.venta:null,null,2]];
  return `<div class="card wrap" style="margin-bottom:14px"><h4 style="margin:0 0 8px;padding:12px 14px 0">Mes a mes</h4><table><thead><tr><th></th>${M.map(m=>`<th class="n">${m.l}</th>`).join('')}</tr></thead><tbody>
   ${F.map(([t,f,c,b])=>`<tr${b===1?' style="background:#f6f6f3"':''}><td>${c?`<i style="width:8px;height:8px;border-radius:2px;background:${c};display:inline-block;margin-right:6px"></i>`:''}${b?`<b>${t}</b>`:t}</td>${M.map(m=>{const v=f(m.r);return `<td class="n">${v==null?'—':b===2?`<span class="${v<0?'neg':'pos'}">${pct(v)}</span>`:`<span class="${b&&v<0?'neg':''}">${b?'<b>':''}${v<0?'− ':''}${ars(Math.abs(v))}${b?'</b>':''}</span>`}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}

/* real contra proyectado: lo que proyectan los contenedores (venta y resultado repartidos en los meses de rotación desde que llegan) */
function proyMes(){const st=typeof ST!=='undefined'?ST:{},ll=String(st.llegada_contenedor||''),lleg=ll.length===8?new Date(+ll.slice(0,4),+ll.slice(4,6)-1,1):null,M={};
  (ECO.ped||[]).filter(p=>p.estado!=='borrador'&&p.estado!=='cerrado').forEach(pe=>{let r;try{r=ecoCalc(pe)}catch(e){return}const tc=r.p.tc,n=Math.max(1,Math.round(r.p.meses||10));
    const l=pe.par&&pe.par.llegada?new Date(pe.par.llegada):lleg;if(!l)return;
    for(let i=0;i<n;i++){const d=new Date(l.getFullYear(),l.getMonth()+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const x=M[k]||(M[k]={v:0,r:0});x.v+=r.venta/n*tc;x.r+=r.resultado/n*tc}});
  return M}
function lineas(S,W=720,H=210){const L=64,R=10,T=14,B=26,iw=W-L-R,ih=H-T-B,n=S[0].v.length,all=S.flatMap(s=>s.v.filter(v=>v!=null));
  const mx=Math.max(1,...all),mn=Math.min(0,...all),rg=mx-mn||1,y=v=>T+(mx-v)/rg*ih,x=i=>L+(n>1?i/(n-1)*iw:iw/2);
  const tk=[mn,0,mx/2,mx].filter((v,i,a)=>a.indexOf(v)===i&&(v===0||Math.abs(v)>rg*0.08));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${tk.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="${v===0?'#bdbab3':'#ebe9e4'}"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#77756F">${typeof kM==='function'?kM(v):Math.round(v)}</text>`).join('')}
   ${S.map(s=>{let d='',on=false;s.v.forEach((v,i)=>{if(v==null){on=false;return}d+=(on?'L':'M')+x(i)+','+y(v);on=true});return `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.dash?2:2.5}" ${s.dash?'stroke-dasharray="6 5"':''} stroke-linejoin="round"/>${s.v.map((v,i)=>v!=null&&!s.dash?`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${s.c}" stroke="#fff" stroke-width="1.5"/>`:'').join('')}`}).join('')}
   ${S[0].l.map((t,i)=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="11" fill="#77756F">${t}</text>`).join('')}</svg>
   <div class="ileg">${S.map(s=>`<span><i style="background:${s.c};${s.dash?'opacity:.6':''}"></i>${s.n}</span>`).join('')}</div>`}
function vsProy(V,AC){const P=proyMes(),n=new Date(),MS=[];for(let i=-5;i<=9;i++){const d0=new Date(n.getFullYear(),n.getMonth()+i,1),d1=new Date(n.getFullYear(),n.getMonth()+i+1,1),k=d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0'),fut=d0>n;
    const r=fut?null:calc(V,AC,d0,d1),p=P[k]||{v:0,r:0};MS.push({l:d0.toLocaleDateString('es-AR',{month:'short'}),k,fut,rv:r?r.venta:null,rr:r?r.contrib-r.ads:null,pv:p.v,pr:p.r})}
  const hay=MS.some(m=>m.pv);const des=(a,b)=>b?((a-b)/Math.abs(b)*100):null,dTxt=v=>v==null?'—':`<span class="${v<0?'neg':'pos'}">${v>0?'+':''}${Math.round(v)}%</span>`;
  return `<div class="card pad" style="margin-top:14px"><h4 style="margin:0 0 4px">Real contra proyectado</h4>
   <p class="hint" style="margin:0 0 10px">Línea llena: lo que pasó. Punteada: lo que proyectaron los contenedores (la venta y lo que dejan, repartidos en los meses de rotación desde que llegan${typeof ST!=='undefined'&&ST.llegada_contenedor?', llegada estimada '+String(ST.llegada_contenedor).replace(/(\d{4})(\d\d)(\d\d)/,'$3/$2/$1'):''}). ${hay?'':'<b>Todavía no hay proyección en estos meses.</b>'}</p>
   <div class="g2d" style="gap:14px"><div><b style="font-size:13px">Ventas netas (sin IVA)</b>${lineas([{n:'Real',c:'#1baf7a',v:MS.map(m=>m.rv),l:MS.map(m=>m.l)},{n:'Proyectado',c:'#1baf7a',dash:1,v:MS.map(m=>m.pv||null),l:MS.map(m=>m.l)}])}</div>
    <div><b style="font-size:13px">Lo que dejan las ventas (después de producto, cobro, impuestos y anuncios)</b>${lineas([{n:'Real',c:'#141414',v:MS.map(m=>m.rr),l:MS.map(m=>m.l)},{n:'Proyectado',c:'#141414',dash:1,v:MS.map(m=>m.pr||null),l:MS.map(m=>m.l)}])}</div></div>
   <details style="margin-top:8px"><summary class="hint" style="cursor:pointer">Ver el desvío mes a mes</summary><div class="wrap" style="margin-top:8px"><table><thead><tr><th>Mes</th><th class="n">Ventas real</th><th class="n">Ventas proyectadas</th><th class="n">Desvío</th><th class="n">Dejan real</th><th class="n">Dejan proyectado</th><th class="n">Desvío</th></tr></thead><tbody>
    ${MS.map(m=>`<tr${m.fut?' class="hint"':''}><td>${m.l}${m.fut?' (futuro)':''}</td><td class="n">${m.rv==null?'—':ars(m.rv)}</td><td class="n">${m.pv?ars(m.pv):'—'}</td><td class="n">${m.fut?'—':dTxt(des(m.rv,m.pv))}</td><td class="n">${m.rr==null?'—':ars(m.rr)}</td><td class="n">${m.pr?ars(m.pr):'—'}</td><td class="n">${m.fut?'—':dTxt(des(m.rr,m.pr))}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">Desvío en verde: mejor de lo proyectado; en rojo: peor. Si se repite varios meses, revisá los supuestos del contenedor (rotación, precio, marketing).</p></details></div>`}

async function pintar(){if(tab!=='resultados')return;const m=$('#m');m.innerHTML='<p class="hint">Cargando…</p>';
  const [V,{data:AC}]=await Promise.all([ventasRent(),sb.from('ads_campania').select('fecha,gasto')]);try{if(window.GST)await GST.cargar()}catch(e){console.warn(e)}if(tab!=='resultados')return;RV=V;
  const [d0,d1]=rango(RPER),r=calc(V,AC,d0,d1),mg=r.venta?r.neto/r.venta:null;
  const K=(t,v,s,c)=>`<div class="card ik" style="border-top:3px solid ${c}"><span>${t}</span><b class="${v<0?'neg':''}">${v<0?'− ':''}${ars(Math.abs(v))}</b><small>${s||'&nbsp;'}</small></div>`;
  m.innerHTML=`<div class="bar" style="flex-wrap:wrap;gap:6px"><span class="live"><i></i>En vivo</span><span class="sp"></span>${PERS.map(([k,l])=>`<button class="btn ${RPER===k?'dk':''}" data-rper="${k}">${l}</button>`).join('')}</div>
   <p class="hint" style="margin:0 0 12px;max-width:900px">Cuánto ganaste de verdad en el período: todas las ventas cobradas (tienda, profesionales y mayoristas) menos todo lo que costó. Los gastos del negocio salen de <b>6. Gastos</b>; los anuncios de <b>Anuncios y ROAS</b>; los % (comisión, IIBB, Ganancias) de <b>Configuración → Costos y parámetros</b>.</p>
   <div class="iks">${K('Ventas (con IVA)',r.total,`${r.n} venta${r.n===1?'':'s'}`,COL.ing)}${K('Ganancia bruta',r.bruta,'ventas netas − costo de los productos',COL.merc)}${K('Gastos (vender + anuncios + negocio)',-(r.com+r.env+r.iibb+r.chq+r.ads+r.neg),'',COL.neg)}${K('Te queda limpio',r.neto,mg==null?'':`margen neto ${pct(mg)}`,r.neto<0?'#c0392b':COL.ing)}</div>
   ${barra(r)}
   <div class="g2d" style="align-items:start;gap:14px"><div>${pl(r)}</div><div>${meses(V,AC)}
    <div class="card pad"><h4 style="margin:0 0 6px">Cómo se lee</h4><p class="hint" style="margin:0;line-height:1.6"><b style="color:${COL.ing}">Ventas netas</b>: lo cobrado sin IVA. <b style="color:${COL.merc}">Ganancia bruta</b>: después de pagar los productos. <b style="color:${COL.vend}">Lo que dejan las ventas</b>: después de comisiones, envíos e impuestos de cada venta. <b style="color:${COL.neg}">Resultado</b>: después de anuncios y gastos del negocio. Si da negativo, ese período perdiste plata.</p></div></div></div>
   ${vsProy(V,AC)}
   <details class="card pad" style="margin-top:14px"><summary style="cursor:pointer"><b>Venta por venta</b> <span class="hint">(${r.n})</span></summary>
    ${r.n?`<div class="wrap" style="margin-top:10px"><table><thead><tr><th>#</th><th>Fecha</th><th>Quién</th><th class="hide-m">Productos</th><th>Cómo pagó</th><th class="n">Cobraste</th><th class="n hide-m">Costo productos</th><th class="n hide-m">Comisión + impuestos</th><th class="n">Le quedó</th><th class="n">Margen</th></tr></thead><tbody>
    ${r.x.map(v=>`<tr><td>${v.id}</td><td>${new Date(v.f).toLocaleDateString('es-AR')}</td><td>${esc(v.cli||'')}<div class="hint">${esc(v.est||'')}</div></td><td class="hide-m hint">${esc(v.det||'')}</td><td>${esc(v.medio||'')}</td><td class="n">${ars(v.total)}</td><td class="n hide-m">${ars(v.cprod)}</td><td class="n hide-m">${ars(v.com+v.env+v.iibb+v.chq)}</td><td class="n"><b class="${v.g<0?'neg':''}">${ars(v.g)}</b></td><td class="n">${v.m==null?'—':`<span class="${v.m<0.15?'neg':'pos'}">${pct(v.m)}</span>`}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">No hay ventas en este período.</p>'}</details>`;
  m.querySelectorAll('[data-rper]').forEach(b=>b.onclick=()=>{RPER=b.dataset.rper;pintar()})}

if(typeof draw==='function'){const _d=draw;draw=async function(){if(tab==='resultados'){if(typeof drawNav==='function')drawNav();return pintar()}return _d.apply(this,arguments)}}
if(window.AYUDA)AYUDA.resultados='Cuánto ganaste de verdad: ventas, costo de lo vendido, costos de vender, anuncios, gastos del negocio e impuestos. Por período y mes a mes.';
})();
