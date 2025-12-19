// ============================================
// GENERADOR DE REPORTE CONSOLIDADO EXCEL
// Para liquidaciones aduaneras por MAWB
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Liquidacion, ResumenLiquidacion } from '@/types/aduanas';
import { ManifestRow } from '@/types/manifest';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReporteConfig {
  mawb: string;
  fechaProceso: Date;
}

/**
 * Genera reporte consolidado de liquidaciones en Excel
 */
export function generarReporteConsolidado(
  liquidaciones: Liquidacion[],
  resumen: ResumenLiquidacion,
  paquetes: ManifestRow[],
  config: ReporteConfig
): void {
  const wb = XLSX.utils.book_new();
  
  // ══════════════════════════════════════════════════════════
  // HOJA 1: RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════
  
  const resumenData = [
    ['REPORTE CONSOLIDADO DE LIQUIDACIONES ADUANERAS'],
    [''],
    ['INFORMACIÓN DEL MANIFIESTO'],
    ['MAWB:', config.mawb || 'SIN MAWB'],
    ['Fecha Proceso:', format(config.fechaProceso, 'PPP', { locale: es })],
    ['Total Paquetes:', liquidaciones.length.toString()],
    [''],
    ['═══════════════════════════════════════════════════'],
    ['RESUMEN FINANCIERO'],
    ['═══════════════════════════════════════════════════'],
    [''],
    ['Concepto', 'Monto USD'],
    ['Total FOB', liquidaciones.reduce((s, l) => s + l.valorFOB, 0).toFixed(2)],
    ['Total Flete', liquidaciones.reduce((s, l) => s + l.valorFlete, 0).toFixed(2)],
    ['Total Seguro', liquidaciones.reduce((s, l) => s + l.valorSeguro, 0).toFixed(2)],
    ['Total CIF', resumen.totalValorCIF.toFixed(2)],
    [''],
    ['Total DAI', liquidaciones.reduce((s, l) => s + l.montoDAI, 0).toFixed(2)],
    ['Total ISC', liquidaciones.reduce((s, l) => s + l.montoISC, 0).toFixed(2)],
    ['Total ITBMS', liquidaciones.reduce((s, l) => s + l.montoITBMS, 0).toFixed(2)],
    ['Tasas Aduaneras', liquidaciones.reduce((s, l) => s + l.tasaAduanera, 0).toFixed(2)],
    [''],
    ['TOTAL TRIBUTOS', resumen.totalTributos.toFixed(2)],
    ['TOTAL A COBRAR', resumen.totalAPagar.toFixed(2)],
    [''],
    ['═══════════════════════════════════════════════════'],
    ['RESUMEN POR CATEGORÍA ADUANERA'],
    ['═══════════════════════════════════════════════════'],
    [''],
    ['Categoría', 'Cantidad', 'CIF USD', 'Tributos USD', 'Total USD'],
    [
      'A - Documentos (Exento)', 
      resumen.porCategoria.A.cantidad.toString(),
      resumen.porCategoria.A.valor.toFixed(2),
      '0.00',
      '0.00'
    ],
    [
      'B - De Minimis (≤$100)', 
      resumen.porCategoria.B.cantidad.toString(),
      resumen.porCategoria.B.valor.toFixed(2),
      liquidaciones.filter(l => l.categoriaAduanera === 'B').reduce((s, l) => s + l.totalTributos, 0).toFixed(2),
      liquidaciones.filter(l => l.categoriaAduanera === 'B').reduce((s, l) => s + l.totalAPagar, 0).toFixed(2)
    ],
    [
      'C - Bajo Valor ($100-$2K)', 
      resumen.porCategoria.C.cantidad.toString(),
      resumen.porCategoria.C.valor.toFixed(2),
      liquidaciones.filter(l => l.categoriaAduanera === 'C').reduce((s, l) => s + l.totalTributos, 0).toFixed(2),
      liquidaciones.filter(l => l.categoriaAduanera === 'C').reduce((s, l) => s + l.totalAPagar, 0).toFixed(2)
    ],
    [
      'D - Alto Valor (≥$2K)', 
      resumen.porCategoria.D.cantidad.toString(),
      resumen.porCategoria.D.valor.toFixed(2),
      '0.00',
      'Requiere Corredor'
    ],
    [''],
    ['═══════════════════════════════════════════════════'],
    ['ALERTAS Y OBSERVACIONES'],
    ['═══════════════════════════════════════════════════'],
    [''],
    ['Con Restricciones:', resumen.conRestricciones.toString()],
    ['Requieren Revisión:', resumen.requierenRevision.toString()],
    ['Pendientes HS Code:', resumen.pendientesHSCode.toString()]
  ];
  
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  
  // Ajustar ancho de columnas
  wsResumen['!cols'] = [
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 }
  ];
  
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');
  
  // ══════════════════════════════════════════════════════════
  // HOJA 2: DETALLE DE LIQUIDACIONES
  // ══════════════════════════════════════════════════════════
  
  const detalleLiquidaciones = liquidaciones.map((liq, index) => {
    const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
    
    return {
      '#': index + 1,
      'Guía Aérea': liq.numeroGuia,
      'Consignatario': paquete?.recipient || '',
      'Categoría': liq.categoriaAduanera,
      'HS Code': liq.hsCode || 'Pendiente',
      'Descripción Arancelaria': liq.descripcionArancelaria || '',
      'FOB USD': liq.valorFOB.toFixed(2),
      'Flete USD': liq.valorFlete.toFixed(2),
      'Seguro USD': liq.valorSeguro.toFixed(2),
      'CIF USD': liq.valorCIF.toFixed(2),
      '% DAI': liq.percentDAI.toFixed(2),
      'DAI USD': liq.montoDAI.toFixed(2),
      '% ISC': liq.percentISC.toFixed(2),
      'ISC USD': liq.montoISC.toFixed(2),
      '% ITBMS': liq.percentITBMS.toFixed(2),
      'ITBMS USD': liq.montoITBMS.toFixed(2),
      'Tasa Aduanera': liq.tasaAduanera.toFixed(2),
      'Total Tributos': liq.totalTributos.toFixed(2),
      'Total a Pagar': liq.totalAPagar.toFixed(2),
      'Estado': liq.estado,
      'Restricciones': liq.tieneRestricciones ? 'SÍ' : 'NO',
      'Revisión Manual': liq.requiereRevisionManual ? 'SÍ' : 'NO'
    };
  });
  
  const wsDetalle = XLSX.utils.json_to_sheet(detalleLiquidaciones);
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Liquidaciones Detalle');
  
  // ══════════════════════════════════════════════════════════
  // HOJA 3: CATEGORÍA A - DOCUMENTOS
  // ══════════════════════════════════════════════════════════
  
  const categoriaA = liquidaciones.filter(l => l.categoriaAduanera === 'A');
  if (categoriaA.length > 0) {
    const dataA = categoriaA.map((liq, i) => {
      const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
      return {
        '#': i + 1,
        'Guía': liq.numeroGuia,
        'Consignatario': paquete?.recipient || '',
        'Descripción': paquete?.description || '',
        'Estado': 'EXENTO - Documentos'
      };
    });
    const wsA = XLSX.utils.json_to_sheet(dataA);
    XLSX.utils.book_append_sheet(wb, wsA, 'Cat A - Documentos');
  }
  
  // ══════════════════════════════════════════════════════════
  // HOJA 4: CATEGORÍA B - DE MINIMIS
  // ══════════════════════════════════════════════════════════
  
  const categoriaB = liquidaciones.filter(l => l.categoriaAduanera === 'B');
  if (categoriaB.length > 0) {
    const dataB = categoriaB.map((liq, i) => {
      const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
      return {
        '#': i + 1,
        'Guía': liq.numeroGuia,
        'Consignatario': paquete?.recipient || '',
        'CIF USD': liq.valorCIF.toFixed(2),
        'Tasa Courier': liq.tasaAduanera.toFixed(2),
        'Total': liq.totalAPagar.toFixed(2),
        'Estado': 'De Minimis - Exento de tributos'
      };
    });
    const wsB = XLSX.utils.json_to_sheet(dataB);
    XLSX.utils.book_append_sheet(wb, wsB, 'Cat B - DeMinimis');
  }
  
  // ══════════════════════════════════════════════════════════
  // HOJA 5: CATEGORÍA C - BAJO VALOR (CON TRIBUTOS)
  // ══════════════════════════════════════════════════════════
  
  const categoriaC = liquidaciones.filter(l => l.categoriaAduanera === 'C');
  if (categoriaC.length > 0) {
    const dataC = categoriaC.map((liq, i) => {
      const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
      return {
        '#': i + 1,
        'Guía': liq.numeroGuia,
        'Consignatario': paquete?.recipient || '',
        'HS Code': liq.hsCode || 'Pendiente',
        'CIF USD': liq.valorCIF.toFixed(2),
        'DAI': liq.montoDAI.toFixed(2),
        'ISC': liq.montoISC.toFixed(2),
        'ITBMS': liq.montoITBMS.toFixed(2),
        'Tasa': liq.tasaAduanera.toFixed(2),
        'Total Tributos': liq.totalTributos.toFixed(2),
        'Total a Pagar': liq.totalAPagar.toFixed(2)
      };
    });
    const wsC = XLSX.utils.json_to_sheet(dataC);
    XLSX.utils.book_append_sheet(wb, wsC, 'Cat C - ConTributos');
  }
  
  // ══════════════════════════════════════════════════════════
  // HOJA 6: CATEGORÍA D - ALTO VALOR
  // ══════════════════════════════════════════════════════════
  
  const categoriaD = liquidaciones.filter(l => l.categoriaAduanera === 'D');
  if (categoriaD.length > 0) {
    const dataD = categoriaD.map((liq, i) => {
      const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
      return {
        '#': i + 1,
        'Guía': liq.numeroGuia,
        'Consignatario': paquete?.recipient || '',
        'CIF USD': liq.valorCIF.toFixed(2),
        'Estado': 'REQUIERE CORREDOR ADUANERO',
        'Observación': 'Valor ≥ $2,000 - Tramitar con agente autorizado'
      };
    });
    const wsD = XLSX.utils.json_to_sheet(dataD);
    XLSX.utils.book_append_sheet(wb, wsD, 'Cat D - AltoValor');
  }
  
  // ══════════════════════════════════════════════════════════
  // HOJA 7: PRODUCTOS RESTRINGIDOS
  // ══════════════════════════════════════════════════════════
  
  const restringidos = liquidaciones.filter(l => l.tieneRestricciones);
  if (restringidos.length > 0) {
    const dataRestringidos = restringidos.flatMap(liq => 
      liq.restricciones.map((r, i) => {
        const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
        return {
          '#': i + 1,
          'Guía': liq.numeroGuia,
          'Consignatario': paquete?.recipient || '',
          'Tipo Restricción': r.tipo,
          'Autoridad': r.autoridad,
          'Mensaje': r.mensaje,
          'Acción Requerida': 'Verificar permiso o exención'
        };
      })
    );
    
    const wsRestringidos = XLSX.utils.json_to_sheet(dataRestringidos);
    XLSX.utils.book_append_sheet(wb, wsRestringidos, 'Prod Restringidos');
  }
  
  // ══════════════════════════════════════════════════════════
  // HOJA 8: FACTURACIÓN A CLIENTES
  // ══════════════════════════════════════════════════════════
  
  const facturacion = liquidaciones
    .filter(l => l.totalAPagar > 0)
    .map((liq, index) => {
      const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
      return {
        '#': index + 1,
        'Guía': liq.numeroGuia,
        'Consignatario': paquete?.recipient || '',
        'Teléfono': paquete?.phone || '',
        'Provincia': paquete?.detectedProvince || paquete?.province || '',
        'Ciudad': paquete?.detectedCity || paquete?.city || '',
        'Valor Mercancía (CIF)': liq.valorCIF.toFixed(2),
        'Impuestos': liq.totalTributos.toFixed(2),
        'TOTAL A COBRAR': liq.totalAPagar.toFixed(2),
        'Estado': liq.estado === 'pagada' ? 'PAGADO' : 'PENDIENTE'
      };
    });
  
  const wsFacturacion = XLSX.utils.json_to_sheet(facturacion);
  XLSX.utils.book_append_sheet(wb, wsFacturacion, 'Facturación');
  
  // ══════════════════════════════════════════════════════════
  // GENERAR Y DESCARGAR
  // ══════════════════════════════════════════════════════════
  
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const mawbClean = config.mawb?.replace(/[^a-zA-Z0-9]/g, '_') || 'SIN_MAWB';
  const nombreArchivo = `Liquidaciones_${mawbClean}_${format(config.fechaProceso, 'yyyyMMdd_HHmm')}.xlsx`;
  
  saveAs(blob, nombreArchivo);
}

/**
 * Genera reporte simplificado solo con totales por cliente
 */
export function generarReporteSimplificado(
  liquidaciones: Liquidacion[],
  paquetes: ManifestRow[],
  mawb: string
): void {
  const wb = XLSX.utils.book_new();
  
  const data = liquidaciones.map((liq, i) => {
    const paquete = paquetes.find(p => p.trackingNumber === liq.numeroGuia);
    return {
      '#': i + 1,
      'Guía': liq.numeroGuia,
      'Cliente': paquete?.recipient || '',
      'Teléfono': paquete?.phone || '',
      'Categoría': `Cat. ${liq.categoriaAduanera}`,
      'Total a Cobrar USD': liq.totalAPagar.toFixed(2)
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Cobros');
  
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const mawbClean = mawb?.replace(/[^a-zA-Z0-9]/g, '_') || 'SIN_MAWB';
  saveAs(blob, `Cobros_${mawbClean}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}
