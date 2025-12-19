// ============================================
// GENERACIÓN DE EXCEL OPTIMIZADA
// Procesa en chunks para evitar out of memory
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ManifestRow, ProcessedBatch } from '@/types/manifest';
import { Liquidacion } from '@/types/aduanas';

const CHUNK_SIZE = 1000; // Procesar 1000 filas a la vez

/**
 * Genera Excel con streaming para evitar problemas de memoria
 */
export async function generarExcelOptimizado(
  paquetes: ManifestRow[],
  liquidaciones: Liquidacion[],
  nombreArchivo: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  
  const wb = XLSX.utils.book_new();
  
  // ═══════════════════════════════════════════════════════
  // HOJA 1: PAQUETES (CON STREAMING)
  // ═══════════════════════════════════════════════════════
  
  const headers = [
    '#', 'Guía Aérea', 'Consignatario', 'Identificación',
    'Teléfono', 'Provincia', 'Ciudad', 'Dirección',
    'Descripción', 'Categoría', 'Valor USD', 'Peso LB',
    'Cat. Aduanera', 'Total Tributos', 'Total a Pagar', 'Estado'
  ];
  
  const wsData: (string | number)[][] = [headers];
  let rowsProcessed = 0;
  
  // Crear mapa de liquidaciones para acceso rápido
  const liquidacionesMap = new Map<string, Liquidacion>();
  liquidaciones.forEach(liq => {
    liquidacionesMap.set(liq.numeroGuia, liq);
  });
  
  for (let i = 0; i < paquetes.length; i += CHUNK_SIZE) {
    const chunk = paquetes.slice(i, i + CHUNK_SIZE);
    
    // Convertir chunk a filas
    const filas = chunk.map((p, idx) => {
      const liq = liquidacionesMap.get(p.trackingNumber);
      return [
        i + idx + 1,
        p.trackingNumber,
        p.recipient || '',
        p.identification || 'N/A',
        p.phone || 'N/A',
        p.province || p.detectedProvince || '',
        p.city || p.detectedCity || '',
        p.address || '',
        (p.description || '').substring(0, 100), // Truncar
        p.category || 'general',
        p.valueUSD?.toFixed(2) || '0.00',
        p.weight?.toFixed(2) || '0.00',
        liq?.categoriaAduanera || 'N/A',
        liq?.totalTributos?.toFixed(2) || '0.00',
        liq?.totalAPagar?.toFixed(2) || '0.00',
        liq?.estado || 'pendiente'
      ];
    });
    
    wsData.push(...filas);
    rowsProcessed += chunk.length;
    
    // Reportar progreso
    if (onProgress) {
      const progress = (rowsProcessed / paquetes.length) * 50;
      onProgress(progress);
    }
    
    // Yield para no bloquear UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // Escribir hoja de paquetes
  const wsPaquetes = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, wsPaquetes, 'Paquetes');
  
  if (onProgress) onProgress(60);
  
  // ═══════════════════════════════════════════════════════
  // HOJA 2: LIQUIDACIONES (CON STREAMING)
  // ═══════════════════════════════════════════════════════
  
  const headersLiq = [
    '#', 'Guía', 'Categoría', 'CIF', 'DAI', 'ISC', 'ITBMS',
    'Tasa', 'Total Tributos', 'Total a Pagar', 'HS Code', 'Estado'
  ];
  
  const wsLiqData: (string | number)[][] = [headersLiq];
  
  for (let i = 0; i < liquidaciones.length; i += CHUNK_SIZE) {
    const chunk = liquidaciones.slice(i, i + CHUNK_SIZE);
    
    const filas = chunk.map((liq, idx) => [
      i + idx + 1,
      liq.numeroGuia,
      liq.categoriaAduanera,
      liq.valorCIF?.toFixed(2) || '0.00',
      liq.montoDAI?.toFixed(2) || '0.00',
      liq.montoISC?.toFixed(2) || '0.00',
      liq.montoITBMS?.toFixed(2) || '0.00',
      liq.tasaAduanera?.toFixed(2) || '0.00',
      liq.totalTributos?.toFixed(2) || '0.00',
      liq.totalAPagar?.toFixed(2) || '0.00',
      liq.hsCode || 'Pendiente',
      liq.estado
    ]);
    
    wsLiqData.push(...filas);
    
    // Yield
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  const wsLiquidaciones = XLSX.utils.aoa_to_sheet(wsLiqData);
  XLSX.utils.book_append_sheet(wb, wsLiquidaciones, 'Liquidaciones');
  
  if (onProgress) onProgress(75);
  
  // ═══════════════════════════════════════════════════════
  // HOJA 3: RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════
  
  const totalCIF = liquidaciones.reduce((s, l) => s + (l.valorCIF || 0), 0);
  const totalTributos = liquidaciones.reduce((s, l) => s + (l.totalTributos || 0), 0);
  const totalAPagar = liquidaciones.reduce((s, l) => s + (l.totalAPagar || 0), 0);
  
  const catA = liquidaciones.filter(l => l.categoriaAduanera === 'A').length;
  const catB = liquidaciones.filter(l => l.categoriaAduanera === 'B').length;
  const catC = liquidaciones.filter(l => l.categoriaAduanera === 'C').length;
  const catD = liquidaciones.filter(l => l.categoriaAduanera === 'D').length;
  
  const resumen = [
    ['RESUMEN DEL MANIFIESTO'],
    [''],
    ['Fecha de generación:', new Date().toLocaleString()],
    [''],
    ['TOTALES'],
    ['Total de paquetes:', paquetes.length],
    ['Total valor CIF (USD):', totalCIF.toFixed(2)],
    ['Total tributos (USD):', totalTributos.toFixed(2)],
    ['Total a cobrar (USD):', totalAPagar.toFixed(2)],
    [''],
    ['POR CATEGORÍA ADUANERA'],
    ['Categoría A (Documentos):', catA],
    ['Categoría B (De Minimis ≤$100):', catB],
    ['Categoría C ($100-$2,000):', catC],
    ['Categoría D (≥$2,000):', catD],
    [''],
    ['ALERTAS'],
    ['Con restricciones:', liquidaciones.filter(l => l.tieneRestricciones).length],
    ['Requieren revisión manual:', liquidaciones.filter(l => l.requiereRevisionManual).length],
    ['HS Code pendiente:', liquidaciones.filter(l => l.hsCode === '9999.99.99' || !l.hsCode).length]
  ];
  
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
  
  if (onProgress) onProgress(85);
  
  // ═══════════════════════════════════════════════════════
  // GENERAR ARCHIVO FINAL
  // ═══════════════════════════════════════════════════════
  
  const buffer = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true // Comprimir para reducir tamaño
  });
  
  if (onProgress) onProgress(100);
  
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Descarga el archivo Excel generado
 */
export async function descargarExcelOptimizado(
  paquetes: ManifestRow[],
  liquidaciones: Liquidacion[],
  nombreBase: string = 'Manifiesto',
  onProgress?: (progress: number) => void
): Promise<void> {
  
  const blob = await generarExcelOptimizado(
    paquetes,
    liquidaciones,
    nombreBase,
    onProgress
  );
  
  const fechaHoy = new Date().toISOString().split('T')[0];
  const nombreArchivo = `${nombreBase}_${fechaHoy}.xlsx`;
  
  saveAs(blob, nombreArchivo);
}

/**
 * Exporta lotes procesados con optimización
 */
export async function exportarLotesOptimizado(
  batches: ProcessedBatch[],
  nombreBase: string = 'Lotes',
  onProgress?: (progress: number) => void
): Promise<Blob> {
  
  const wb = XLSX.utils.book_new();
  const totalBatches = batches.length;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    const headers = [
      'Guía', 'Descripción', 'Valor USD', 'Peso',
      'Destinatario', 'Dirección', 'Categoría'
    ];
    
    const wsData: (string | number)[][] = [headers];
    
    batch.rows.forEach(row => {
      wsData.push([
        row.trackingNumber,
        row.description || '',
        row.valueUSD?.toFixed(2) || '0.00',
        row.weight?.toFixed(2) || '0.00',
        row.recipient || '',
        row.address || '',
        row.category || 'general'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Nombre de hoja truncado a 31 caracteres (límite de Excel)
    const sheetName = batch.name.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    if (onProgress) {
      onProgress(((i + 1) / totalBatches) * 100);
    }
    
    // Yield
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  const buffer = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true
  });
  
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

export default { 
  generarExcelOptimizado, 
  descargarExcelOptimizado,
  exportarLotesOptimizado 
};
