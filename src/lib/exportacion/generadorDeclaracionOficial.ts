/**
 * GENERADOR DE DECLARACIÓN OFICIAL ANA
 * Genera documentos compatibles con formato real SIGA
 * Basado en documentos oficiales ANA 2025
 */

import { Liquidacion, FacturaComercial } from '@/types/aduanas';
import { ManifestRow } from '@/types/manifest';
import {
  DeclaracionOficial,
  CabeceraDeclaracion,
  DatosTransporte,
  SujetosIntervinientes,
  ArticuloDeclaracion,
  TotalesDeclaracion,
  BoletaPago,
  EscenariosPagoANA,
  CONSTANTES_ANA,
  generarNumeroDeclaracion,
  generarNumeroControlBoleta,
  calcularVencimientosANA,
  formatearFechaANA,
  formatearFraccionArancelaria,
  formatearIdentificacion,
  formatearPesoANA,
  formatearTarifaANA,
  detectarAutoridadPorCapitulo
} from '@/types/declaracionOficial';
import { calcularImpuestosArticulo } from '@/lib/liquidacion/calculadoraOficial';

// ============================================
// INTERFACES DE ENTRADA
// ============================================

export interface DatosParaDeclaracion {
  liquidaciones: Liquidacion[];
  paquetes: ManifestRow[];
  facturas?: FacturaComercial[];
  mawb: string;                         // Conocimiento madre
  hawb: string;                         // Conocimiento hijo
  
  // Datos del importador
  importador: {
    nombre: string;
    identificacion: string;             // RUC o Cédula
    tipo_persona: 'Persona Natural' | 'Persona Jurídica';
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  
  // Datos del corredor
  corredor: {
    codigo: string;                     // Ej: "190"
    nombre: string;                     // Ej: "XIOMARA ROSA CANO"
  };
  
  // Datos de transporte
  consignante?: string;                 // AMAZON
  zona_recinto?: string;                // GIRAG PANAMA, S.A.
  peso_bruto_total_kgs?: number;
  bultos_declarados?: number;
  fecha_conocimiento?: Date;
  
  // Configuración
  aduana?: string;
  via_transporte?: string;
  tipo_despacho?: string;
}

// ============================================
// GENERADOR PRINCIPAL
// ============================================

export function generarDeclaracionOficial(
  datos: DatosParaDeclaracion,
  secuencial: number = 1
): DeclaracionOficial {
  const fechaRegistro = new Date();
  const numeroDeclaracion = generarNumeroDeclaracion(secuencial);
  
  // 1. Generar cabecera
  const cabecera = generarCabecera(fechaRegistro, datos, numeroDeclaracion);
  
  // 2. Generar datos de transporte
  const transporte = generarDatosTransporte(datos, fechaRegistro);
  
  // 3. Generar sujetos intervinientes
  const sujetos = generarSujetos(datos);
  
  // 4. Generar artículos (detalle de mercancía)
  const articulos = generarArticulos(datos.liquidaciones, datos.paquetes, datos.facturas);
  
  // 5. Calcular totales
  const totales = calcularTotales(articulos, fechaRegistro);
  
  return {
    cabecera,
    transporte,
    sujetos,
    articulos,
    totales,
    numero_predeclaracion: `${numeroDeclaracion} 0`,
    cantidad_articulos: articulos.length,
    observacion: datos.mawb,
    documentos_apoyo: generarCodigoDocumentos(),
    metadata: {
      version: '2.0',
      generado_por: 'IPL Customs AI - Pasar Express',
      fecha_generacion: new Date().toISOString(),
      pagina_actual: 1,
      total_paginas: Math.ceil(articulos.length / 6)
    }
  };
}

// ============================================
// GENERADORES DE SECCIONES
// ============================================

function generarCabecera(
  fecha: Date,
  datos: DatosParaDeclaracion,
  numeroDeclaracion: string
): CabeceraDeclaracion {
  return {
    declaracion_numero: numeroDeclaracion,
    fecha_registro: formatearFechaANA(fecha),
    tipo_operacion: 'Importación Directa del Exterior',
    tipo_despacho: (datos.tipo_despacho as CabeceraDeclaracion['tipo_despacho']) || 'Normal',
    aduana_entrada: (datos.aduana as CabeceraDeclaracion['aduana_entrada']) || 'AEROPUERTO CARGA TOCUMEN, PANAMA',
    via_transporte: (datos.via_transporte as CabeceraDeclaracion['via_transporte']) || 'Aereo',
    procedencia_destino: 'ESTADOS UNIDOS DE NORTEAMERICA'
  };
}

function generarDatosTransporte(datos: DatosParaDeclaracion, fechaRegistro: Date): DatosTransporte {
  const pesoBruto = datos.peso_bruto_total_kgs || 
    datos.paquetes.reduce((sum, p) => sum + (p.weight || 0) * 0.453592, 0);
  
  return {
    tipo_conocimiento: 'CAH',
    fecha_conocimiento: datos.fecha_conocimiento 
      ? formatearFechaANA(datos.fecha_conocimiento)
      : formatearFechaANA(new Date(fechaRegistro.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7 días antes
    mawb_madre: datos.mawb.replace(/-/g, ''),
    hawb_hijo: datos.hawb,
    utilizacion_conocimiento: 'Total',
    peso_bruto_total_kgs: parseFloat(formatearPesoANA(pesoBruto)),
    bultos_declarados: datos.bultos_declarados || datos.paquetes.length,
    zona_recinto: datos.zona_recinto || CONSTANTES_ANA.RECINTOS.GIRAG,
    consignante: datos.consignante || 'AMAZON'
  };
}

function generarSujetos(datos: DatosParaDeclaracion): SujetosIntervinientes {
  return {
    importador: {
      nombre: datos.importador.nombre.toUpperCase(),
      identificacion: formatearIdentificacion(datos.importador.identificacion),
      tipo_persona: datos.importador.tipo_persona,
      direccion: datos.importador.direccion,
      telefono: datos.importador.telefono,
      email: datos.importador.email
    },
    corredor_aduana: {
      codigo: datos.corredor.codigo,
      nombre: datos.corredor.nombre.toUpperCase(),
      nombre_completo: `${datos.corredor.codigo} - ${datos.corredor.nombre.toUpperCase()}`
    }
  };
}

function generarArticulos(
  liquidaciones: Liquidacion[],
  paquetes: ManifestRow[],
  facturas?: FacturaComercial[]
): ArticuloDeclaracion[] {
  const articulos: ArticuloDeclaracion[] = [];
  
  liquidaciones.forEach((liq, idx) => {
    const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
    const factura = facturas?.find(f => f.numeroGuia === liq.numeroGuia);
    
    // Valores
    const valorFOB = liq.valorFOB;
    const valorFlete = liq.valorFlete;
    const valorSeguro = liq.valorSeguro > 0 
      ? liq.valorSeguro 
      : valorFOB * (CONSTANTES_ANA.SEGURO_TEORICO_PERCENT / 100);
    const valorCIF = valorFOB + valorFlete + valorSeguro;
    
    // Peso
    const pesoLbs = paquete?.weight || 0;
    const pesoKgs = pesoLbs * 0.453592;
    
    // Impuestos
    const impuestos = calcularImpuestosArticulo(
      valorFOB,
      valorFlete,
      valorSeguro,
      liq.percentDAI || 0,
      liq.percentISC || 0
    );
    
    // País origen
    const paisOrigen = factura?.paisOrigen || 'US';
    
    // Código Amazon
    const codigoRef = extraerCodigoAmazon(paquete?.trackingNumber || liq.numeroGuia);
    
    articulos.push({
      numero_articulo: idx + 1,
      fraccion_arancelaria: formatearFraccionArancelaria(liq.hsCode || ''),
      descripcion_arancelaria: liq.descripcionArancelaria || 'Los demás',
      especificacion_mercancia: (paquete?.description || liq.descripcionArancelaria || '').toUpperCase(),
      codigo_referencia: codigoRef,
      
      condicion_mercancia: 'NUEVO',
      regimen_fundamento: '01-00',
      pais_origen: paisOrigen,
      
      valor_fob: redondear2(valorFOB),
      valor_flete: redondear2(valorFlete),
      valor_seguro: redondear2(valorSeguro),
      valor_cif: redondear2(valorCIF),
      
      peso_bruto_kgs: redondear3(pesoKgs),
      peso_neto_kgs: redondear3(pesoKgs),
      
      cantidad: 1,
      unidad_medida: 'u',
      
      impuestos,
      
      acuerdos: {
        tipo: 'N.A.'
      }
    });
  });
  
  return articulos;
}

function calcularTotales(articulos: ArticuloDeclaracion[], fechaRegistro: Date): TotalesDeclaracion {
  // Sumar valores
  const valorFobTotal = articulos.reduce((sum, a) => sum + a.valor_fob, 0);
  const valorFleteTotal = articulos.reduce((sum, a) => sum + a.valor_flete, 0);
  const valorSeguroTotal = articulos.reduce((sum, a) => sum + a.valor_seguro, 0);
  const valorCifTotal = articulos.reduce((sum, a) => sum + a.valor_cif, 0);
  
  // Sumar impuestos
  const daiTotal = articulos.reduce((sum, a) => sum + a.impuestos.dai_a_pagar, 0);
  const itbmTotal = articulos.reduce((sum, a) => sum + a.impuestos.itbm_a_pagar, 0);
  const iscTotal = articulos.reduce((sum, a) => sum + a.impuestos.isc_a_pagar, 0);
  const iccdpTotal = articulos.reduce((sum, a) => sum + a.impuestos.iccdp_a_pagar, 0);
  
  // Tasa de sistema
  const tasaSistema = CONSTANTES_ANA.TASA_USO_SISTEMA;
  
  // Total a pagar
  const totalTributos = daiTotal + itbmTotal + iscTotal + iccdpTotal;
  const totalAPagar = redondear2(totalTributos + tasaSistema);
  
  // Calcular vencimientos
  const vencimientos = calcularVencimientosANA(fechaRegistro);
  vencimientos.normal.monto = totalAPagar;
  vencimientos.recargo_10_percent.monto = redondear2(totalAPagar * 1.10);
  vencimientos.recargo_20_percent.monto = redondear2(totalAPagar * 1.20);
  
  return {
    valor_fob_total: redondear2(valorFobTotal),
    valor_flete_total: redondear2(valorFleteTotal),
    valor_seguro_total: redondear2(valorSeguroTotal),
    valor_cif_total: redondear2(valorCifTotal),
    
    impuesto_importacion_total: redondear2(daiTotal),
    itbm_total: redondear2(itbmTotal),
    isc_total: redondear2(iscTotal),
    iccdp_total: redondear2(iccdpTotal),
    
    tasa_uso_sistema: tasaSistema,
    total_a_pagar: totalAPagar,
    
    recargo_5_percent: 0,
    recargo_50_percent: 0
  };
}

// ============================================
// GENERADOR DE BOLETA DE PAGO
// ============================================

export function generarBoletaPago(
  declaracion: DeclaracionOficial,
  secuencial: number = 1
): BoletaPago {
  const fechaImpresion = new Date();
  const vencimientos = calcularVencimientosANA(new Date(declaracion.cabecera.fecha_registro.split('/').reverse().join('-')));
  
  // Calcular montos
  const montoBase = declaracion.totales.total_a_pagar;
  vencimientos.normal.monto = montoBase;
  vencimientos.recargo_10_percent.monto = redondear2(montoBase * 1.10);
  vencimientos.recargo_20_percent.monto = redondear2(montoBase * 1.20);
  
  return {
    numero_control: generarNumeroControlBoleta(secuencial),
    fecha_impresion: formatearFechaANA(fechaImpresion),
    
    empresa_importador: declaracion.sujetos.importador.nombre,
    ruc: declaracion.sujetos.importador.identificacion,
    agente_corredor: declaracion.sujetos.corredor_aduana?.nombre || '',
    
    lineas: [{
      numero: 1,
      fecha_registro: declaracion.cabecera.fecha_registro,
      formulario: declaracion.cabecera.declaracion_numero,
      año: new Date().getFullYear(),
      sector_rectificacion: 0,
      monto_escenario_1: vencimientos.normal.monto,
      monto_escenario_2: vencimientos.recargo_10_percent.monto
    }],
    
    escenarios_pago: vencimientos,
    fecha_anulacion: vencimientos.recargo_10_percent.hasta_fecha
  };
}

// ============================================
// EXPORTADORES
// ============================================

/**
 * Exporta declaración a formato texto (similar al PDF)
 */
export function exportarDeclaracionTexto(declaracion: DeclaracionOficial): string {
  let texto = '';
  
  // Encabezado
  texto += '                                        REPUBLICA DE PANAMA\n';
  texto += '                                        AUTORIDAD NACIONAL DE ADUANAS\n';
  texto += '                                        DECLARACION\n\n';
  
  // Datos principales
  texto += `DECLARACION No.     ${declaracion.cabecera.declaracion_numero} 0\n`;
  texto += `FECHA:              ${declaracion.cabecera.fecha_registro}\n`;
  texto += `TIPO DE OPERACION:  ${declaracion.cabecera.tipo_operacion}\n\n`;
  
  // Importador
  texto += `IMPORTADOR/EXPORT:  ${declaracion.sujetos.importador.identificacion}    ${declaracion.sujetos.importador.nombre}\n`;
  texto += `TIPO IMPORT/EXPORT: ${declaracion.sujetos.importador.tipo_persona}\n`;
  texto += `CORREDOR:           ${declaracion.sujetos.corredor_aduana?.nombre_completo || ''}\n\n`;
  
  // Transporte
  texto += `VIA:                ${declaracion.cabecera.via_transporte}\n`;
  texto += `PROC/DESTINO:       ${declaracion.cabecera.procedencia_destino}\n`;
  texto += `DESEMB/EMBAR:       ${declaracion.cabecera.aduana_entrada}\n`;
  texto += `ZONA-RECINTO:       ${declaracion.transporte.zona_recinto}\n`;
  texto += `CONSIGNANTE:        ${declaracion.transporte.consignante}\n`;
  texto += `MADRE/PARTICULAR:   ${declaracion.transporte.mawb_madre}\n`;
  texto += `HIJO:               ${declaracion.transporte.hawb_hijo}\n`;
  texto += `PESO BRUTO (Kgs):   ${formatearPesoANA(declaracion.transporte.peso_bruto_total_kgs)}\n`;
  texto += `BULTOS DEC:         ${declaracion.transporte.bultos_declarados}\n\n`;
  
  // Totales cabecera
  texto += '═══════════════════════════════════════════════════════════════════\n';
  texto += `F.O.B               FLETE               SEGURO              C.I.F\n`;
  texto += `${declaracion.totales.valor_fob_total.toFixed(2).padStart(12)}    ${declaracion.totales.valor_flete_total.toFixed(2).padStart(12)}    ${declaracion.totales.valor_seguro_total.toFixed(2).padStart(12)}    ${declaracion.totales.valor_cif_total.toFixed(2).padStart(12)}\n\n`;
  
  texto += `IMP IMPORT/EXPORT   ITBM                ISC                 ICCDP\n`;
  texto += `${declaracion.totales.impuesto_importacion_total.toFixed(2).padStart(12)}    ${declaracion.totales.itbm_total.toFixed(2).padStart(12)}    ${declaracion.totales.isc_total.toFixed(2).padStart(12)}    ${declaracion.totales.iccdp_total.toFixed(2).padStart(12)}\n\n`;
  
  texto += `USO DEL SISTEMA     TOTAL A PAGAR\n`;
  texto += `${declaracion.totales.tasa_uso_sistema.toFixed(2).padStart(12)}    ${declaracion.totales.total_a_pagar.toFixed(2).padStart(12)}\n`;
  texto += '═══════════════════════════════════════════════════════════════════\n\n';
  
  // Artículos
  texto += 'ARTICULO  FRACCION ARANCELARIA    DESCRIPCION                           PAIS  FOB       FLETE     SEGURO    CIF\n';
  texto += '───────────────────────────────────────────────────────────────────────────────────────────────────────────────\n';
  
  declaracion.articulos.forEach(art => {
    texto += `${String(art.numero_articulo).padStart(3)}       ${art.fraccion_arancelaria}        ${art.especificacion_mercancia.substring(0, 35).padEnd(35)} ${art.pais_origen.padEnd(4)} ${art.valor_fob.toFixed(2).padStart(8)} ${art.valor_flete.toFixed(2).padStart(8)} ${art.valor_seguro.toFixed(2).padStart(8)} ${art.valor_cif.toFixed(2).padStart(8)}\n`;
    texto += `          ${art.descripcion_arancelaria.substring(0, 50)}\n`;
    if (art.codigo_referencia) {
      texto += `          ${art.codigo_referencia}\n`;
    }
    texto += `          IMPORT /: ${formatearTarifaANA(art.impuestos.dai_tarifa_percent)}%  $${art.impuestos.dai_a_pagar.toFixed(2)}   ITBM: ${formatearTarifaANA(art.impuestos.itbm_tarifa_percent)}%  $${art.impuestos.itbm_a_pagar.toFixed(2)}\n\n`;
  });
  
  texto += `\nPág. ${declaracion.metadata?.pagina_actual || 1} de ${declaracion.metadata?.total_paginas || 1}\n`;
  
  return texto;
}

/**
 * Exporta boleta a formato texto
 */
export function exportarBoletaTexto(boleta: BoletaPago): string {
  let texto = '';
  
  texto += '                    REPUBLICA DE PANAMA\n';
  texto += '                    AUTORIDAD NACIONAL DE ADUANAS\n';
  texto += `                    BOLETA DE PAGO                        No. ${boleta.numero_control}\n`;
  texto += `                                                          Fecha de Impresión: ${boleta.fecha_impresion}\n\n`;
  
  texto += `Empresa: ${boleta.empresa_importador}\n`;
  texto += `RUC: ${boleta.ruc}\n`;
  texto += `Agente: ${boleta.agente_corredor}\n\n`;
  
  texto += '═══════════════════════════════════════════════════════════════════════════════════\n';
  texto += '#   Fecha Reg    Formulario          Año   Sect.Rect   Monto hasta      Monto hasta\n';
  texto += `                                                       ${boleta.escenarios_pago.normal.hasta_fecha}   ${boleta.escenarios_pago.recargo_10_percent.hasta_fecha}\n`;
  texto += '───────────────────────────────────────────────────────────────────────────────────\n';
  
  boleta.lineas.forEach(linea => {
    texto += `${String(linea.numero).padStart(2)}  ${linea.fecha_registro}   ${linea.formulario}   ${linea.año}  ${linea.sector_rectificacion}          $${linea.monto_escenario_1.toFixed(2).padStart(8)}     $${linea.monto_escenario_2.toFixed(2).padStart(8)}\n`;
  });
  
  texto += '───────────────────────────────────────────────────────────────────────────────────\n';
  texto += `                                      TOTAL:              $${boleta.escenarios_pago.normal.monto.toFixed(2).padStart(8)}     $${boleta.escenarios_pago.recargo_10_percent.monto.toFixed(2).padStart(8)}\n`;
  texto += '═══════════════════════════════════════════════════════════════════════════════════\n\n';
  
  texto += 'Nota:\n';
  texto += `Monto a pagar hasta el ${boleta.escenarios_pago.normal.hasta_fecha}: $${boleta.escenarios_pago.normal.monto.toFixed(2)}\n`;
  texto += `Monto a pagar hasta el ${boleta.escenarios_pago.recargo_10_percent.hasta_fecha}: $${boleta.escenarios_pago.recargo_10_percent.monto.toFixed(2)}\n`;
  texto += `Monto a pagar a partir del: $${boleta.escenarios_pago.recargo_20_percent.monto.toFixed(2)}\n\n`;
  
  texto += `Esta boleta de pago al no ser pagada el ${boleta.fecha_anulacion} deberá ser anulada y generar una nueva boleta de pago.\n`;
  
  return texto;
}

/**
 * Exporta a JSON
 */
export function exportarDeclaracionJSON(declaracion: DeclaracionOficial): string {
  return JSON.stringify(declaracion, null, 2);
}

/**
 * Exporta a XML compatible con SIGA
 */
export function exportarDeclaracionXML(declaracion: DeclaracionOficial): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<DeclaracionAduanera xmlns="http://www.ana.gob.pa/siga/declaracion" version="2.0">\n';
  
  // Cabecera
  xml += '  <Cabecera>\n';
  xml += `    <NumeroDeclaracion>${declaracion.cabecera.declaracion_numero}</NumeroDeclaracion>\n`;
  xml += `    <FechaRegistro>${declaracion.cabecera.fecha_registro}</FechaRegistro>\n`;
  xml += `    <TipoOperacion>${escapeXML(declaracion.cabecera.tipo_operacion)}</TipoOperacion>\n`;
  xml += `    <TipoDespacho>${declaracion.cabecera.tipo_despacho}</TipoDespacho>\n`;
  xml += `    <AduanaEntrada>${escapeXML(declaracion.cabecera.aduana_entrada)}</AduanaEntrada>\n`;
  xml += `    <ViaTransporte>${declaracion.cabecera.via_transporte}</ViaTransporte>\n`;
  xml += '  </Cabecera>\n';
  
  // Transporte
  xml += '  <DatosTransporte>\n';
  xml += `    <TipoConocimiento>${declaracion.transporte.tipo_conocimiento}</TipoConocimiento>\n`;
  xml += `    <MAWBMadre>${declaracion.transporte.mawb_madre}</MAWBMadre>\n`;
  xml += `    <HAWBHijo>${declaracion.transporte.hawb_hijo}</HAWBHijo>\n`;
  xml += `    <PesoBrutoKgs>${formatearPesoANA(declaracion.transporte.peso_bruto_total_kgs)}</PesoBrutoKgs>\n`;
  xml += `    <Bultos>${declaracion.transporte.bultos_declarados}</Bultos>\n`;
  xml += `    <Consignante>${escapeXML(declaracion.transporte.consignante)}</Consignante>\n`;
  xml += '  </DatosTransporte>\n';
  
  // Sujetos
  xml += '  <SujetosIntervinientes>\n';
  xml += '    <Importador>\n';
  xml += `      <Nombre>${escapeXML(declaracion.sujetos.importador.nombre)}</Nombre>\n`;
  xml += `      <Identificacion>${declaracion.sujetos.importador.identificacion}</Identificacion>\n`;
  xml += `      <TipoPersona>${declaracion.sujetos.importador.tipo_persona}</TipoPersona>\n`;
  xml += '    </Importador>\n';
  if (declaracion.sujetos.corredor_aduana) {
    xml += '    <CorredorAduana>\n';
    xml += `      <Codigo>${declaracion.sujetos.corredor_aduana.codigo}</Codigo>\n`;
    xml += `      <Nombre>${escapeXML(declaracion.sujetos.corredor_aduana.nombre)}</Nombre>\n`;
    xml += '    </CorredorAduana>\n';
  }
  xml += '  </SujetosIntervinientes>\n';
  
  // Artículos
  xml += '  <Articulos>\n';
  declaracion.articulos.forEach(art => {
    xml += '    <Articulo>\n';
    xml += `      <Numero>${art.numero_articulo}</Numero>\n`;
    xml += `      <FraccionArancelaria>${art.fraccion_arancelaria}</FraccionArancelaria>\n`;
    xml += `      <Descripcion>${escapeXML(art.especificacion_mercancia)}</Descripcion>\n`;
    xml += `      <PaisOrigen>${art.pais_origen}</PaisOrigen>\n`;
    xml += `      <ValorFOB>${art.valor_fob.toFixed(2)}</ValorFOB>\n`;
    xml += `      <ValorFlete>${art.valor_flete.toFixed(2)}</ValorFlete>\n`;
    xml += `      <ValorSeguro>${art.valor_seguro.toFixed(2)}</ValorSeguro>\n`;
    xml += `      <ValorCIF>${art.valor_cif.toFixed(2)}</ValorCIF>\n`;
    xml += `      <PesoBrutoKgs>${formatearPesoANA(art.peso_bruto_kgs)}</PesoBrutoKgs>\n`;
    xml += '      <Impuestos>\n';
    xml += `        <DAI tasa="${formatearTarifaANA(art.impuestos.dai_tarifa_percent)}">${art.impuestos.dai_a_pagar.toFixed(2)}</DAI>\n`;
    xml += `        <ITBM tasa="${formatearTarifaANA(art.impuestos.itbm_tarifa_percent)}">${art.impuestos.itbm_a_pagar.toFixed(2)}</ITBM>\n`;
    xml += `        <ISC tasa="${formatearTarifaANA(art.impuestos.isc_tarifa_percent)}">${art.impuestos.isc_a_pagar.toFixed(2)}</ISC>\n`;
    xml += '      </Impuestos>\n';
    xml += '    </Articulo>\n';
  });
  xml += '  </Articulos>\n';
  
  // Totales
  xml += '  <Totales>\n';
  xml += `    <FOBTotal>${declaracion.totales.valor_fob_total.toFixed(2)}</FOBTotal>\n`;
  xml += `    <FleteTotal>${declaracion.totales.valor_flete_total.toFixed(2)}</FleteTotal>\n`;
  xml += `    <SeguroTotal>${declaracion.totales.valor_seguro_total.toFixed(2)}</SeguroTotal>\n`;
  xml += `    <CIFTotal>${declaracion.totales.valor_cif_total.toFixed(2)}</CIFTotal>\n`;
  xml += `    <DAITotal>${declaracion.totales.impuesto_importacion_total.toFixed(2)}</DAITotal>\n`;
  xml += `    <ITBMTotal>${declaracion.totales.itbm_total.toFixed(2)}</ITBMTotal>\n`;
  xml += `    <TasaSistema>${declaracion.totales.tasa_uso_sistema.toFixed(2)}</TasaSistema>\n`;
  xml += `    <TotalAPagar>${declaracion.totales.total_a_pagar.toFixed(2)}</TotalAPagar>\n`;
  xml += '  </Totales>\n';
  
  xml += '</DeclaracionAduanera>';
  
  return xml;
}

// ============================================
// UTILIDADES
// ============================================

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function redondear3(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

function extraerCodigoAmazon(tracking: string): string | undefined {
  // Buscar patrón AMZPSR seguido de números
  const match = tracking.match(/AMZPSR\d+/i);
  if (match) return match[0].toUpperCase();
  
  // Si no hay patrón Amazon, usar el tracking como referencia
  if (tracking && tracking.length > 5) {
    return tracking.toUpperCase();
  }
  
  return undefined;
}

function generarCodigoDocumentos(): string {
  // Genera código aleatorio tipo "BBlQHhCkg_1,.,."
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code}_1,.,.`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default {
  generarDeclaracionOficial,
  generarBoletaPago,
  exportarDeclaracionTexto,
  exportarBoletaTexto,
  exportarDeclaracionJSON,
  exportarDeclaracionXML
};
