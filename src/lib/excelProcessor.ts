import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  ManifestRow,
  ProcessingConfig,
  ProcessedBatch,
  ProcessingResult,
  ProcessingSummary,
  ProcessingWarning,
  ColumnMapping,
  BatchStats,
  Consignee,
  ConsigneeStats,
  ConsolidatedDelivery,
} from '@/types/manifest';
import { Liquidacion, ResumenLiquidacion } from '@/types/aduanas';
import { procesarLiquidaciones, generarResumenLiquidacion } from '@/lib/aduanas/motorLiquidacion';
import { 
  groupByConsignee, 
  calculateConsigneeStats, 
  getConsolidatedDeliveries,
  formatConsolidatedForExport 
} from '@/lib/consigneeProcessor';
import { detectarUbicacion } from '@/lib/panamaGeography';
import { 
  validarGuiaIndividual, 
  validarLoteGuias, 
  esMAWB,
  ResultadoValidacionLote 
} from '@/lib/validacion/validadorGuias';
import { 
  extraerGTINsDeTexto, 
  validarGTIN, 
  GTINInfo 
} from '@/lib/gtin/gtinProcessor';

export function parseExcelFile(file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0] as Record<string, unknown>) : [];
        resolve({ headers, data: jsonData as Record<string, unknown>[] });
      } catch (error) {
        reject(new Error('Error al leer el archivo Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Error al cargar el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Mapea datos del Excel a filas de manifiesto
 * 
 * IMPORTANTE: El trackingNumber debe ser la guía INDIVIDUAL del paquete,
 * NO el MAWB. Se valida automáticamente para prevenir errores.
 */
export function mapDataToManifest(
  data: Record<string, unknown>[],
  mapping: ColumnMapping
): { rows: ManifestRow[]; warnings: ProcessingWarning[]; validacionGuias: ResultadoValidacionLote } {
  const rows: ManifestRow[] = [];
  const warnings: ProcessingWarning[] = [];
  const seenTrackingNumbers = new Set<string>();
  const todasLasGuias: string[] = [];

  data.forEach((row, index) => {
    const trackingNumber = String(row[mapping.trackingNumber] || '').trim();
    const valueStr = String(row[mapping.valueUSD] || '0');
    const valueUSD = parseFloat(valueStr.replace(/[^0-9.-]/g, '')) || 0;
    const weightStr = String(row[mapping.weight] || '0');
    const weight = parseFloat(weightStr.replace(/[^0-9.-]/g, '')) || 0;

    // Recolectar guías para validación en lote
    if (trackingNumber) {
      todasLasGuias.push(trackingNumber);
    }

    // Check for duplicates
    if (trackingNumber && seenTrackingNumbers.has(trackingNumber)) {
      warnings.push({
        type: 'duplicate',
        message: `Número de guía duplicado: ${trackingNumber}`,
        rowIndex: index,
        trackingNumber,
      });
    } else if (trackingNumber) {
      seenTrackingNumbers.add(trackingNumber);
    }

    // Check for missing values
    if (!trackingNumber) {
      warnings.push({
        type: 'missing_value',
        message: `Fila ${index + 2}: Número de guía faltante`,
        rowIndex: index,
      });
    }

    // Validar que no sea MAWB
    if (trackingNumber && esMAWB(trackingNumber)) {
      warnings.push({
        type: 'invalid_format',
        message: `Fila ${index + 2}: "${trackingNumber}" parece ser un MAWB, no una guía individual. Use la guía del paquete.`,
        rowIndex: index,
        trackingNumber,
      });
    }

    if (valueUSD <= 0) {
      warnings.push({
        type: 'missing_value',
        message: `Fila ${index + 2}: Valor USD inválido o faltante`,
        rowIndex: index,
        trackingNumber,
      });
    }

    const address = String(row[mapping.address] || '');
    const province = mapping.province ? String(row[mapping.province] || '') : undefined;
    const city = mapping.city ? String(row[mapping.city] || '') : undefined;
    
    // Auto-detect geographic location from address if not provided
    const geoInput = [province, city, address].filter(Boolean).join(' ');
    const geoDetection = detectarUbicacion(geoInput);

    // Validar y extraer códigos GTIN de la descripción
    const descripcion = String(row[mapping.description] || '');
    const gtinInfos = extraerGTINsDeTexto(descripcion);
    const gtinCodigos = gtinInfos.map(g => g.codigo);
    const gtinInvalidos = gtinInfos.filter(g => !g.valido);
    const gtinValido = gtinInfos.length === 0 || gtinInvalidos.length === 0;
    const gtinErrores = gtinInvalidos.flatMap(g => g.errores);
    const gtinPaisOrigen = gtinInfos.find(g => g.paisOrigen)?.paisOrigen;
    const requiereRevisionGTIN = gtinInfos.length > 0 && !gtinValido;

    // Add GTIN warnings
    if (requiereRevisionGTIN) {
      warnings.push({
        type: 'invalid_gtin',
        message: `Fila ${index + 2}: Código(s) GTIN inválido(s) detectado(s): ${gtinInvalidos.map(g => g.codigo).join(', ')}`,
        rowIndex: index,
        trackingNumber,
        gtinCodigo: gtinInvalidos[0]?.codigo
      });
    }

    rows.push({
      id: `row-${index}`,
      trackingNumber,
      description: descripcion,
      valueUSD,
      weight,
      recipient: String(row[mapping.recipient] || ''),
      address,
      province: province || geoDetection.provincia || undefined,
      city: city || geoDetection.ciudad || undefined,
      district: mapping.district ? String(row[mapping.district] || '') : undefined,
      detectedProvince: geoDetection.provincia || undefined,
      detectedCity: geoDetection.ciudad || undefined,
      detectedRegion: geoDetection.region || undefined,
      geoConfidence: geoDetection.confianza,
      phone: mapping.phone ? String(row[mapping.phone] || '') : undefined,
      identification: mapping.identification ? String(row[mapping.identification] || '') : undefined,
      originalRowIndex: index,
      // GTIN fields
      gtinCodigos: gtinCodigos.length > 0 ? gtinCodigos : undefined,
      gtinValido,
      gtinErrores: gtinErrores.length > 0 ? gtinErrores : undefined,
      gtinPaisOrigen,
      requiereRevisionGTIN,
    });
  });

  // Validar lote de guías para detectar uso incorrecto de MAWB
  const validacionGuias = validarLoteGuias(todasLasGuias);

  return { rows, warnings, validacionGuias };
}

export function classifyRow(row: ManifestRow, config: ProcessingConfig): ManifestRow {
  const description = row.description.toLowerCase();
  
  // Find matching category based on keywords
  let matchedCategory = config.categories.find(cat => cat.id === 'general');
  
  for (const category of config.categories.sort((a, b) => a.priority - b.priority)) {
    if (category.keywords.some(keyword => description.includes(keyword.toLowerCase()))) {
      matchedCategory = category;
      break;
    }
  }

  return {
    ...row,
    category: matchedCategory?.id || 'general',
  };
}

export interface ExtendedProcessingResult extends ProcessingResult {
  consigneeMap: Map<string, Consignee>;
  consigneeStats: ConsigneeStats;
  consolidatedDeliveries: ConsolidatedDelivery[];
  // Liquidación aduanera
  liquidaciones: Liquidacion[];
  resumenLiquidacion: ResumenLiquidacion;
}

export function processManifest(
  rows: ManifestRow[],
  config: ProcessingConfig,
  onProgress?: (progress: number) => void
): ExtendedProcessingResult {
  const warnings: ProcessingWarning[] = [];
  const duplicates: ManifestRow[] = [];
  
  // Classify all rows
  const classifiedRows = rows.map((row, index) => {
    if (onProgress) {
      onProgress((index / rows.length) * 20);
    }
    return classifyRow(row, config);
  });

  // Group by consignee
  if (onProgress) onProgress(25);
  const consigneeMap = groupByConsignee(classifiedRows);
  if (onProgress) onProgress(30);
  const consigneeStats = calculateConsigneeStats(consigneeMap);
  const consolidatedDeliveries = getConsolidatedDeliveries(consigneeMap, 2);

  // Group by value threshold and category
  const grouped: Record<string, ManifestRow[]> = {};

  classifiedRows.forEach((row, index) => {
    if (onProgress) {
      onProgress(35 + (index / classifiedRows.length) * 25);
    }

    const valueThreshold = config.valueTresholds.find(
      t => row.valueUSD >= t.minValue && row.valueUSD <= t.maxValue
    );
    const valueKey = valueThreshold?.id || 'unknown';
    const categoryKey = row.category || 'general';
    const groupKey = `${valueKey}_${categoryKey}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(row);
  });

  // Sort and batch
  const batches: ProcessedBatch[] = [];
  let batchCounter = 1;

  Object.entries(grouped).forEach(([groupKey, groupRows], groupIndex) => {
    if (onProgress) {
      onProgress(60 + (groupIndex / Object.keys(grouped).length) * 35);
    }

    // Sort by value
    const sortedRows = [...groupRows].sort((a, b) => 
      config.sortOrder === 'asc' ? a.valueUSD - b.valueUSD : b.valueUSD - a.valueUSD
    );

    // Split into batches of max batchSize
    for (let i = 0; i < sortedRows.length; i += config.batchSize) {
      const batchRows = sortedRows.slice(i, i + config.batchSize);
      const [valueKey, categoryKey] = groupKey.split('_');
      
      const valueThreshold = config.valueTresholds.find(t => t.id === valueKey);
      const category = config.categories.find(c => c.id === categoryKey);

      const stats = calculateBatchStats(batchRows);

      batches.push({
        id: `batch-${batchCounter}`,
        name: `Lote${batchCounter}_${valueThreshold?.name.replace(/[^a-zA-Z0-9]/g, '')}_${category?.name.replace(/[^a-zA-Z0-9]/g, '')}`,
        valueCategory: valueKey,
        productCategory: categoryKey,
        rows: batchRows,
        stats,
      });
      batchCounter++;
    }
  });

  // Calculate summary
  const summary: ProcessingSummary = {
    totalRows: rows.length,
    totalBatches: batches.length,
    totalValue: rows.reduce((sum, row) => sum + row.valueUSD, 0),
    byValueCategory: {},
    byProductCategory: {},
    processedAt: new Date(),
  };

  batches.forEach(batch => {
    summary.byValueCategory[batch.valueCategory] = 
      (summary.byValueCategory[batch.valueCategory] || 0) + batch.rows.length;
    summary.byProductCategory[batch.productCategory] = 
      (summary.byProductCategory[batch.productCategory] || 0) + batch.rows.length;
  });

  // Calculate customs liquidations
  if (onProgress) onProgress(90);
  const manifiestoId = `manifest_${Date.now()}`;
  const liquidaciones = procesarLiquidaciones(classifiedRows, manifiestoId, undefined, (p) => {
    if (onProgress) onProgress(90 + (p * 0.1));
  });
  const resumenLiquidacion = generarResumenLiquidacion(liquidaciones);

  return { 
    batches, 
    summary, 
    duplicates, 
    warnings,
    consigneeMap,
    consigneeStats,
    consolidatedDeliveries,
    liquidaciones,
    resumenLiquidacion,
  };
}

function calculateBatchStats(rows: ManifestRow[]): BatchStats {
  const values = rows.map(r => r.valueUSD);
  return {
    totalRows: rows.length,
    totalValue: values.reduce((a, b) => a + b, 0),
    avgValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    minValue: values.length > 0 ? Math.min(...values) : 0,
    maxValue: values.length > 0 ? Math.max(...values) : 0,
  };
}

/**
 * Exportar lote a Excel
 * 
 * NOTA: Cada fila representa un paquete individual identificado por su
 * guía propia (trackingNumber), NO por la guía aérea master (MAWB).
 */
export function exportBatchToExcel(batch: ProcessedBatch): Blob {
  const exportData = batch.rows.map(row => ({
    'Guía Individual': row.trackingNumber, // Guía del paquete (Amazon, courier)
    'MAWB (Referencia)': row.mawb || 'N/A', // Solo referencia del envío consolidado
    'Descripción': row.description,
    'Valor USD': row.valueUSD,
    'Peso': row.weight,
    'Destinatario': row.recipient,
    'Dirección': row.address,
    'Categoría': row.category,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function exportAllBatchesAsZip(batches: ProcessedBatch[]): Promise<void> {
  const zip = new JSZip();

  batches.forEach(batch => {
    const blob = exportBatchToExcel(batch);
    zip.file(`${batch.name}.xlsx`, blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Manifiestos_Procesados_${new Date().toISOString().split('T')[0]}.zip`);
}

export function downloadBatch(batch: ProcessedBatch): void {
  const blob = exportBatchToExcel(batch);
  saveAs(blob, `${batch.name}.xlsx`);
}
