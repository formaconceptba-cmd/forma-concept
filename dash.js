/* ---------- Diseño estilo Escalafy / Shopify: menú lateral negro, tarjetas redondeadas, Inicio con
   "Tienda" y "Anuncios" en tarjetitas, gráfico con pestañas y últimas ventas con estado ---------- */
(function(){const st=document.createElement('style');st.textContent=`
body .tn-side{background:#0e0e0f;border-right:1px solid #1d1d1f;color:#e9e9e7}
body .tn-logo{color:#fff}body .tn-logo small{color:#8b8b88}
body .tn-sec{color:#6f6f6c}
body .tn-i{color:#d8d8d5}body .tn-i svg{color:#8b8b88}body .tn-i:hover{background:#1b1b1d}
body .tn-i.on,body .tn-g.act>.tn-i{color:#fff}body .tn-i.on{background:#232326}body .tn-i.on svg,body .tn-g.act>.tn-i svg{color:#fff}
body .tn-ch{border-color:#8b8b88}
body .tn-sub button{color:#9d9d9a}body .tn-sub button:hover{background:#1b1b1d;color:#fff}body .tn-sub button.on{background:#232326;color:#fff}
body .tn-foot{border-top:1px solid #1d1d1f}
body .tn-side::-webkit-scrollbar{width:6px}body .tn-side::-webkit-scrollbar-thumb{background:#2a2a2d;border-radius:6px}
body .card{border-radius:14px;border-color:#e4e3df;box-shadow:none}
body .tn-top{background:#fff}
/* cajita para preguntar (como "Work with Sidekick") */
.tn-sk{background:#18181a;border:1px solid #2a2a2d;border-radius:14px;padding:10px 10px 8px;display:grid;gap:6px;position:relative}
.tn-skh{display:flex;align-items:center;gap:6px;font:500 12.5px var(--f);color:#fff}
.tn-sk textarea{background:transparent;border:0;color:#e9e9e7;font:13px/1.4 var(--f);resize:none;outline:0;padding:2px 34px 2px 2px;min-height:38px}
.tn-sk textarea::placeholder{color:#7d7d7a}
.tn-sk button{position:absolute;right:8px;bottom:8px;width:26px;height:26px;border-radius:50%;border:0;background:#fff;color:#0e0e0f;font:600 14px/26px var(--f);cursor:pointer;padding:0}
/* Inicio */
.ihd [data-per]{border-radius:999px}
.dk-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:16px;margin-bottom:16px;align-items:start}
.dk-grp h3{font:600 15px var(--f);margin:2px 0 10px}
.dk-ks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
.dk-k{background:#fff;border:1px solid #e4e3df;border-radius:14px;padding:12px 14px;display:grid;gap:4px;min-width:0}
.dk-h{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#5d5d5a}.dk-h span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk-h i{font:600 10px/14px var(--f);font-style:normal;width:15px;height:15px;border:1.3px solid #9d9d9a;border-radius:50%;text-align:center;color:#77756f;cursor:help;flex:0 0 auto}
.dk-k b{font:600 21px var(--f);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dk-k small{font-size:11.5px;color:#77756f;min-height:15px}
.dk-ch{background:#fff;border:1px solid #e4e3df;border-radius:14px;padding:6px 6px 12px}
.dk-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#f2f1ee;border-radius:10px;padding:3px;margin:6px 6px 10px}
.dk-tabs button{border:0;background:none;border-radius:8px;padding:7px;font:500 13px var(--f);color:#5d5d5a;cursor:pointer}.dk-tabs button.on{background:#fff;color:#0a0a0a;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.dk-cv{padding:0 12px}.dk-cv span{font-size:12.5px;color:#5d5d5a}.dk-cv b{display:block;font:600 24px var(--f);margin:2px 0 4px;font-variant-numeric:tabular-nums}
.dk-svg{position:relative}.dk-tip{position:absolute;pointer-events:none;background:#0e0e0f;color:#fff;font-size:12px;padding:6px 9px;border-radius:8px;white-space:nowrap}
.dk-ord{background:#fff;border:1px solid #e4e3df;border-radius:14px;overflow:hidden;margin-bottom:16px}
.dk-ord table{width:100%;border-collapse:collapse}.dk-ord th{font:500 12px var(--f);color:#5d5d5a;text-align:left;padding:10px 14px;border-bottom:1px solid #ecebe7;background:#fafaf8}
.dk-ord td{padding:10px 14px;border-bottom:1px solid #f0efeb;font-size:13px}.dk-ord tr:last-child td{border-bottom:0}.dk-ord .n{text-align:right;font-variant-numeric:tabular-nums}
.dk-pill{display:inline-block;padding:2px 9px;border-radius:999px;font:600 11.5px var(--f)}.dk-ok{background:#d7f5c8;color:#245c12}.dk-pe{background:#ffe9a8;color:#6b4e00}.dk-ot{background:#e6e5e1;color:#4a4a47}
.dk-oh{display:flex;align-items:center;gap:10px;margin:4px 0 10px}.dk-oh h3{font:600 15px var(--f);margin:0;flex:1}
@media(max-width:1000px){.dk-top{grid-template-columns:1fr}}
@media(max-width:560px){.dk-ks{grid-template-columns:repeat(2,minmax(0,1fr))}.dk-k b{font-size:18px}.dk-ord .hide-m{display:none}}
`;document.head.appendChild(st)})();

/* cajita "Si tenés alguna duda, escribila acá": abre el asistente y manda la pregunta */
window.skEnviar=function(e){if(e)e.preventDefault();const q=document.getElementById('tnskq'),t=(q&&q.value||'').trim();if(!t)return;q.value='';
  document.body.classList.remove('tn-open');chatAbrir();setTimeout(()=>{const c=document.getElementById('tcq'),f=document.getElementById('tcf');if(c&&f){c.value=t;f.requestSubmit()}},50)};

/* ---- Inicio: bloque de arriba ---- */
(function(){
const fm=n=>{const a=Math.abs(n||0),s=n<0?'−':'';return a>=1e6?s+'$'+(a/1e6).toFixed(1).replace('.',',')+' M':a>=1e3?s+'$'+(a/1e3).toFixed(a>=1e5?0:1).replace('.',',')+' mil':s+'$'+Math.round(a)};
const x2=v=>v==null||!isFinite(v)?'—':v.toFixed(2).replace('.',',');
const pc=v=>v==null||!isFinite(v)?'—':(v*100).toFixed(1).replace('.',',')+'%';
const K=(t,v,info,sub)=>`<div class="dk-k"><div class="dk-h"><span>${t}</span><i title="${esc(info)}">i</i></div><b>${v}</b><small>${sub||'&nbsp;'}</small></div>`;
/* curva suave con área */
function curva(vals,labels,fmt){const W=620,H=250,L=8,R=58,T=14,B=26,iw=W-L-R,ih=H-T-B,n=vals.length;
  const mx=Math.max(...vals,0),mn=Math.min(...vals,0),rg=(mx-mn)||1,X=i=>L+(n>1?i/(n-1):.5)*iw,Y=v=>T+(mx-v)/rg*ih;
  const P=vals.map((v,i)=>[X(i),Y(v)]);let d=`M${P[0][0]},${P[0][1]}`;
  for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;d+=` C${p1[0]+(p2[0]-p0[0])/6},${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6},${p2[1]-(p3[1]-p1[1])/6} ${p2[0]},${p2[1]}`}
  const area=`${d} L${P[P.length-1][0]},${Y(Math.max(mn,0))} L${P[0][0]},${Y(Math.max(mn,0))} Z`,tk=[mn,mn+rg/3,mn+rg*2/3,mx],step=Math.max(1,Math.ceil(n/7));
  return `<div class="dk-svg"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img"><defs><linearGradient id="dkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0e0f" stop-opacity=".18"/><stop offset="1" stop-color="#0e0e0f" stop-opacity="0"/></linearGradient></defs>
   ${tk.map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eeede9"/><text x="${W-R+8}" y="${Y(v)+4}" font-size="11" fill="#8a8985">${fmt(v)}</text>`).join('')}
   ${mn<0?`<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#c9c7c1"/>`:''}
   <path d="${area}" fill="url(#dkg)"/><path d="${d}" fill="none" stroke="#0e0e0f" stroke-width="2"/>
   ${P.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#0e0e0f"/><rect x="${p[0]-iw/n/2}" y="${T}" width="${iw/n}" height="${ih}" fill="transparent" data-dt="${esc(labels[i]+': '+fmt(vals[i]))}"/>`).join('')}
   ${labels.map((l,i)=>i%step===0||i===n-1?`<text x="${X(i)}" y="${H-6}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}" font-size="11" fill="#8a8985">${l}</text>`:'').join('')}
  </svg><div class="dk-tip" hidden></div></div>`}

window.iniTop=function(o){const {R,RP,D,V,pend,FIJ,dl}=o,n=R.n,tk=n?R.total/n:0,mrg=R.venta?R.neto/R.venta:null;
  const mer=R.total&&R.ads?R.ads/R.total:null,roas=R.ads?R.total/R.ads:null,cpa=R.ads&&n?R.ads/n:null,np=n?R.neto/n:null,nroas=R.ads?R.g/R.ads:null;
  const SER={gan:{t:'Ganancia neta',v:fm(R.neto),s:D.map(d=>Math.round(d.g-(d.ad||0)-FIJ/30)),f:fm},
    roas:{t:'ROAS neto',v:x2(nroas),s:D.map(d=>d.ad?+(d.g/d.ad).toFixed(2):0),f:x2},
    ped:{t:'Pedidos',v:String(n),s:D.map(d=>d.n),f:v=>String(Math.round(v))}};
  window.DK_SER={SER,lab:D.map(d=>d.l)};
  /* últimas ventas: pagadas + esperando pago */
  const L=[...V.map(v=>({id:v.id,f:v.f,cli:v.cli,canal:v.canal,tot:v.total,neto:v.g,est:v.est||'Pagado',ok:true})),
    ...(pend||[]).map(p=>({id:'#'+p.id,f:p.created_at,cli:p.nombre,canal:p.canal==='profesional'?'pro':'pub',tot:p.total,neto:null,est:p.medio_pago==='transferencia'?'Esperando transferencia':'Pago sin terminar',ok:false}))]
    .sort((a,b)=>new Date(b.f)-new Date(a.f)).slice(0,8);
  const CN={pub:'Tienda online',pro:'Profesional',may:'Mayorista'};
  const fch=d=>new Date(d).toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return `<div class="dk-top"><div>
   <div class="dk-grp"><h3>Tienda</h3><div class="dk-ks">
    ${K('Pedidos',n,'Cantidad de ventas cobradas en el período.',dl(n,RP.n))}
    ${K('Facturación',fm(R.total),'Todo lo que cobraste, con IVA.',dl(R.total,RP.total))}
    ${K('Ticket promedio',fm(tk),'Facturación dividida por la cantidad de pedidos.')}
    ${K('Ganancia neta',`<span class="${R.neto<0?'neg':''}">${fm(R.neto)}</span>`,'Lo que te queda limpio después de productos, comisiones, impuestos, envíos, anuncios y gastos fijos.',dl(R.neto,RP.neto))}
    ${K('Margen neto',pc(mrg),'De cada $100 vendidos sin IVA, cuánto te queda limpio.')}
    ${K('Venta neta',fm(R.venta),'Lo vendido sin el IVA (el IVA es de ARCA, no tuyo).')}
   </div></div>
   <div class="dk-grp"><h3>Anuncios</h3><div class="dk-ks">
    ${K('Gasto en anuncios',fm(R.ads),'Lo que gastaste en Meta / Google en el período (Anuncios y ROAS).')}
    ${K('MER',pc(mer),'Qué parte de la facturación se va en anuncios. Cuanto más bajo, mejor.')}
    ${K('ROAS',x2(roas),'Por cada $1 de anuncio, cuánto facturaste (con IVA). Es el número que muestra Meta.')}
    ${K('Costo por venta',cpa==null?'—':fm(cpa),'Cuánto te costó en anuncios conseguir cada venta (CPA real).')}
    ${K('Ganancia por pedido',np==null?'—':fm(np),'Ganancia neta dividida por la cantidad de pedidos.')}
    ${K('ROAS neto',x2(nroas),'Por cada $1 de anuncio, cuánta ganancia te dejaron las ventas (ya sin costo, comisiones ni impuestos). Si es menor a 1, los anuncios pierden plata.')}
   </div></div></div>
   <div class="dk-ch"><div class="dk-tabs">${Object.entries(SER).map(([k,s],i)=>`<button data-dk="${k}" class="${i?'':'on'}">${s.t}</button>`).join('')}</div>
    <div id="dkc"></div></div></div>
  <div class="dk-oh"><h3>Últimas ventas</h3><button class="btn" data-go2="pedidos">Ver todas →</button></div>
  <div class="dk-ord"><div class="wrap"><table><thead><tr><th>N°</th><th>Cliente</th><th class="hide-m">Canal</th><th>Estado</th><th class="hide-m">Fecha</th><th class="n">Total</th><th class="n hide-m">Te deja</th></tr></thead><tbody>
   ${L.map(x=>`<tr${/^#\d+$/.test(x.id)?` data-ord="${x.id.slice(1)}" data-oc="${x.canal}" style="cursor:pointer"`:''}><td>${esc(x.id)}</td><td><b>${esc(x.cli||'—')}</b></td><td class="hide-m">${CN[x.canal]||x.canal}</td><td><span class="dk-pill ${x.ok?(/entreg|envi|pag/i.test(x.est)?'dk-ok':'dk-ot'):'dk-pe'}">${esc(x.est)}</span></td><td class="hide-m">${fch(x.f)}</td><td class="n">${ars(x.tot)}</td><td class="n hide-m">${x.neto==null?'—':ars(x.neto)}</td></tr>`).join('')||'<tr><td colspan="7" class="hint">Todavía no hay ventas.</td></tr>'}
  </tbody></table></div></div>`};

window.iniTopBind=function(){const box=document.getElementById('dkc');if(!box||!window.DK_SER)return;
  const pinta=k=>{const s=DK_SER.SER[k];box.innerHTML=`<div class="dk-cv"><span>${s.t}</span><b>${s.v}</b></div>${curva(s.s,DK_SER.lab,s.f)}`;
    const w=box.querySelector('.dk-svg'),tip=w.querySelector('.dk-tip');
    w.onmousemove=e=>{const t=e.target.closest('[data-dt]');if(!t){tip.hidden=true;return}tip.textContent=t.dataset.dt;tip.hidden=false;const b=w.getBoundingClientRect();tip.style.left=Math.min(b.width-tip.offsetWidth-4,Math.max(4,e.clientX-b.left+10))+'px';tip.style.top=Math.max(0,e.clientY-b.top-34)+'px'};w.onmouseleave=()=>tip.hidden=true};
  document.querySelectorAll('[data-ord]').forEach(r=>r.onclick=()=>{ORD_SEL=+r.dataset.ord;tab=r.dataset.oc==='pro'?'ppedidos':'pedidos';draw()});
  document.querySelectorAll('[data-dk]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-dk]').forEach(x=>x.classList.toggle('on',x===b));pinta(b.dataset.dk)});pinta('gan')};
})();
