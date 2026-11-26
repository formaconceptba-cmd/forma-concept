/* ---------- Márgenes con TODOS los costos, en vivo, para cualquier precio ----------
   Sale del último contenedor donde viene cada producto (costo puesto en el galpón + parámetros de Configuración → Costos).
   MG.cuentas(codigo, precioLista, {pct, medio, mkt}) → desglose: IVA, costo, cobro (según cómo paga), IIBB, marketing, envío,
   garantía, galpón, Ganancias → te queda limpio y retorno. Lo usan Productos, Reglas de precio y Promociones.
   También guarda en products.precio_minimo el mínimo sin perder: si el precio de lista queda abajo, la tienda oculta el producto sola. */
(function(){
const MG=window.MG={R:{},ok:false,mkt:true};
MG.cargar=async function(force){if(MG.ok&&!force)return MG.R;const R={};try{
  if(typeof master!=='undefined'&&!master.length&&typeof loadMaster==='function')await loadMaster();
  if(typeof ECO==='undefined'||typeof ecoCalc!=='function')return R;if(force||!ECO.ped||!ECO.ped.length)await ecoLoad();
  const P=[...ECO.ped].filter(p=>p.estado!=='cerrado').sort((a,b)=>b.id-a.id);
  for(const pe of P){const r=ecoCalc(pe);for(const i of r.items){if(R[i.codigo])continue;const pz=typeof pzEco==='function'?pzEco(i.codigo):1;
    R[i.codigo]={i,p:r.p,cc:r.cc,pz,pe:pe.nombre,min:i.minSinPerderARS*pz,sug:i.sugeridoARS*pz}}}}catch(e){console.warn('MG',e)}
  MG.R=R;MG.ok=true;return R};
/* cuánto cuesta cobrar según cómo paga (sobre la venta sin IVA). "cuotasN": cuotas sin interés de una promo, con su costo */
MG.cobro=(x,medio,cN)=>{const c=x.cc,p=x.p;return medio==='transf'?c.transf:medio==='mp'?c.unPago:medio==='cuotas'?c.cuotas:medio==='cuotasN'?(1+p.iva)*((+cN||0)+p.comChk):c.total};
MG.cuentas=function(cod,precio,o={}){const x=MG.R[cod];if(!x||!(precio>0))return null;const p=x.p,i=x.i,tc=p.tc,pz=x.pz,pct=+o.pct||0,mkt=o.mkt!==undefined?o.mkt:MG.mkt;
  const P=precio*(1-pct)/pz,V=P/(1+p.iva)/tc,cob=MG.cobro(x,o.medio||'mix',o.cuotasCosto);
  const G=[['Cobro'+(o.medio==='transf'?' (descuento por transferencia + comisión)':o.medio==='mp'?' (tarjeta en 1 pago)':o.medio==='cuotas'?' (3 cuotas sin interés)':o.medio==='cuotasN'?' (cuotas sin interés de la promo)':' (mezcla de transferencia, 1 pago y cuotas)'),cob],['Ingresos Brutos',p.iibb],['Marketing (anuncios)',mkt?p.marketing:0],['Envío / entrega',p.entrega],['Garantía y roturas',p.garantia]].concat(p.comisionVenta?[['Comisión de venta',p.comisionVenta]]:[]);
  const gv=G.reduce((a,g)=>a+g[1],0),antes=V-i.costoU-V*gv-i.almacenajeU,neto=antes-Math.max(0,antes)*p.ganancias;
  const L=[['Precio que paga el cliente (con IVA)'+(pct?` — con ${Math.round(pct*100)}% off`:''),P*tc,'b'],['− IVA ('+eP(p.iva,0)+')',-(P-V*tc)],['= Venta sin IVA',V*tc,'b'],['− Costo del producto puesto en el galpón',-i.costoU*tc]]
    .concat(G.filter(g=>g[1]).map(([t,v])=>['− '+t+' ('+eP(v,1)+')',-V*v*tc])).concat([['− Galpón mientras se vende',-i.almacenajeU*tc],['= Ganancia antes de impuestos',antes*tc,'b'],['− Ganancias ('+eP(p.ganancias,0)+')',-Math.max(0,antes)*p.ganancias*tc],['= Te queda limpio por unidad',neto*tc,'b']]);
  const ret=i.desembolsoU>0?neto/i.desembolsoU:null;
  return {neto:neto*tc*pz,netoU:neto*tc,antes:antes*tc*pz,venta:V*tc*pz,ret,margen:V>0?neto/V:null,estado:neto<0?'bad':ret!=null&&ret<p.retornoMinProd?'warn':'ok',L,pz,desemb:i.desembolsoU*tc}};
MG.estadoHTML=e=>e==='bad'?'<span class="neg"><b>pierde plata</b></span>':e==='warn'?'<span style="color:#d68910">deja poco</span>':'<span class="pos">bien</span>';
MG.cuentasHTML=c=>!c?'<p class="hint">Sin costo cargado (no viene en ningún contenedor).</p>':`<div class="card pad" style="max-width:600px;margin:4px 0 10px">${c.L.map(([t,v,b])=>`<div class="rw"${b?' style="border-top:1px solid var(--line);padding-top:4px"':''}><span>${b?`<b>${t}</b>`:t}</span>${b?`<b>${ars(v)}</b>`:`<span>${v<0?'−'+ars(-v):ars(v)}</span>`}</div>`).join('')}
  <div class="rw" style="margin-top:8px"><span class="hint">Plata que ponés por unidad (incluye IVA y percepciones de aduana que recuperás)</span><span>${ars(c.desemb)}</span></div><div class="rw"><span><b>Retorno</b> = te queda limpio ÷ plata que ponés</span><b>${eP(c.ret,0)}</b></div>${c.pz>1?`<p class="hint" style="margin:6px 0 0">Por unidad. Se vende en caja de ${c.pz}: por caja te queda ${ars(c.neto)}.</p>`:''}</div>`;
/* guarda el mínimo sin perder de cada producto (lo usa la tienda para ocultar precios abajo del mínimo) */
MG.syncMinimos=async function(){try{await MG.cargar();if(typeof prods==='undefined'||!prods.length)return;
  for(const p of prods){const x=MG.R[p.id];const v=x?Math.round(x.min):null;if(x&&Math.round(+p.precio_minimo||0)!==v){const {error}=await sb.from('products').update({precio_minimo:v}).eq('id',p.id);if(!error)p.precio_minimo=v}}}catch(e){console.warn(e)}};
})();
