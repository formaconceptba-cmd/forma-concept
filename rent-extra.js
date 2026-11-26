/* ---------- Precios y promociones → Reglas de precio: margen real de cada producto según cómo paga, con TODOS los costos ----------
   Reemplaza la tabla vieja (que sólo restaba el costo del producto, la comisión e IIBB) por una con el mismo cálculo que el
   contenedor: costo puesto en el galpón, cobro, IIBB, marketing, envío, garantía, galpón y Ganancias. "Ver cuentas" abre el desglose. */
(function(){
let MED='mix';
const MEDS=[['transf','Transferencia'],['mp','Mercado Pago 1 pago'],['cuotas','3 cuotas sin interés']];
async function rentMg(){const m=$('#m');const h3=[...m.querySelectorAll('h3')].find(h=>/Precio y margen de cada producto/.test(h.textContent));if(!h3||m.querySelector('#rmg'))return;
  const hint=h3.nextElementSibling,old=hint&&hint.nextElementSibling;await MG.cargar(true);MG.syncMinimos();if(tab!=='rent')return;
  const st=typeof ST!=='undefined'?ST:{},cp=+st.cuotas_promo_n>0&&+st.cuotas_promo_desde>0?{n:+st.cuotas_promo_n,desde:+st.cuotas_promo_desde,c:+st.cuotas_promo_costo||0.17}:null;
  const P=prods.filter(p=>p.activo&&+p.precio_lista>0).sort((a,b)=>(a.tipo+a.nombre).localeCompare(b.tipo+b.nombre));
  h3.textContent='Cuánto te queda de cada producto, según cómo paga el cliente';
  if(hint)hint.innerHTML='Con <b>todos</b> los costos de hoy: producto puesto en el galpón (FOB, flete, aduana, impuestos), cobro, Ingresos Brutos, marketing, envío, garantía, galpón y Ganancias. Arriba lo que te queda limpio por venta; abajo el retorno sobre la plata que ponés. Los % se cambian en Configuración → Costos y parámetros.';
  if(old)old.style.display='none';
  const w=document.createElement('div');w.id='rmg';(old||hint||h3).after(w);
  const pinta=()=>{const mk=MG.mkt,cols=MEDS.concat(cp?[['cuotasN',`${cp.n} cuotas (desde ${ars(cp.desde)})`]]:[]).concat([['mix','Promedio (mezcla real)']]);
    w.innerHTML=`<label style="display:flex;gap:6px;align-items:center;font-weight:400;margin:0 0 8px"><input type="checkbox" id="rmk" ${mk?'checked':''} style="width:auto"> Contar el gasto en marketing <span class="hint">(destildalo para ver cuánto margen hay sin anuncios)</span></label>
    <div class="card wrap"><table class="big"><thead><tr><th></th><th>Producto</th><th class="n">Lista</th><th class="n">Costo en galpón<div class="hint">sin IVA</div></th><th class="n">Mín. sin perder</th>${cols.map(c=>`<th class="n">${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>
    ${P.map((p,k)=>{const x=MG.R[p.id];if(!x)return `<tr><td><img src="${esc(src(p.img))}" alt=""></td><td><b>${esc(p.tipo)} ${esc(p.nombre)}</b><div class="hint">${esc(p.id)}</div></td><td class="n">${ars(p.precio_lista)}</td><td colspan="${cols.length+3}" class="hint">No viene en ningún contenedor: sin costo para calcular.</td></tr>`;
      const C=cols.map(([md])=>md==='cuotasN'&&+p.precio_lista<cp.desde?null:MG.cuentas(p.id,+p.precio_lista,{medio:md,cuotasCosto:cp&&cp.c,mkt:mk}));
      return `<tr${+p.precio_lista<x.min?' style="background:#fdecec"':''}><td><img src="${esc(src(p.img))}" alt=""></td><td><b>${esc(p.tipo)} ${esc(p.nombre)}</b><div class="hint">${esc(p.id)}${x.pz>1?` · caja de ${x.pz}`:''}</div></td><td class="n">${ars(p.precio_lista)}</td><td class="n">${ars(x.i.costoU*x.p.tc*x.pz)}</td><td class="n neg">${ars(x.min)}</td>
       ${C.map(c=>c?`<td class="n"><b class="${c.estado==='bad'?'neg':c.estado==='warn'?'':'pos'}"${c.estado==='warn'?' style="color:#d68910"':''}>${ars(c.neto)}</b><div class="hint">${eP(c.ret,0)}</div></td>`:'<td class="n hint">—</td>').join('')}
       <td><button class="lnk" data-rmc="${k}">Ver cuentas</button></td></tr><tr hidden data-rmr="${k}"><td></td><td colspan="${cols.length+5}"><div class="bar" style="margin:6px 0 0;gap:6px;flex-wrap:wrap">${cols.map(([md,t])=>`<button class="btn${md===MED?' dk':''}" data-rmm="${k}|${md}" style="padding:4px 10px;font-size:12px">${t}</button>`).join('')}</div><div data-rmb="${k}">${MG.cuentasHTML(MG.cuentas(p.id,+p.precio_lista,{medio:MED,cuotasCosto:cp&&cp.c,mkt:mk}))}</div></td></tr>`}).join('')}</tbody></table></div>
    <p class="hint">En rojo, productos con el precio de lista abajo del mínimo sin perder: la tienda los oculta solos hasta que se corrija el precio.</p>`;
    w.querySelector('#rmk').onchange=e=>{MG.mkt=e.target.checked;pinta()};
    w.onclick=e=>{const b=e.target.closest('[data-rmc]');if(b){const t=w.querySelector(`[data-rmr="${b.dataset.rmc}"]`);t.hidden=!t.hidden;b.textContent=t.hidden?'Ver cuentas':'Ocultar';return}
      const mm=e.target.closest('[data-rmm]');if(mm){const [k,md]=mm.dataset.rmm.split('|'),p=P[+k];w.querySelector(`[data-rmb="${k}"]`).innerHTML=MG.cuentasHTML(MG.cuentas(p.id,+p.precio_lista,{medio:md,cuotasCosto:cp&&cp.c,mkt:MG.mkt}));w.querySelectorAll(`[data-rmm^="${k}|"]`).forEach(x=>x.classList.toggle('dk',x===mm))}}};
  pinta()}
if(typeof drawRent==='function'){const _r=drawRent;drawRent=async function(){const o=await _r.apply(this,arguments);try{await rentMg()}catch(e){console.warn(e)}return o}}
})();
