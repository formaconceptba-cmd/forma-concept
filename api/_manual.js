// Manual del panel: lo usa el asistente (api/asistente.js). Mantenerlo igual a lo que muestra el panel.
export const MANUAL = `
CÓMO ESTÁ ARMADO EL NEGOCIO
FORMA Concept vende muebles de diseño. La mayoría se importa de China en contenedores (proveedores Baicheng y Rudi, entre otros) y se vende en preventa en la web formaconceptba.com. También hay productos nacionales fabricados en Buenos Aires. Razón social: DEL GRUPPO S.R.L. El depósito y los envíos los hace Pailos (Lanús).
Recorrido de un producto: se cotiza al proveedor (planilla RFQ) → entra al Maestro de productos → se suma a un contenedor → se le pone precio de venta → se publica en la tienda → se vende → se factura → se despacha.

MENÚ DEL PANEL (pantalla por pantalla)
- Inicio → Inicio: todo el negocio en detalle (ventas, ganancia, márgenes, anuncios, medios de pago, contenedores).
- Inicio → Resumen: vista rápida estilo app de Shopify (en vivo, ventas, pedidos, "Tu actividad" con lo que hay que hacer hoy, últimos pedidos). La app del celular arranca acá.
- Inicio → Cómo funciona todo: el recorrido completo en 10 pasos (cotizar → colores y cajas → borrador del contenedor → proforma final → costos extra y pagos → precio → publicar → vender → recibir → despachar), qué manda en cada cosa, qué es manual y qué automático, y cómo le llega a Pailos.
- Alertas / pendientes: todo lo que necesita una acción. Cada alerta se toca y abajo explica qué hacer para resolverla.
- Estadísticas → Anuncios por campaña: cuánto se vendió por cada campaña de anuncios (Meta, Google). Necesita los tokens de Meta y GA4 cargados.
- Ventas → Lista de ventas: todos los pedidos de la web. Estados: pendiente (sin pagar), pagado, en camino, entregado, cancelado. Las transferencias se confirman acá a mano (al marcar "pagado" se manda el mail y se encola la factura). Los pedidos sin pagar se cancelan solos pasado el plazo. Desde un pedido se registra una devolución.
- Ventas → Facturas: facturas electrónicas de ARCA (Factura B a consumidor final y notas de crédito). Se emiten solas cuando un pedido pasa a pagado; si ARCA falla reintentan solas. Mientras ARCA está en "modo prueba" no se emite nada real. La Factura A se hace a mano por fuera y se puede registrar con "Cargar emitida a mano". Abajo están los datos que salen impresos (domicilio, IIBB, inicio de actividades).
- Ventas → Ventas a profesionales: pedidos de estudios y profesionales con precio especial.
- Productos → Lista de productos: lo que se ve en la tienda: nombre, fotos, precio, colores, si está publicado y si es destacado.
- Productos → Productos nacionales: los fabricados en Argentina; se marca si están en stock, a pedido o sin stock.
- Productos → Inventario (Pailos): stock en el depósito, contado por caja (un producto puede venir en varias cajas). Se puede importar el conteo de Pailos para comparar.
- Productos → Colores: paleta de colores FORMA y su equivalencia con el código de color de cada proveedor.
- Clientes → Lista de clientes: quién compró y cuánto.
- Clientes → Profesionales: cuentas de arquitectos/estudios; se aprueban los pedidos de acceso.
- Clientes → Mayoristas: cuentas mayoristas.
- Descuentos → Precios profesionales: el descuento o precio especial por producto para profesionales.
- Marketing → Mails a clientes: los textos de los mails automáticos (confirmación, pago, factura, despacho…). Se pueden editar.
- Tienda online → FRM Studio: los proyectos del estudio que aparecen en la web.
- Tienda online → Fotos de la página: cambiar las fotos grandes de la web (portada, bandas, estudio).
- Importación → Maestro de productos: la base de TODOS los productos cotizados a proveedores, con FOB (precio en origen, en US$, siempre por pieza), m³ por pieza, packing (cuántas piezas por caja o cuántas cajas por producto, medidas y peso de cada caja), MOQ (mínimo de compra), medidas, material y estado. De acá salen los contenedores y la tienda.
  Botones del Maestro:
  · "+ Nuevo producto": cargar a mano un producto cotizado. El código se arma solo (prefijo de la subcategoría + número + proveedor, ej. SIL-MAD-187-BAI). Tildando "Agregarlo también a la tienda" se crea también la ficha de la web.
  · "Importar cotización": subir el Excel que devolvió el proveedor (la planilla RFQ completa). Paso 1 elegís proveedor y archivo, paso 2 revisás qué columna es cada dato (queda guardado para la próxima vez de ese proveedor), paso 3 ves la vista previa: los productos nuevos se dan de alta y los que ya existen (por código FORMA o código del proveedor) se actualizan (FOB, m³, MOQ, peso, medidas, packing) y queda registrado en el historial.
  · "Exportar el Maestro": baja todo el Maestro a Excel.
  · "Plantilla RFQ": arma el Excel para pedirle precio a un proveedor (RFQ = pedido de cotización). Si antes filtraste productos, salen precargados con su código FORMA, medidas y material, una hoja por subcategoría; si no, sale vacía. Las celdas naranjas son las claves que el proveedor no puede dejar vacías (material, m³, piezas por caja, armado/desarmado). Cuando el proveedor la devuelve completa, se sube con "Importar cotización".
  · "Últimos cambios": historial de qué cambió en el Maestro (FOB, m³, packing) y desde dónde.
  · "Mandar respaldo ahora": manda por mail una copia de toda la base (también sale sola todos los lunes).
  · Las alertas ⚠ V1–V4 marcan productos cuyo m³, packing o medidas no cierran (por ejemplo, m³ de la caja cargado como si fuera de una pieza).
- Importación → Contenedores: cada contenedor (pedido de importación). Pestañas:
  · Tablero: el resumen para decidir: cuánta plata hay que poner (pico), cuánto queda al final y cuánto rinde por año. No se edita.
  · Orden de compra y proformas: se suben las proformas de cada fábrica (respaldo) y la PROFORMA FINAL (la que manda, ej. la de PRE/Lester "PRE_PI_Del_Gruppo_CONCEPT01"). Si la proforma trae una línea por color (SKU de venta, ej. MES-163-BLA), "Revisar y aplicar" actualiza de una vez: cantidades, FOB y m³ por producto del contenedor; las cajas de "Ingreso y packing list" (calculadas con las piezas por caja de cada color: es el packing list para Pailos y el stock "en camino" de la tienda); y los renglones sin código (ej. "Inland transport", el flete de Rudi hasta Baicheng) van a "Flete interno hasta el puerto". Antes de aplicar muestra una vista previa: en amarillo lo que no cierra (un color que no existe en el panel, por ejemplo SIL-008-BOR cuando en el panel está SIL-008-CAF: se elige en el desplegable o se crea con + Color; un color sin cajas cargadas; cajas que no suman lo mismo que la proforma). Si la proforma no trae colores, se lee por producto como antes.
  · Costos extra del pedido (arriba, en la pestaña Productos): flete interno hasta el puerto, consolidación, otros en origen (se suman al flete y se reparten por m³) y comisión del agente de compra en % del FOB (ej. Lester 4,5%: se reparte por valor y en Caja se paga junto con el saldo).
  · Productos: qué viene en el contenedor. Los productos entran de dos formas: aplicando la orden de compra (lo normal) o sumándolos a mano desde el buscador (sirve para armar el borrador antes de tener la orden). Ahí se pueden corregir cantidad, m³ y FOB por pieza: valen sólo para ese contenedor; el Maestro no cambia.
  · Precios: precio de venta de cada producto y margen. Desde ahí se pasan los precios a la tienda.
  · Costos: cómo se arma el costo puesto en el galpón (FOB + flete repartido por m³ + seguro + aduana + impuestos + gastos).
  · Caja: mes a mes cuándo sale y entra la plata; se cargan los pagos reales (anticipo 30%, saldo 70%, flete, despacho).
  · Ingreso y packing list: las cajas físicas que llegan, por SKU de caja. Arma el packing list para Pailos y, al pasar el contenedor a "Recibido", las cajas entran al stock.
  · Real: lo que pasó de verdad contra lo proyectado (ventas, cobros, lo que quedó).
  Estados del contenedor: Borrador → Confirmado → En tránsito → Recibido → Cerrado. Al pasar a Recibido se congela la proyección.
- Importación → Órdenes a proveedores: armar órdenes de compra y ver todas las proformas y órdenes recibidas, por proveedor.
- Importación → Parámetros de importación: tipo de cambio, fletes y capacidad de cada contenedor, seguro, despachante, impuestos, galpón. Afectan los cálculos de todos los contenedores.
- Configuración → Precios y medios de pago: reglas de precio de la tienda (preventa, descuento por transferencia, cuotas).
- Configuración → Envíos y retiro: costos y zonas de envío, retiro en Lanús.

CÓMO SE HACE…
- Dar de alta un producto nuevo de importación: 1) Importación → Maestro de productos → "Plantilla RFQ" y mandarla al proveedor. 2) Cuando vuelve, "Importar cotización" (o "+ Nuevo producto" si es uno solo). 3) Sumarlo a un contenedor (Importación → Contenedores → Productos). 4) Definir el precio (pestaña Precios) y pasarlo a la tienda. 5) En Productos → Lista de productos cargar fotos y colores y publicarlo.
- Confirmar una transferencia: Ventas → Lista de ventas → abrir el pedido → marcar pagado. Sale el mail al cliente y se encola la factura.
- Cancelar o registrar una devolución: desde el pedido. Si ya estaba facturado sale sola la nota de crédito.
- Cargar la orden final de un contenedor: Importación → Contenedores → elegir el contenedor → "Orden de compra y proformas" → subir el Excel como "Orden de compra final" → "Revisar y aplicar" → revisar la vista previa → "Aplicar al contenedor".
- Cambiar una foto de la web: Tienda online → Fotos de la página.
- Variables y claves de Vercel (ANTHROPIC_API_KEY, ARCA_KEY_HOMO, ARCA_KEY_PROD, ARCA_ENV): se cargan en vercel.com → proyecto forma-concept → Settings → Environment Variables, y después Redeploy. Las claves las carga Franco, nunca se pasan por chat.

GLOSARIO
FOB: precio del producto puesto en el puerto de origen, en US$. CBM / m³: volumen. MOQ: cantidad mínima de compra. PI / proforma: presupuesto formal del proveedor. OC: orden de compra. RFQ: pedido de cotización. KD: viene desarmado. CAE: número que da ARCA a cada factura válida. NC: nota de crédito. 40HQ: contenedor de 40 pies alto (~68 m³ útiles). Preventa: se vende antes de que llegue el contenedor.
`;
