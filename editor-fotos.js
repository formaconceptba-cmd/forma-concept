/* ---------- Tienda online → Fotos de la página: editor visual ----------
   Muestra la tienda real adentro del panel (compu o celular). Cada foto que se puede cambiar tiene un botón
   "Cambiar foto": elegís la imagen y queda publicada al instante. La vista "Lista de fotos" (la de antes) sigue
   para elegir el encuadre o volver a la foto original. */
(function(){
/* lugares de foto al día con la página actual */
if(typeof SLOTS!=='undefined'){SLOTS.splice(0,SLOTS.length,
 ['Inicio',[['inicio_portada','Portada','ctx_pause'],['inicio_acero','Cuadro Colección Acero','hv_acanalada60'],['inicio_fresno','Cuadro Colección Fresno (en la compu)','fresno-comedor']]],
 ['Categorías del inicio',[['cat_Sillas','Sillas','MC-282'],['cat_Sillones','Sillones','C537'],['cat_Mesas','Mesas','1021T1.35'],['cat_Mesas bajas','Mesas bajas','102E1.0'],['cat_Bancos','Bancos','WS-035']]],
 ['FRM Studio en el inicio (carrusel)',[['estudio_1','Foto 1','std_06'],['estudio_2','Foto 2','std_02'],['estudio_3','Foto 3','std_11'],['estudio_4','Foto 4','std_05'],['estudio_5','Foto 5','prj_cocina-acero'],['estudio_6','Foto 6','std_hero']]],
 ['Página FRM Studio',[['frm_portada','Portada','std_hero']]],
 ['Página Productos nacionales',[['nacional_1','Foto grande','nac_1'],['nacional_2','Foto 2','nac_2'],['nacional_3','Foto 3','nac_3']]],
 ['Página Profesionales',[['profesionales_1','Foto principal','prj_obra-fachada'],['profesionales_2','Foto de proyecto a medida','std_14']]],
 ['Pago',[['embalaje','Foto del embalaje ("Cómo te llega")','pack']]])}
let FV={modo:'visual',pag:'',ancho:'compu'};
const PAGS=[['','Inicio'],['#frm','FRM Studio'],['#nacional','Productos nacionales'],['#proyectos','Profesionales']];
if(typeof drawFotos==='function'){const _df=drawFotos;drawFotos=async function(){
  const tabs=`<div class="bar" style="gap:6px;margin-bottom:12px"><button class="btn ${FV.modo==='visual'?'dk':''}" data-fvm="visual">Editar sobre la página</button><button class="btn ${FV.modo==='lista'?'dk':''}" data-fvm="lista">Lista de fotos (encuadre y volver a la original)</button></div>`;
  if(FV.modo==='lista'){await _df.apply(this,arguments);$('#m').insertAdjacentHTML('afterbegin',tabs)}
  else{
    $('#m').innerHTML=`${tabs}<div class="card pad" style="margin-bottom:10px"><div class="bar" style="margin:0;gap:6px;flex-wrap:wrap"><span class="hint" style="margin-right:4px">Página:</span>${PAGS.map(([h,l])=>`<button class="btn ${FV.pag===h?'dk':''}" data-fvp="${h}">${l}</button>`).join('')}<span class="sp"></span><button class="btn ${FV.ancho==='compu'?'dk':''}" data-fva="compu">Compu</button><button class="btn ${FV.ancho==='cel'?'dk':''}" data-fva="cel">Celular</button><button class="btn" id="fvrl">Recargar</button></div>
     <p class="hint" style="margin:8px 0 0">Bajá por la página como en la web. Cada foto que se puede cambiar tiene un botón azul <b>"Cambiar foto"</b>: tocalo, elegí la imagen y queda publicada al instante. Las fotos de productos se cambian en Productos, y las de los proyectos, en FRM Studio.</p></div>
     <div class="fv-wrap ${FV.ancho}"><iframe id="fvif" src="/?editar=1&notrack=1&v=${Date.now()}${FV.pag}" title="Vista de la tienda para editar fotos"></iframe></div>`;
    const m=$('#m');
    m.querySelectorAll('[data-fvp]').forEach(b=>b.onclick=()=>{FV.pag=b.dataset.fvp;drawFotos()});
    m.querySelectorAll('[data-fva]').forEach(b=>b.onclick=()=>{FV.ancho=b.dataset.fva;drawFotos()});
    m.querySelector('#fvrl').onclick=()=>{const f=m.querySelector('#fvif');f.src=f.src.replace(/v=\d+/,'v='+Date.now())};
  }
  $('#m').querySelectorAll('[data-fvm]').forEach(b=>b.onclick=()=>{FV.modo=b.dataset.fvm;drawFotos()});
}}
document.head.insertAdjacentHTML('beforeend',`<style>
.fv-wrap{background:#e9e9ea;border-radius:12px;padding:10px;display:flex;justify-content:center}
.fv-wrap iframe{width:100%;height:calc(100vh - 250px);min-height:520px;border:0;background:#fff;border-radius:6px}
.fv-wrap.cel iframe{width:390px;height:780px}
</style>`);
})();
