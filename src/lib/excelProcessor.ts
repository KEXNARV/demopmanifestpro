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
} from '@/types/manifest';

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

export function mapDataToManifest(
  data: Record<string, unknown>[],
  mapping: ColumnMapping
): { rows: ManifestRow[]; warnings: ProcessingWarning[] } {
  const rows: ManifestRow[] = [];
  const warnings: ProcessingWarning[] = [];
  const seenTrackingNumbers = new Set<string>();

  data.forEach((row, index) => {
    const trackingNumber = String(row[mapping.trackingNumber] || '').trim();
    const valueStr = String(row[mapping.valueUSD] || '0');
    const valueUSD = parseFloat(valueStr.replace(/[^0-9.-]/g, '')) || 0;
    const weightStr = String(row[mapping.weight] || '0');
    const weight = parseFloat(weightStr.replace(/[^0-9.-]/g, '')) || 0;

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

    if (valueUSD <= 0) {
      warnings.push({
        type: 'missing_value',
        message: `Fila ${index + 2}: Valor USD inválido o faltante`,
        rowIndex: index,
        trackingNumber,
      });
    }

    rows.push({
      id: `row-${index}`,
      trackingNumber,
      description: String(row[mapping.description] || ''),
      valueUSD,
      weight,
      recipient: String(row[mapping.recipient] || ''),
      address: String(row[mapping.address] || ''),
      originalRowIndex: index,
    });
  });

  return { rows, warnings };
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

export function processManifest(
  rows: ManifestRow[],
  config: ProcessingConfig,
  onProgress?: (progress: number) => void
): ProcessingResult {
  const warnings: ProcessingWarning[] = [];
  const duplicates: ManifestRow[] = [];
  
  // Classify all rows
  const classifiedRows = rows.map((row, index) => {
    if (onProgress) {
      onProgress((index / rows.length) * 30);
    }
    return classifyRow(row, config);
  });

  // Group by value threshold and category
  const grouped: Record<string, ManifestRow[]> = {};

  classifiedRows.forEach((row, index) => {
    if (onProgress) {
      onProgress(30 + (index / classifiedRows.length) * 30);
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
      onProgress(60 + (groupIndex / Object.keys(grouped).length) * 40);
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

  return { batches, summary, duplicates, warnings };
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

export function exportBatchToExcel(batch: ProcessedBatch): Blob {
  const exportData = batch.rows.map(row => ({
    'Número de Guía': row.trackingNumber,
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
