import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ManifestRow, ProcessingConfig, Consignee, ConsigneeStats } from '@/types/manifest';
import { ExtendedProcessingResult } from './excelProcessor';

export interface ExportFile {
  id: string;
  name: string;
  category: string;
  icon: string;
  rows: ManifestRow[];
  stats: FileStats;
  generated: boolean;
  isOptional: boolean;
}

export interface FileStats {
  totalRows: number;
  totalValue: number;
  totalWeight: number;
  uniqueConsignees: number;
  consolidatedCount: number;
  byProvince: Record<string, number>;
}

export interface ExportConfig {
  includeDate: boolean;
  generateByProvince: boolean;
  generateByCity: boolean;
  generateByWeight: boolean;
  generateHighValue: boolean;
  generateHeavyWeight: boolean;
}

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeDate: true,
  generateByProvince: false,
  generateByCity: false,
  generateByWeight: false,
  generateHighValue: false,
  generateHeavyWeight: false,
};

function formatDate(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day}${month}${year}`;
}

function calculateFileStats(rows: ManifestRow[], consigneeMap?: Map<string, Consignee>): FileStats {
  const uniqueConsignees = new Set(rows.map(r => r.consigneeId || r.recipient)).size;
  const byProvince: Record<string, number> = {};
  
  rows.forEach(row => {
    const province = row.province || 'Sin Provincia';
    byProvince[province] = (byProvince[province] || 0) + 1;
  });

  let consolidatedCount = 0;
  if (consigneeMap) {
    const consigneePackageCounts = new Map<string, number>();
    rows.forEach(row => {
      const id = row.consigneeId || row.recipient;
      consigneePackageCounts.set(id, (consigneePackageCounts.get(id) || 0) + 1);
    });
    consigneePackageCounts.forEach((count) => {
      if (count >= 2) consolidatedCount += count;
    });
  }

  return {
    totalRows: rows.length,
    totalValue: rows.reduce((sum, r) => sum + r.valueUSD, 0),
    totalWeight: rows.reduce((sum, r) => sum + r.weight, 0),
    uniqueConsignees,
    consolidatedCount,
    byProvince,
  };
}

export function generateExportFiles(
  result: ExtendedProcessingResult,
  config: ProcessingConfig,
  exportConfig: ExportConfig = DEFAULT_EXPORT_CONFIG
): ExportFile[] {
  const allRows = result.batches.flatMap(b => b.rows);
  const dateStr = exportConfig.includeDate ? `_${formatDate()}` : '';
  const files: ExportFile[] = [];
  
  // 1. Menor USD 100
  const lowValueRows = allRows.filter(r => r.valueUSD < 100);
  if (lowValueRows.length > 0) {
    files.push({
      id: 'low-value',
      name: `Lote1_MenorUSD100${dateStr}`,
      category: 'Valor < $100',
      icon: 'dollar-sign',
      rows: lowValueRows,
      stats: calculateFileStats(lowValueRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 2. USD 100 o más
  const highValueRows = allRows.filter(r => r.valueUSD >= 100);
  if (highValueRows.length > 0) {
    files.push({
      id: 'high-value',
      name: `Lote1_USD100oMas${dateStr}`,
      category: 'Valor ≥ $100',
      icon: 'trending-up',
      rows: highValueRows,
      stats: calculateFileStats(highValueRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 3. Farma - Medicamentos
  const medicationRows = allRows.filter(r => r.category === 'medication');
  if (medicationRows.length > 0) {
    files.push({
      id: 'farma-medication',
      name: `Lote1_Farma_Medicamentos${dateStr}`,
      category: 'Medicamentos',
      icon: 'pill',
      rows: medicationRows,
      stats: calculateFileStats(medicationRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 4. Farma - Suplementos
  const supplementRows = allRows.filter(r => r.category === 'supplements');
  if (supplementRows.length > 0) {
    files.push({
      id: 'farma-supplements',
      name: `Lote1_Farma_Suplementos${dateStr}`,
      category: 'Suplementos',
      icon: 'leaf',
      rows: supplementRows,
      stats: calculateFileStats(supplementRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 5. Farma - Productos Médicos
  const medicalRows = allRows.filter(r => r.category === 'medical');
  if (medicalRows.length > 0) {
    files.push({
      id: 'farma-medical',
      name: `Lote1_Farma_ProductosMedicos${dateStr}`,
      category: 'Productos Médicos',
      icon: 'stethoscope',
      rows: medicalRows,
      stats: calculateFileStats(medicalRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 6. Farma - Veterinarios
  const veterinaryRows = allRows.filter(r => r.category === 'veterinary');
  if (veterinaryRows.length > 0) {
    files.push({
      id: 'farma-veterinary',
      name: `Lote1_Farma_Veterinarios${dateStr}`,
      category: 'Productos Veterinarios',
      icon: 'paw-print',
      rows: veterinaryRows,
      stats: calculateFileStats(veterinaryRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 7. Consolidados (consignatarios con 2+ paquetes)
  const consolidatedRows: ManifestRow[] = [];
  result.consigneeMap.forEach(consignee => {
    if (consignee.totalPackages >= 2) {
      consolidatedRows.push(...consignee.packages);
    }
  });
  if (consolidatedRows.length > 0) {
    files.push({
      id: 'consolidated',
      name: `Lote1_Consolidados${dateStr}`,
      category: 'Entregas Consolidadas',
      icon: 'users',
      rows: consolidatedRows,
      stats: calculateFileStats(consolidatedRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // 8. General (no farmacéuticos)
  const generalRows = allRows.filter(r => r.category === 'general');
  if (generalRows.length > 0) {
    files.push({
      id: 'general',
      name: `Lote1_General${dateStr}`,
      category: 'General/Otros',
      icon: 'package',
      rows: generalRows,
      stats: calculateFileStats(generalRows, result.consigneeMap),
      generated: true,
      isOptional: false,
    });
  }

  // Optional files
  if (exportConfig.generateHeavyWeight) {
    const heavyRows = allRows.filter(r => r.weight > 30);
    if (heavyRows.length > 0) {
      files.push({
        id: 'heavy-weight',
        name: `Lote1_PesoPesado${dateStr}`,
        category: 'Peso > 30 lb',
        icon: 'weight',
        rows: heavyRows,
        stats: calculateFileStats(heavyRows, result.consigneeMap),
        generated: true,
        isOptional: true,
      });
    }
  }

  if (exportConfig.generateHighValue) {
    const veryHighValueRows = allRows.filter(r => r.valueUSD > 500);
    if (veryHighValueRows.length > 0) {
      files.push({
        id: 'very-high-value',
        name: `Lote1_AltoValor${dateStr}`,
        category: 'Valor > $500',
        icon: 'shield',
        rows: veryHighValueRows,
        stats: calculateFileStats(veryHighValueRows, result.consigneeMap),
        generated: true,
        isOptional: true,
      });
    }
  }

  // Province files
  if (exportConfig.generateByProvince) {
    const byProvince = new Map<string, ManifestRow[]>();
    allRows.forEach(row => {
      const province = row.province || 'SinProvincia';
      if (!byProvince.has(province)) byProvince.set(province, []);
      byProvince.get(province)!.push(row);
    });
    byProvince.forEach((rows, province) => {
      const safeName = province.replace(/[^a-zA-Z0-9]/g, '');
      files.push({
        id: `province-${safeName}`,
        name: `Lote1_Provincia_${safeName}${dateStr}`,
        category: `Provincia: ${province}`,
        icon: 'map-pin',
        rows,
        stats: calculateFileStats(rows, result.consigneeMap),
        generated: true,
        isOptional: true,
      });
    });
  }

  return files;
}

function createExcelWorkbook(file: ExportFile, consigneeMap?: Map<string, Consignee>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Paquetes (Main Data)
  const mainData = file.rows.map(row => {
    const consignee = consigneeMap?.get(row.consigneeId || '');
    return {
      'Número de Guía': row.trackingNumber,
      'Consignatario': row.recipient,
      'Identificación': row.identification || '',
      'Teléfono': row.phone || '',
      'Provincia': row.province || '',
      'Ciudad': row.city || '',
      'Barrio': row.district || '',
      'Dirección Completa': row.address,
      'Descripción del Producto': row.description,
      'Categoría': row.category || 'General',
      'Valor USD': row.valueUSD,
      'Peso (lb)': row.weight,
      'Estado': consignee && consignee.totalPackages >= 2 ? 'Consolidado' : 'Individual',
    };
  });
  const mainSheet = XLSX.utils.json_to_sheet(mainData);
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Paquetes');

  // Sheet 2: Resumen Ejecutivo
  const now = new Date();
  const summaryData = [
    ['RESUMEN DEL LOTE'],
    [''],
    ['Archivo:', `${file.name}.xlsx`],
    ['Fecha Generación:', now.toLocaleString('es-PA')],
    ['Total de Guías:', file.stats.totalRows],
    ['Total Consignatarios:', file.stats.uniqueConsignees],
    ['Entregas Consolidadas:', file.stats.consolidatedCount],
    [''],
    ['ESTADÍSTICAS'],
    ['Valor Total:', `$${file.stats.totalValue.toFixed(2)}`],
    ['Peso Total:', `${file.stats.totalWeight.toFixed(1)} lb`],
    ['Valor Promedio:', `$${(file.stats.totalValue / file.stats.totalRows || 0).toFixed(2)}`],
    ['Peso Promedio:', `${(file.stats.totalWeight / file.stats.totalRows || 0).toFixed(1)} lb`],
    [''],
    ['DISTRIBUCIÓN POR PROVINCIA'],
  ];
  Object.entries(file.stats.byProvince).forEach(([province, count]) => {
    const pct = ((count / file.stats.totalRows) * 100).toFixed(1);
    summaryData.push([province, `${count} guías (${pct}%)`]);
  });
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen Ejecutivo');

  // Sheet 3: Estadísticas por Ciudad
  const cityStats = new Map<string, { count: number; weight: number; value: number; consignees: Set<string> }>();
  file.rows.forEach(row => {
    const city = row.city || 'Sin Ciudad';
    if (!cityStats.has(city)) {
      cityStats.set(city, { count: 0, weight: 0, value: 0, consignees: new Set() });
    }
    const stats = cityStats.get(city)!;
    stats.count++;
    stats.weight += row.weight;
    stats.value += row.valueUSD;
    stats.consignees.add(row.consigneeId || row.recipient);
  });
  const cityData = [['Ciudad', 'Guías', 'Peso Total (lb)', 'Valor Total (USD)', 'Consignatarios']];
  cityStats.forEach((stats, city) => {
    cityData.push([city, stats.count.toString(), stats.weight.toFixed(1), `$${stats.value.toFixed(2)}`, stats.consignees.size.toString()]);
  });
  const citySheet = XLSX.utils.aoa_to_sheet(cityData);
  XLSX.utils.book_append_sheet(workbook, citySheet, 'Estadísticas por Ciudad');

  // Sheet 4: Entregas Consolidadas (if applicable)
  if (consigneeMap) {
    const consolidatedData: (string | number)[][] = [['Consignatario', 'Paquetes', 'Guías', 'Peso Total (lb)', 'Valor Total (USD)']];
    consigneeMap.forEach(consignee => {
      if (consignee.totalPackages >= 2) {
        const guias = consignee.packages.map(p => p.trackingNumber).slice(0, 5).join(', ');
        const suffix = consignee.packages.length > 5 ? '...' : '';
        consolidatedData.push([
          consignee.name,
          consignee.totalPackages,
          guias + suffix,
          consignee.totalWeight.toFixed(1),
          `$${consignee.totalValue.toFixed(2)}`,
        ]);
      }
    });
    if (consolidatedData.length > 1) {
      const consolidatedSheet = XLSX.utils.aoa_to_sheet(consolidatedData);
      XLSX.utils.book_append_sheet(workbook, consolidatedSheet, 'Entregas Consolidadas');
    }
  }

  return workbook;
}

export function exportFileToExcel(file: ExportFile, consigneeMap?: Map<string, Consignee>): Blob {
  const workbook = createExcelWorkbook(file, consigneeMap);
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadExportFile(file: ExportFile, consigneeMap?: Map<string, Consignee>): void {
  const blob = exportFileToExcel(file, consigneeMap);
  saveAs(blob, `${file.name}.xlsx`);
}

export async function downloadAllFilesAsZip(
  files: ExportFile[],
  result: ExtendedProcessingResult
): Promise<void> {
  const zip = new JSZip();
  const dateStr = formatDate();

  // Add Excel files
  files.forEach(file => {
    if (file.generated && file.rows.length > 0) {
      const blob = exportFileToExcel(file, result.consigneeMap);
      zip.file(`${file.name}.xlsx`, blob);
    }
  });

  // Generate README.txt
  const totalRows = files.reduce((sum, f) => sum + (f.generated ? f.stats.totalRows : 0), 0);
  const totalValue = files.reduce((sum, f) => sum + (f.generated ? f.stats.totalValue : 0), 0);
  const totalWeight = files.reduce((sum, f) => sum + (f.generated ? f.stats.totalWeight : 0), 0);
  
  let readme = `MANIFIESTO DE CARGA AÉREA - LOTE 1\n`;
  readme += `Fecha de Proceso: ${new Date().toLocaleString('es-PA')}\n`;
  readme += `Total de Guías Procesadas: ${result.summary.totalRows.toLocaleString()}\n\n`;
  readme += `ARCHIVOS INCLUIDOS:\n`;
  readme += `==================\n\n`;

  files.filter(f => f.generated).forEach((file, idx) => {
    readme += `${idx + 1}. ${file.name}.xlsx\n`;
    readme += `   - ${file.stats.totalRows.toLocaleString()} guías (${file.category})\n\n`;
  });

  readme += `\nESTADÍSTICAS GENERALES:\n`;
  readme += `======================\n`;
  readme += `- Total Consignatarios: ${result.consigneeStats.totalConsignees.toLocaleString()}\n`;
  readme += `- Tasa de Consolidación: ${((result.consigneeStats.consolidatablePackages / result.summary.totalRows) * 100).toFixed(1)}%\n`;
  readme += `- Valor Total: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  readme += `- Peso Total: ${totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lb\n\n`;
  readme += `Para más información, consulte la hoja "Resumen Ejecutivo" en cada archivo Excel.\n`;

  zip.file('README.txt', readme);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `Manifiesto_Lote1_${dateStr}.zip`);
}
