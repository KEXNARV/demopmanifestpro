// ============================================
// GENERADOR EXCEL CONSOLIDADO - 4 PESTAÑAS
// DE MINIMIS | LIQUIDACIÓN | ÓRGANOS ANUENTES | LOG AUDITORÍA
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ManifestRow } from '@/types/manifest';
import { ResultadoLiquidacionSIGA } from './MotorLiquidacionSIGA';
import { ResultadoAuditoriaRiesgos } from './DetectorRiesgos';
import { ResultadoClasificacionHTS } from './MotorClasificacionHTS';

export interface DatosExcelConsolidado {
  paquetes: ManifestRow[];
  liquidaciones: ResultadoLiquidacionSIGA[];
  clasificaciones: Map<string, ResultadoClasificacionHTS>;
  auditorias: ResultadoAuditoriaRiesgos[];
  metadatos: {
    mawb?: string;
    fechaManifiesto: Date;
    pesoTotal: number;
    firmaDigital?: string;
  };
}

export async function generarExcelConsolidado(
  datos: DatosExcelConsolidado,
  nombreArchivo: string
): Promise<Blob> {
  const wb = XLSX.utils.book_new();
  
  // PESTAÑA 1: DE MINIMIS (< USD 100)
  const deMinimis = datos.liquidaciones.filter(l => l.categoriaAduanera === 'B');
  const wsDeMinimis = XLSX.utils.aoa_to_sheet([
    ['GUÍAS DE MINIMIS (< USD 100) - LEVANTE RÁPIDO'],
    ['Guía', 'Consignatario', 'Descripción', 'Valor USD', 'Peso', 'Tasa Sistema', 'Estado'],
    ...deMinimis.map(l => {
      const p = datos.paquetes.find(pk => pk.trackingNumber === l.numeroGuia);
      return [l.numeroGuia, p?.recipient || '', p?.description?.substring(0, 50) || '', 
              l.valorCIF.toFixed(2), p?.weight || 0, l.tasaAduanera.toFixed(2), 'LIBERACIÓN'];
    })
  ]);
  XLSX.utils.book_append_sheet(wb, wsDeMinimis, 'DE MINIMIS');
  
  // PESTAÑA 2: LIQUIDACIÓN (> USD 100)
  const liquidacion = datos.liquidaciones.filter(l => l.categoriaAduanera === 'C' || l.categoriaAduanera === 'D');
  const wsLiquidacion = XLSX.utils.aoa_to_sheet([
    ['LIQUIDACIÓN ADUANERA - DESGLOSE COMPLETO'],
    ['Guía', 'HTS', 'CIF', 'DAI%', 'DAI$', 'ISC%', 'ISC$', 'ITBMS%', 'ITBMS$', 'Tasa', 'Total', 'Estado Mora'],
    ...liquidacion.map(l => [
      l.numeroGuia, l.hsCode || 'PENDIENTE', l.valorCIF.toFixed(2),
      l.percentDAI, l.montoDAI.toFixed(2), l.percentISC, l.montoISC.toFixed(2),
      l.percentITBMS, l.montoITBMS.toFixed(2), l.tasaAduanera.toFixed(2),
      l.boletaPago.montoActual.toFixed(2), l.boletaPago.estadoMora.toUpperCase()
    ])
  ]);
  XLSX.utils.book_append_sheet(wb, wsLiquidacion, 'LIQUIDACIÓN');
  
  // PESTAÑA 3: ÓRGANOS ANUENTES
  const conPermisos = datos.liquidaciones.filter(l => l.tieneRestricciones);
  const wsAnuentes = XLSX.utils.aoa_to_sheet([
    ['ÓRGANOS ANUENTES - PERMISOS REQUERIDOS'],
    ['Guía', 'Descripción', 'Autoridad', 'Tipo Restricción', 'Permiso', 'Acción'],
    ...conPermisos.flatMap(l => {
      const p = datos.paquetes.find(pk => pk.trackingNumber === l.numeroGuia);
      return l.restricciones.map(r => [
        l.numeroGuia, p?.description?.substring(0, 40) || '', r.autoridad,
        r.tipo, 'REQUERIDO', 'Solicitar permiso antes de despacho'
      ]);
    })
  ]);
  XLSX.utils.book_append_sheet(wb, wsAnuentes, 'ÓRGANOS ANUENTES');
  
  // PESTAÑA 4: LOG AUDITORÍA
  const wsAuditoria = XLSX.utils.aoa_to_sheet([
    ['LOG DE AUDITORÍA - ALERTAS Y RIESGOS'],
    ['Guía', 'Tipo Riesgo', 'Severidad', 'Mensaje', 'Acción Recomendada', 'Puntuación'],
    ...datos.auditorias.filter(a => a.requiereRevision).flatMap(a => 
      a.riesgosDetectados.map(r => [
        a.guia, r.tipo, r.severidad.toUpperCase(), r.mensaje.substring(0, 60),
        r.accionRecomendada.substring(0, 50), a.puntuacionRiesgo
      ])
    )
  ]);
  XLSX.utils.book_append_sheet(wb, wsAuditoria, 'LOG AUDITORÍA');
  
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function descargarExcelConsolidado(
  datos: DatosExcelConsolidado,
  nombreBase: string = 'Manifiesto_Consolidado'
): Promise<void> {
  const blob = await generarExcelConsolidado(datos, nombreBase);
  const fecha = new Date().toISOString().split('T')[0];
  saveAs(blob, `${nombreBase}_${fecha}.xlsx`);
}
