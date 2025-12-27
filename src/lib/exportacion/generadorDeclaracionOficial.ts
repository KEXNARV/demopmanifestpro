/**
 * GENERADOR DE DECLARACIÓN OFICIAL
 * Transforma datos del sistema al formato SIGA de Panamá
 * 
 * Normativa: Resolución 049-2025 ANA
 */

import { Liquidacion, FacturaComercial } from '@/types/aduanas';
import { ManifestRow } from '@/types/manifest';
import {
  DeclaracionOficial,
  CabeceraDeclaracion,
  SujetosIntervinientes,
  DetalleMercancia,
  BoletaPagoResumen,
  ImpuestosMercancia,
  EscenariosPago,
  RestriccionMercancia,
  CONSTANTES_DECLARACION,
  generarNumeroDeclaracion,
  calcularVencimientos,
  detectarAutoridadPorCapitulo,
  formatearIdentificacion
} from '@/types/declaracionOficial';

// ============================================
// INTERFACES DE ENTRADA
// ============================================

export interface DatosParaDeclaracion {
  liquidaciones: Liquidacion[];
  paquetes: ManifestRow[];
  facturas?: FacturaComercial[];
  mawb?: string;
  
  // Datos del importador
  importador: {
    nombre: string;
    identificacion: string;
    tipo_persona: 'Persona Natural' | 'Persona Jurídica';
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  
  // Datos del corredor (opcional para Cat. A, B)
  corredor?: {
    codigo: string;
    nombre: string;
    licencia?: string;
  };
  
  // Configuración
  aduana?: string;
  via_transporte?: string;
  tipo_despacho?: string;
}

// ============================================
// FUNCIÓN PRINCIPAL: Generar Declaración
// ============================================

export function generarDeclaracionOficial(
  datos: DatosParaDeclaracion,
  secuencial: number = 1
): DeclaracionOficial {
  const fechaRegistro = new Date();
  
  // 1. Generar cabecera
  const cabecera = generarCabecera(fechaRegistro, datos, secuencial);
  
  // 2. Generar sujetos intervinientes
  const sujetos = generarSujetos(datos);
  
  // 3. Generar detalle de mercancía
  const detalle = generarDetalleMercancia(datos.liquidaciones, datos.paquetes, datos.facturas);
  
  // 4. Calcular totales y boleta de pago
  const boleta = generarBoletaPago(detalle, fechaRegistro);
  
  return {
    cabecera_declaracion: cabecera,
    sujetos_intervinientes: sujetos,
    detalle_mercancia: detalle,
    boleta_pago_resumen: boleta,
    metadata: {
      version: '1.0',
      generado_por: 'IPL Customs AI',
      fecha_generacion: new Date().toISOString()
    }
  };
}

// ============================================
// GENERADORES DE SECCIONES
// ============================================

function generarCabecera(
  fecha: Date,
  datos: DatosParaDeclaracion,
  secuencial: number
): CabeceraDeclaracion {
  return {
    declaracion_numero: generarNumeroDeclaracion(secuencial),
    fecha_registro: fecha.toISOString().split('T')[0],
    tipo_operacion: 'Importación por Courier',
    tipo_despacho: (datos.tipo_despacho as CabeceraDeclaracion['tipo_despacho']) || 'Normal',
    aduana_entrada: (datos.aduana as CabeceraDeclaracion['aduana_entrada']) || 'AEROPUERTO CARGA TOCUMEN',
    via_transporte: (datos.via_transporte as CabeceraDeclaracion['via_transporte']) || 'Aereo'
  };
}

function generarSujetos(datos: DatosParaDeclaracion): SujetosIntervinientes {
  const sujetos: SujetosIntervinientes = {
    importador: {
      nombre: datos.importador.nombre,
      identificacion: formatearIdentificacion(datos.importador.identificacion),
      tipo_persona: datos.importador.tipo_persona,
      direccion: datos.importador.direccion,
      telefono: datos.importador.telefono,
      email: datos.importador.email
    }
  };
  
  if (datos.corredor) {
    sujetos.corredor_aduana = {
      codigo: datos.corredor.codigo,
      nombre: datos.corredor.nombre,
      licencia: datos.corredor.licencia
    };
  }
  
  return sujetos;
}

function generarDetalleMercancia(
  liquidaciones: Liquidacion[],
  paquetes: ManifestRow[],
  facturas?: FacturaComercial[]
): DetalleMercancia[] {
  const detalle: DetalleMercancia[] = [];
  
  liquidaciones.forEach((liq, idx) => {
    // Buscar paquete correspondiente
    const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
    
    // Buscar factura correspondiente
    const factura = facturas?.find(f => f.numeroGuia === liq.numeroGuia);
    
    // Calcular valores
    const valorFOB = liq.valorFOB;
    const flete = liq.valorFlete;
    const seguro = liq.valorSeguro > 0 
      ? liq.valorSeguro 
      : valorFOB * (CONSTANTES_DECLARACION.SEGURO_TEORICO_PERCENT / 100);
    const valorCIF = valorFOB + flete + seguro;
    
    // Calcular impuestos
    const impuestos = calcularImpuestos(liq, valorCIF);
    
    // Detectar restricciones por código SA
    const restricciones: RestriccionMercancia[] = [];
    if (liq.hsCode) {
      const restriccion = detectarAutoridadPorCapitulo(liq.hsCode);
      if (restriccion) restricciones.push(restriccion);
    }
    
    // Agregar restricciones existentes
    if (liq.restricciones && liq.restricciones.length > 0) {
      liq.restricciones.forEach(r => {
        restricciones.push({
          autoridad: mapearAutoridad(r.autoridad),
          tipo: r.tipo,
          descripcion: r.mensaje,
          requiere_permiso: true
        });
      });
    }
    
    detalle.push({
      item: idx + 1,
      fraccion_arancelaria: formatearFraccionArancelaria(liq.hsCode || ''),
      descripcion_comercial: paquete?.description || liq.descripcionArancelaria || '',
      descripcion_arancelaria: liq.descripcionArancelaria,
      pais_origen: factura?.paisOrigen || 'US',
      
      valor_fob: redondear2(valorFOB),
      flete: redondear2(flete),
      seguro: redondear2(seguro),
      valor_cif: redondear2(valorCIF),
      
      peso_bruto_kgs: redondear3(convertirLbsAKgs(paquete?.weight || 0)),
      
      impuestos,
      restricciones: restricciones.length > 0 ? restricciones : undefined,
      categoria_aduanera: liq.categoriaAduanera
    });
  });
  
  return detalle;
}

function calcularImpuestos(liq: Liquidacion, valorCIF: number): ImpuestosMercancia {
  // DAI según fracción arancelaria
  const daiTasa = liq.percentDAI || 0;
  const daiMonto = redondear2(valorCIF * (daiTasa / 100));
  
  // ISC si aplica
  const iscTasa = liq.percentISC || 0;
  const iscMonto = iscTasa > 0 ? redondear2((valorCIF + daiMonto) * (iscTasa / 100)) : 0;
  
  // ITBMS sobre base fiscal (CIF + DAI + ISC)
  const baseFiscal = valorCIF + daiMonto + iscMonto;
  const itbmsTasa = CONSTANTES_DECLARACION.ITBMS_STANDARD;
  const itbmsMonto = redondear2(baseFiscal * (itbmsTasa / 100));
  
  const totalImpuestos = redondear2(daiMonto + iscMonto + itbmsMonto);
  
  return {
    dai_tasa: daiTasa,
    dai_monto: daiMonto,
    isc_tasa: iscTasa > 0 ? iscTasa : undefined,
    isc_monto: iscMonto > 0 ? iscMonto : undefined,
    itbms_tasa: itbmsTasa,
    itbms_monto: itbmsMonto,
    total_impuestos: totalImpuestos
  };
}

function generarBoletaPago(
  detalle: DetalleMercancia[],
  fechaRegistro: Date
): BoletaPagoResumen {
  // Sumar totales
  const totalCIF = detalle.reduce((sum, d) => sum + d.valor_cif, 0);
  const totalImpuestos = detalle.reduce((sum, d) => sum + (d.impuestos.total_impuestos || 0), 0);
  
  const tasaSiga = CONSTANTES_DECLARACION.TASA_SIGA;
  const tasaFormulario = CONSTANTES_DECLARACION.TASA_FORMULARIO;
  
  const totalLiquidado = redondear2(totalImpuestos + tasaSiga + tasaFormulario);
  
  // Calcular vencimientos
  const vencimientos = calcularVencimientos(fechaRegistro);
  
  // Calcular montos con recargos
  vencimientos.normal.monto = totalLiquidado;
  vencimientos.recargo_1.monto = redondear2(totalLiquidado * (1 + CONSTANTES_DECLARACION.RECARGO_1_PERCENT / 100));
  vencimientos.recargo_2.monto = redondear2(totalLiquidado * (1 + CONSTANTES_DECLARACION.RECARGO_2_PERCENT / 100));
  
  return {
    total_liquidado: totalLiquidado,
    total_impuestos: redondear2(totalImpuestos),
    tasa_siga: tasaSiga,
    tasa_formulario: tasaFormulario,
    vencimiento_escenarios: vencimientos
  };
}

// ============================================
// EXPORTACIÓN A FORMATOS
// ============================================

/**
 * Exporta la declaración a JSON compatible con SIGA
 */
export function exportarDeclaracionJSON(declaracion: DeclaracionOficial): string {
  return JSON.stringify(declaracion, null, 2);
}

/**
 * Exporta la declaración a XML compatible con SIGA
 */
export function exportarDeclaracionXML(declaracion: DeclaracionOficial): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<DeclaracionAduanera xmlns="http://www.ana.gob.pa/siga/declaracion">\n';
  
  // Cabecera
  xml += '  <CabeceraDeclaracion>\n';
  xml += `    <DeclaracionNumero>${declaracion.cabecera_declaracion.declaracion_numero}</DeclaracionNumero>\n`;
  xml += `    <FechaRegistro>${declaracion.cabecera_declaracion.fecha_registro}</FechaRegistro>\n`;
  xml += `    <TipoOperacion>${declaracion.cabecera_declaracion.tipo_operacion}</TipoOperacion>\n`;
  xml += `    <TipoDespacho>${declaracion.cabecera_declaracion.tipo_despacho}</TipoDespacho>\n`;
  xml += `    <AduanaEntrada>${declaracion.cabecera_declaracion.aduana_entrada}</AduanaEntrada>\n`;
  xml += `    <ViaTransporte>${declaracion.cabecera_declaracion.via_transporte}</ViaTransporte>\n`;
  xml += '  </CabeceraDeclaracion>\n';
  
  // Sujetos
  xml += '  <SujetosIntervinientes>\n';
  xml += '    <Importador>\n';
  xml += `      <Nombre>${escapeXML(declaracion.sujetos_intervinientes.importador.nombre)}</Nombre>\n`;
  xml += `      <Identificacion>${declaracion.sujetos_intervinientes.importador.identificacion}</Identificacion>\n`;
  xml += `      <TipoPersona>${declaracion.sujetos_intervinientes.importador.tipo_persona}</TipoPersona>\n`;
  xml += '    </Importador>\n';
  
  if (declaracion.sujetos_intervinientes.corredor_aduana) {
    xml += '    <CorredorAduana>\n';
    xml += `      <Codigo>${declaracion.sujetos_intervinientes.corredor_aduana.codigo}</Codigo>\n`;
    xml += `      <Nombre>${escapeXML(declaracion.sujetos_intervinientes.corredor_aduana.nombre)}</Nombre>\n`;
    xml += '    </CorredorAduana>\n';
  }
  xml += '  </SujetosIntervinientes>\n';
  
  // Detalle mercancía
  xml += '  <DetalleMercancia>\n';
  declaracion.detalle_mercancia.forEach(item => {
    xml += '    <Item>\n';
    xml += `      <Numero>${item.item}</Numero>\n`;
    xml += `      <FraccionArancelaria>${item.fraccion_arancelaria}</FraccionArancelaria>\n`;
    xml += `      <DescripcionComercial>${escapeXML(item.descripcion_comercial)}</DescripcionComercial>\n`;
    xml += `      <ValorFOB>${item.valor_fob.toFixed(2)}</ValorFOB>\n`;
    xml += `      <Flete>${item.flete.toFixed(2)}</Flete>\n`;
    xml += `      <Seguro>${item.seguro.toFixed(2)}</Seguro>\n`;
    xml += `      <ValorCIF>${item.valor_cif.toFixed(2)}</ValorCIF>\n`;
    xml += `      <PesoBrutoKgs>${item.peso_bruto_kgs.toFixed(3)}</PesoBrutoKgs>\n`;
    xml += '      <Impuestos>\n';
    xml += `        <DAI tasa="${item.impuestos.dai_tasa.toFixed(2)}">${item.impuestos.dai_monto.toFixed(2)}</DAI>\n`;
    xml += `        <ITBMS tasa="${item.impuestos.itbms_tasa.toFixed(2)}">${item.impuestos.itbms_monto.toFixed(2)}</ITBMS>\n`;
    xml += '      </Impuestos>\n';
    xml += '    </Item>\n';
  });
  xml += '  </DetalleMercancia>\n';
  
  // Boleta de pago
  xml += '  <BoletaPagoResumen>\n';
  xml += `    <TotalLiquidado>${declaracion.boleta_pago_resumen.total_liquidado.toFixed(2)}</TotalLiquidado>\n`;
  xml += `    <TotalImpuestos>${declaracion.boleta_pago_resumen.total_impuestos.toFixed(2)}</TotalImpuestos>\n`;
  xml += `    <TasaSIGA>${declaracion.boleta_pago_resumen.tasa_siga.toFixed(2)}</TasaSIGA>\n`;
  xml += `    <TasaFormulario>${declaracion.boleta_pago_resumen.tasa_formulario.toFixed(2)}</TasaFormulario>\n`;
  xml += '    <VencimientoEscenarios>\n';
  xml += `      <Normal monto="${declaracion.boleta_pago_resumen.vencimiento_escenarios.normal.monto.toFixed(2)}" hasta="${declaracion.boleta_pago_resumen.vencimiento_escenarios.normal.hasta}" />\n`;
  xml += `      <Recargo1 monto="${declaracion.boleta_pago_resumen.vencimiento_escenarios.recargo_1.monto.toFixed(2)}" hasta="${declaracion.boleta_pago_resumen.vencimiento_escenarios.recargo_1.hasta}" />\n`;
  xml += `      <Recargo2 monto="${declaracion.boleta_pago_resumen.vencimiento_escenarios.recargo_2.monto.toFixed(2)}" desde="${declaracion.boleta_pago_resumen.vencimiento_escenarios.recargo_2.desde}" />\n`;
  xml += '    </VencimientoEscenarios>\n';
  xml += '  </BoletaPagoResumen>\n';
  
  xml += '</DeclaracionAduanera>';
  
  return xml;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function redondear3(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

function convertirLbsAKgs(lbs: number): number {
  return lbs * 0.453592;
}

function formatearFraccionArancelaria(hsCode: string): string {
  // Limpiar y formatear a 12 dígitos
  const clean = hsCode.replace(/\D/g, '');
  return clean.padEnd(12, '0');
}

function mapearAutoridad(autoridad: string): RestriccionMercancia['autoridad'] {
  const mapa: Record<string, RestriccionMercancia['autoridad']> = {
    'MINSA': 'MINSA',
    'APA': 'APA',
    'MIDA': 'MIDA',
    'ACODECO': 'ACODECO',
    'ANA': 'ANA-DPFA',
    'DPFA': 'ANA-DPFA',
    'ANAM': 'ANAM'
  };
  return mapa[autoridad.toUpperCase()] || 'MINSA';
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
  exportarDeclaracionJSON,
  exportarDeclaracionXML
};