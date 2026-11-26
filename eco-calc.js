/* Economía por contenedor: cálculo puro (portado tal cual del modelo verificado contra el Excel y Python).
   Entra (pedido, catálogo, parámetros, aranceles por subcategoría) y sale todo. Sin efectos. */
const ARANCEL_DEF=0.235;
const SUBCATS=['Sillas madera','Sillas metal','Sillas plástico','Mesas madera','Mesas metal','Mesas plástico','Muebles madera','Muebles metal','Muebles plástico','Sillones y sofás','Camas'];
const PAR_DEF={tc:1540,flete20:4500,cbm20:28,flete40:4500,cbm40:60,fleteHQ:4500,cbmHQ:68,contHQ:0,origenUSD:0,fleteInterno:0,consolidacion:0,comisionCompra:0,
  seguroPct:0.02,honorariosPct:0.015,despachoFijo:400,terminal:500,transporte:600,verificacion:1000,descarga:0,
  diasFiscal:0,almacenajeDia:1.2,resguardo:500,
  galponMes:14.61,factorStock:0.5,recepcionARS:500000,movimientoARS:6500,vecesMov:1,prepPedidos:0,seguroDeposito:0,
  comChk:0.0355,comTransf:0,com3Cuotas:0.1049,comPlataforma:0,webARS:20000,ivaComisionEsCosto:0,
  mixTransf:0.5,mixUnPago:0,descTransf:0.15,
  anticipo:0.3,produccion:45,transito:45,nacionalizacion:7,
  iva:0.21,percepIva:0.2,percepGan:0.06,iibb:0.035,ganancias:0.35,
  merma:0.03,marketing:0.05,entrega:0.03,garantia:0.02,comisionVenta:0,imprevistos:0.02,unidPorVenta:1.5,
  meses:10,pctLiquidado:0,descLiquidacion:0.3,pctNoVendido:0,
  estructuraMes:0,pctEstructura:1,
  objetivo:0.25,costoOportunidad:0.08,retornoMinProd:0.3,margenMinProd:0.45,markupDefault:0.8};

function contenedores(cbm,p){
  if (p.contHQ>0) return {n20:0,n40:0,nHQ:+p.contHQ};
  if (cbm<=0) return {n20:0,n40:0,nHQ:0};
  let nHQ=Math.floor(cbm/p.cbmHQ), resto=cbm-nHQ*p.cbmHQ, n20=0, n40=0;
  if (resto>1e-9){
    if (resto<=p.cbm20) n20=1;
    else if (resto<=p.cbm40) n40=1;
    else nHQ+=1;
  }
  return {n20,n40,nHQ};
}

function costoCobro(p){
  const f=1+p.iva, cr=1+p.iva*p.ivaComisionEsCosto;
  const transf=p.descTransf+f*(1-p.descTransf)*(p.comTransf+p.comPlataforma)*cr;
  const unPago=f*(p.comChk+p.comPlataforma)*cr;
  const cuotas=f*(p.comChk+p.com3Cuotas+p.comPlataforma)*cr;
  const mixCuotas=Math.max(0,1-p.mixTransf-p.mixUnPago);
  return {transf,unPago,cuotas,mixCuotas,
    total:p.mixTransf*transf+p.mixUnPago*unPago+mixCuotas*cuotas};
}

function calcular(pedido,cat,parBase,aranceles){
  const AR=aranceles||{};
  const p=Object.assign({},parBase,pedido.par||{});
  const by=Object.fromEntries(cat.map(x=>[x.codigo,x]));
  const items=(pedido.items||[]).map(it=>{
    const pr=by[it.codigo]||{}, cant=Number(it.cant)||0;
    return {codigo:it.codigo, cant,
      desc:pr.desc||it.codigo, subcat:pr.subcat||"", prov:pr.prov||"",
      foto:pr.foto, medidas:pr.medidas||"", material:pr.material||"",
      fobU:Number(pr.fob)||0, cbmU:Number(pr.cbm)||0, moq:Number(pr.moq)||0,
      markupManual:it.markupManual==null?null:Number(it.markupManual),
      precioARS:Number(it.precioARS)||0,
      fobT:(Number(pr.fob)||0)*cant, cbmT:(Number(pr.cbm)||0)*cant};
  });

  const cbm=items.reduce((a,b)=>a+b.cbmT,0);
  const fob=items.reduce((a,b)=>a+b.fobT,0);
  const unidades=items.reduce((a,b)=>a+b.cant,0);

  const c=contenedores(cbm,p), nCont=c.n20+c.n40+c.nHQ;
  const capacidad=c.n20*p.cbm20+c.n40*p.cbm40+c.nHQ*p.cbmHQ;
  const flete=c.n20*p.flete20+c.n40*p.flete40+c.nHQ*p.fleteHQ+(+p.origenUSD||0)+(+p.fleteInterno||0)+(+p.consolidacion||0);
  const sobra=capacidad>0&&cbm>capacidad?cbm-capacidad:0;
  const ocupacion=capacidad>0?cbm/capacidad:0;

  const despachoFijo=p.despachoFijo+p.verificacion+(p.terminal+p.transporte+p.descarga)*nCont;
  const fiscal=p.diasFiscal>0?(cbm*p.almacenajeDia*p.diasFiscal+p.resguardo):0;
  const seguro=fob*p.seguroPct, honorarios=fob*p.honorariosPct, cif=fob+flete+seguro;
  /* comisión del agente de compra (ej. Lester): % sobre el FOB, se reparte por valor */
  const comCompra=fob*(+p.comisionCompra||0);

  let arancel=0;
  items.forEach(it=>{
    const sc=cbm>0?it.cbmT/cbm:0, sf=fob>0?it.fobT/fob:0;
    it.cifT=it.fobT+flete*sc+seguro*sf;
    it.arancelTasa=AR[it.subcat]!=null?AR[it.subcat]:ARANCEL_DEF;
    it.arancelT=it.cifT*it.arancelTasa;
    arancel+=it.arancelT;
  });

  const subtotal=fob+flete+seguro+despachoFijo+honorarios+fiscal+arancel+comCompra;
  const imprevistos=subtotal*p.imprevistos;
  const costoFinal=subtotal+imprevistos;

  const baseIva=cif+arancel;
  const creditoIva=baseIva*(p.iva+p.percepIva);
  const percepGanancias=baseIva*p.percepGan;
  const creditoTotal=creditoIva+percepGanancias;
  const desembolso=costoFinal+creditoTotal;

  const cc=costoCobro(p);
  // gastos que escalan con el precio de cada unidad
  const gvar=cc.total+p.iibb+p.marketing+p.entrega+p.garantia+p.comisionVenta;

  items.forEach(it=>{
    const sc=cbm>0?it.cbmT/cbm:0, sf=fob>0?it.fobT/fob:0;
    const sub=it.fobT+flete*sc+seguro*sf+despachoFijo*sc+honorarios*sf+fiscal*sc+it.arancelT+comCompra*sf;
    it.costoT=sub*(1+p.imprevistos);
    it.costoU=it.cant>0?it.costoT/it.cant:0;
    it.desembolsoU=it.cant>0?(it.costoT+creditoTotal*sc)/it.cant:0;
    it.almacenajeU=it.cbmU*p.galponMes*p.meses*p.factorStock;

    /* precio sugerido = el que cubre TODOS los costos (producto, cobro/cuotas, IIBB, marketing, envío, garantía,
       galpón y Ganancias) y deja el retorno mínimo. Si hay un markup manual cargado, manda ese. */
    it.minSinPerder=(it.costoU+it.almacenajeU)/(1-gvar);
    it.minObjetivo=(p.retornoMinProd*it.desembolsoU/(1-p.ganancias)+it.costoU+it.almacenajeU)/(1-gvar);
    const mk=it.markupManual!=null?it.markupManual:null;
    it.sugeridoUsd=mk!=null?it.costoU*(1+mk):it.minObjetivo;
    it.markupUsado=it.costoU>0?it.sugeridoUsd/it.costoU-1:0;
    it.sugeridoARS=Math.ceil(it.sugeridoUsd*(1+p.iva)*p.tc/1000)*1000;

    it.precioUsd=it.precioARS>0?it.precioARS/(1+p.iva)/p.tc:it.sugeridoUsd;
    it.precioARSef=it.precioARS>0?it.precioARS:it.sugeridoARS;
    it.precioContadoARS=it.precioARSef*(1-p.descTransf);
    it.markupImp=it.costoU>0?it.precioUsd/it.costoU-1:null;
    it.margenU=it.precioUsd-it.costoU;
    it.margenPct=it.precioUsd>0?it.margenU/it.precioUsd:null;
    it.ventaT=it.precioUsd*it.cant;
    it.margenT=it.margenU*it.cant;
    const antesImp=it.margenU-it.precioUsd*gvar-it.almacenajeU;it.netoU=antesImp-Math.max(0,antesImp)*p.ganancias;
    it.netoT=it.netoU*it.cant;
    it.retorno=it.desembolsoU>0?it.netoU/it.desembolsoU:null;
    it.cobradoU=it.precioUsd*(1-cc.total);
    it.minSinPerder=(it.costoU+it.almacenajeU)/(1-gvar);
    it.minObjetivo=(p.retornoMinProd*it.desembolsoU/(1-p.ganancias)+it.costoU+it.almacenajeU)/(1-gvar);
    it.minSinPerderARS=it.minSinPerder*(1+p.iva)*p.tc;
    it.minObjetivoARS=it.minObjetivo*(1+p.iva)*p.tc;
    it.bajoMoq=it.moq>0&&it.cant>0&&it.cant<it.moq;
    it.alerta = it.precioUsd<=0 ? null
      : it.precioUsd < it.minSinPerder ? "bad"
      : (it.retorno!=null && it.retorno < p.retornoMinProd) ? "warn"
      : (it.margenPct!=null && it.margenPct < p.margenMinProd) ? "warn" : "ok";
  });

  const venta=items.reduce((a,b)=>a+b.ventaT,0);
  const margenBruto=venta-costoFinal;
  const markupEfectivo=costoFinal>0?venta/costoFinal-1:0;
  const margenPctPrecio=venta>0?margenBruto/venta:0;

  const galpon=cbm*p.galponMes*p.meses*p.factorStock;
  const recepcion=(p.recepcionARS+p.movimientoARS*cbm*p.vecesMov)/p.tc;
  const ventasEst=p.unidPorVenta>0?unidades/p.unidPorVenta:0;

  const g={
    merma:-costoFinal*p.merma,
    liquidacion:-(venta*p.pctLiquidado*p.descLiquidacion+costoFinal*p.pctNoVendido),
    marketing:-venta*p.marketing,
    entrega:-venta*p.entrega,
    comisionVenta:-venta*p.comisionVenta,
    estructura:-(p.estructuraMes*p.pctEstructura*p.meses),
    web:-(p.webARS/p.tc)*p.meses,
    prepPedidos:-(p.prepPedidos*ventasEst/p.tc),
    seguroDeposito:-p.seguroDeposito,
    cobro:-venta*cc.total,
    garantia:-venta*p.garantia
  };
  const gastos=Object.values(g).reduce((a,b)=>a+b,0);
  const iibbVenta=venta*p.iibb;
  const baseImponible=margenBruto-iibbVenta-galpon-recepcion+gastos;
  const impGanancias=Math.max(0,baseImponible)*p.ganancias;

  const diaNac=p.produccion+p.transito+p.nacionalizacion;
  const diasAcred=Math.round((1-p.mixTransf)*18);
  const diaVenta=Math.round(diaNac+p.meses*30.42);
  const diaCobro=diaVenta+diasAcred;
  const flujo=[
    {dia:0,c:"Anticipo al proveedor",m:-fob*p.anticipo},
    {dia:p.produccion,c:comCompra?"Saldo al proveedor + comisión del agente":"Saldo al proveedor",m:-fob*(1-p.anticipo)-comCompra},
    {dia:p.produccion,c:"Flete + seguro",m:-(flete+seguro)},
    {dia:diaNac,c:"Despacho, terminal, honorarios",m:-(despachoFijo+honorarios)},
    {dia:diaNac,c:"Aranceles",m:-arancel},
    {dia:diaNac,c:"IVA + percepciones (recuperable)",m:-creditoTotal},
    {dia:diaNac,c:"Depósito fiscal + imprevistos",m:-(fiscal+imprevistos)},
    {dia:diaNac+7,c:"Recepción en fulfillment",m:-recepcion},
    {dia:diaVenta,c:"Alquiler de galpón (toda la rotación)",m:-galpon},
    {dia:diaCobro,c:"Cobro de las ventas c/IVA",m:venta*(1+p.iva)},
    {dia:diaCobro,c:"IVA débito que volcás",m:-venta*p.iva},
    {dia:diaCobro,c:"Recupero del crédito fiscal",m:creditoTotal},
    {dia:diaCobro,c:"IIBB sobre la venta",m:-iibbVenta},
    {dia:diaCobro,c:"Gastos operativos y de venta",m:gastos}
  ];
  let saldo=0; flujo.forEach(f=>{saldo+=f.m; f.saldo=saldo;});
  const pico=Math.abs(Math.min(0,...flujo.map(f=>f.saldo)));
  const cajaFinal=saldo, resultado=cajaFinal-impGanancias;
  const ciclo=diaVenta, retorno=pico>0?resultado/pico:0;
  const anualizado=(ciclo+diasAcred)>0?retorno*365/(ciclo+diasAcred):0;

  const debitoIva=venta*p.iva;
  const saldoIva=creditoIva-debitoIva;
  const markupMinIva=costoFinal>0?creditoIva/p.iva/costoFinal-1:0;
  const costoOport=pico*p.costoOportunidad*(ciclo+diasAcred)/365;
  const rotacionInv=(cbm>0&&costoFinal>0)?margenBruto/(costoFinal*p.factorStock):0;

  return {p,items,cbm,fob,unidades,cont:c,nCont,capacidad,ocupacion,flete,
    despachoFijo,fiscal,seguro,honorarios,cif,arancel,imprevistos,costoFinal,
    creditoIva,percepGanancias,creditoTotal,desembolso,
    venta,margenBruto,markupEfectivo,margenPctPrecio,
    sobra,galpon,recepcion,ventasEst,g,gastos,iibbVenta,baseImponible,impGanancias,
    flujo,pico,cajaFinal,resultado,ciclo,diaCobro,retorno,anualizado,cc,gvar,
    debitoIva,saldoIva,markupMinIva,diaNac,diasAcred,costoOport,rotacionInv};
}

/* Alertas del pedido (sección 6), de más grave a menos */
function alertasPedido(r){
  const p=r.p,A=[];
  if(r.sobra>0)A.push({g:'bad',t:`El pedido no entra: ${r.cbm.toFixed(2).replace('.',',')} m³ en ${r.capacidad.toFixed(0)} m³ contratados (${Math.round(r.ocupacion*100)}%). Sobran ${r.sobra.toFixed(2).replace('.',',')} m³: sacá productos en la pestaña Productos (ordená por "m³ por US$ de margen").`});
  if(r.cbm>0){const c=contenedores(r.cbm,p);const exceso=r.cbm-Math.floor(r.cbm/p.cbmHQ)*p.cbmHQ;
    if(c.nHQ+c.n40+c.n20>1&&exceso>1e-9&&exceso<=p.cbm20*0.25){const f=c.n20?p.flete20:c.n40?p.flete40:p.fleteHQ,tA=r.cif>0?r.arancel/r.cif:ARANCEL_DEF;r._desborde=true;
      A.push({g:'bad',t:`El volumen se pasó del contenedor por ${exceso.toFixed(2).replace('.',',')} m³ y estás pagando otro contenedor entero (unos US$ ${Math.round((f*(1+tA)+p.terminal+p.transporte+p.descarga)*(1+p.imprevistos)).toLocaleString('es-AR')} más). Sacá ${exceso.toFixed(2).replace('.',',')} m³ y entra en uno.`})}}
  const moq=r.items.filter(i=>i.bajoMoq);if(moq.length)A.push({g:'bad',t:`${moq.length} producto${moq.length>1?'s':''} abajo del mínimo del proveedor: ${moq.map(i=>`${i.codigo} (${i.cant} de ${i.moq})`).join(', ')}.`});
  const bad=r.items.filter(i=>i.alerta==='bad');if(bad.length)A.push({g:'bad',t:`${bad.length} producto${bad.length>1?'s':''} con precio abajo del mínimo para no perder: ${bad.map(i=>i.codigo).join(', ')}.`});
  if(!r._desborde&&r.capacidad>0&&r.ocupacion<0.85)A.push({g:'warn',t:`El contenedor va al ${Math.round(r.ocupacion*100)}%: hay ${(r.capacidad-r.cbm).toFixed(1).replace('.',',')} m³ libres que ya estás pagando.`});
  const w=r.items.filter(i=>i.alerta==='warn');if(w.length)A.push({g:'warn',t:`${w.length} producto${w.length>1?'s':''} no llegan al retorno mínimo (${Math.round(p.retornoMinProd*100)}%) o al margen mínimo (${Math.round(p.margenMinProd*100)}%): ${w.map(i=>i.codigo).join(', ')}.`});
  if(!p.pctLiquidado&&!p.pctNoVendido)A.push({g:'warn',t:'Liquidación y no vendido están en cero: es el supuesto más optimista posible (se vende todo a precio lleno).'});
  if(!p.estructuraMes)A.push({g:'warn',t:'Estructura por mes está en cero: el resultado no está pagando tu trabajo.'});
  return A;
}
if(typeof module!=='undefined')module.exports={calcular,costoCobro,contenedores,alertasPedido,PAR_DEF,SUBCATS,ARANCEL_DEF};
