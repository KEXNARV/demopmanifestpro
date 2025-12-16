import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ManifestRow, ProcessingConfig, Consignee, ConsigneeStats } from '@/types/manifest';
import { ExtendedProcessingResult } from './excelProcessor';
import { COMPANY_INFO, DEVELOPER_INFO, REGULATORY_INFO, getComplianceDeclaration, getCompanyFooter } from './companyConfig';

export interface MAWBExportInfo {
  mawb: string;
  airlineCode: string;
  airlineName: string;
  formatted: string;
}

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
  includeDate: false,
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

function formatFullDateTime(): string {
  return new Date().toLocaleString('es-PA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
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

// Generate MAWB-based file name
function generateMAWBFileName(mawbInfo: MAWBExportInfo, category: string, dateStr: string, includeDate: boolean): string {
  const mawbClean = `${mawbInfo.airlineCode}-${mawbInfo.mawb.replace(/^.*-/, '')}`;
  const datePart = includeDate ? `_${dateStr}` : '';
  return `MAWB_${mawbClean}_${category}${datePart}`;
}

export function generateExportFiles(
  result: ExtendedProcessingResult,
  config: ProcessingConfig,
  exportConfig: ExportConfig = DEFAULT_EXPORT_CONFIG,
  mawbInfo?: MAWBExportInfo
): ExportFile[] {
  const allRows = result.batches.flatMap(b => b.rows);
  const dateStr = formatDate();
  const files: ExportFile[] = [];
  
  // Helper to get file name
  const getName = (category: string) => {
    if (mawbInfo) {
      return generateMAWBFileName(mawbInfo, category, dateStr, exportConfig.includeDate);
    }
    const datePart = exportConfig.includeDate ? `_${dateStr}` : '';
    return `Lote1_${category}${datePart}`;
  };
  
  // 1. Menor USD 100
  const lowValueRows = allRows.filter(r => r.valueUSD < 100);
  if (lowValueRows.length > 0) {
    files.push({
      id: 'low-value',
      name: getName('Menor100'),
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
      name: getName('Mayor100'),
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
      name: getName('Medicamentos'),
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
      name: getName('Suplementos'),
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
      name: getName('ProductosMedicos'),
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
      name: getName('Veterinarios'),
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
      name: getName('Consolidados'),
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
      name: getName('General'),
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
        name: getName('Pesados'),
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
        name: getName('AltoValor'),
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
        name: getName(`Provincia_${safeName}`),
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

function createExcelWorkbook(
  file: ExportFile, 
  consigneeMap?: Map<string, Consignee>, 
  isFarma: boolean = false,
  mawbInfo?: MAWBExportInfo
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const now = formatFullDateTime();

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
  const summaryData: (string | number)[][] = [
    ['MANIFIESTO DE CARGA AÉREA'],
    [''],
    ['Empresa:', COMPANY_INFO.name],
    ['Ubicación:', COMPANY_INFO.location],
    [''],
  ];

  // Add MAWB info if available
  if (mawbInfo) {
    summaryData.push(['MAWB:', mawbInfo.formatted]);
    summaryData.push(['Aerolínea:', `${mawbInfo.airlineName} (${mawbInfo.airlineCode})`]);
    summaryData.push(['']);
  }

  summaryData.push(
    ['Archivo:', `${file.name}.xlsx`],
    ['Categoría:', file.category],
    ['Fecha Generación:', now],
    [''],
    ['ESTADÍSTICAS DEL ARCHIVO'],
    ['Total de Guías:', file.stats.totalRows],
    ['Total Consignatarios:', file.stats.uniqueConsignees],
    ['Entregas Consolidadas:', file.stats.consolidatedCount],
    [''],
    ['Valor Total:', `$${file.stats.totalValue.toFixed(2)}`],
    ['Peso Total:', `${file.stats.totalWeight.toFixed(1)} lb`],
    ['Valor Promedio:', `$${(file.stats.totalValue / file.stats.totalRows || 0).toFixed(2)}`],
    ['Peso Promedio:', `${(file.stats.totalWeight / file.stats.totalRows || 0).toFixed(1)} lb`],
    [''],
    ['DISTRIBUCIÓN POR PROVINCIA']
  );

  Object.entries(file.stats.byProvince).forEach(([province, count]) => {
    const pct = ((count / file.stats.totalRows) * 100).toFixed(1);
    summaryData.push([province, `${count} guías (${pct}%)`]);
  });
  
  // Add company footer to summary
  summaryData.push([''], ['']);
  getCompanyFooter().forEach(line => summaryData.push([line]));
  
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
  const cityData: (string | number)[][] = [['Ciudad', 'Guías', 'Peso Total (lb)', 'Valor Total (USD)', 'Consignatarios']];
  cityStats.forEach((stats, city) => {
    cityData.push([city, stats.count, stats.weight.toFixed(1), `$${stats.value.toFixed(2)}`, stats.consignees.size]);
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

  // Sheet 5: Instrucciones (only for pharma files)
  if (isFarma) {
    const instructionsData = [
      ['INSTRUCCIONES ESPECIALES - PRODUCTOS REGULADOS'],
      [''],
      ['Este archivo contiene productos que requieren trámites especiales'],
      ['para su despacho aduanero en la República de Panamá.'],
      [''],
      ['REQUISITOS MINSA:'],
      ['• Permiso de importación sanitaria vigente'],
      ['• Inspección física obligatoria en aeropuerto'],
      ['• Documentación de origen y certificados'],
      [''],
      ['PROCEDIMIENTO:'],
      ['1. Presentar este listado ante ventanilla MINSA Tocumen'],
      ['2. Coordinar hora de inspección con supervisor'],
      ['3. Tener disponible certificados de análisis'],
      ['4. Completar formulario de declaración sanitaria'],
      [''],
      ['CONTACTOS:'],
      [`MINSA Tocumen: ${REGULATORY_INFO.authorities.minsa.phone}`],
      [`Email: ${REGULATORY_INFO.authorities.minsa.email}`],
      [''],
      ['NOTA IMPORTANTE:'],
      ['No proceder con despacho hasta obtener autorización'],
      ['escrita del inspector sanitario asignado.'],
      [''],
      [''],
      ...getComplianceDeclaration().map(line => [line]),
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');
  }

  // Sheet 6: Declaración de Cumplimiento (for all files)
  const complianceData = [
    ...getComplianceDeclaration().map(line => [line]),
    [''],
    [`Fecha de Generación: ${now}`],
    ...(mawbInfo ? [[`MAWB: ${mawbInfo.formatted}`]] : []),
    [''],
    ...getCompanyFooter().map(line => [line]),
  ];
  const complianceSheet = XLSX.utils.aoa_to_sheet(complianceData);
  XLSX.utils.book_append_sheet(workbook, complianceSheet, 'Cumplimiento');

  return workbook;
}

export function exportFileToExcel(file: ExportFile, consigneeMap?: Map<string, Consignee>, mawbInfo?: MAWBExportInfo): Blob {
  const isFarma = file.id.includes('farma');
  const workbook = createExcelWorkbook(file, consigneeMap, isFarma, mawbInfo);
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadExportFile(file: ExportFile, consigneeMap?: Map<string, Consignee>, mawbInfo?: MAWBExportInfo): void {
  const blob = exportFileToExcel(file, consigneeMap, mawbInfo);
  saveAs(blob, `${file.name}.xlsx`);
}

export async function downloadAllFilesAsZip(
  files: ExportFile[],
  result: ExtendedProcessingResult,
  mawbInfo?: MAWBExportInfo
): Promise<void> {
  const zip = new JSZip();
  const dateStr = formatDate();
  const fullDateTime = formatFullDateTime();

  // Add Excel files
  files.forEach(file => {
    if (file.generated && file.rows.length > 0) {
      const blob = exportFileToExcel(file, result.consigneeMap, mawbInfo);
      zip.file(`${file.name}.xlsx`, blob);
    }
  });

  // Generate README.txt with MAWB branding
  const totalValue = files.reduce((sum, f) => sum + (f.generated ? f.stats.totalValue : 0), 0);
  const totalWeight = files.reduce((sum, f) => sum + (f.generated ? f.stats.totalWeight : 0), 0);
  
  let readme = `═══════════════════════════════════════════════════════════════\n`;
  readme += `        MANIFIESTO DE CARGA AÉREA\n`;
  if (mawbInfo) {
    readme += `        ${mawbInfo.formatted}\n`;
  }
  readme += `        ${COMPANY_INFO.name}\n`;
  readme += `═══════════════════════════════════════════════════════════════\n\n`;

  if (mawbInfo) {
    readme += `INFORMACIÓN DEL VUELO\n`;
    readme += `─────────────────────────────────────────────────────\n`;
    readme += `Master Air Waybill (MAWB): ${mawbInfo.formatted}\n`;
    readme += `Aerolínea: ${mawbInfo.airlineName} (Código ${mawbInfo.airlineCode})\n`;
    readme += `Aeropuerto de Destino: Tocumen International Airport (PTY)\n\n`;
  }

  readme += `Fecha de Proceso: ${fullDateTime}\n`;
  readme += `Ubicación: ${COMPANY_INFO.location}\n`;
  readme += `Total de Guías Procesadas: ${result.summary.totalRows.toLocaleString()}\n\n`;
  
  readme += `ARCHIVOS INCLUIDOS EN ESTE PAQUETE\n`;
  readme += `═══════════════════════════════════════════════════════\n\n`;

  files.filter(f => f.generated).forEach((file, idx) => {
    readme += `${idx + 1}. ${file.name}.xlsx\n`;
    readme += `   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    readme += `   Descripción: ${file.category}\n`;
    readme += `   Cantidad: ${file.stats.totalRows.toLocaleString()} guías\n`;
    readme += `   Valor: $${file.stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    readme += `   Peso: ${file.stats.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lb\n\n`;
  });

  readme += `\nESTADÍSTICAS GENERALES\n`;
  readme += `═══════════════════════════════════════════════════════\n`;
  readme += `- Total Consignatarios: ${result.consigneeStats.totalConsignees.toLocaleString()}\n`;
  readme += `- Tasa de Consolidación: ${((result.consigneeStats.consolidatablePackages / result.summary.totalRows) * 100).toFixed(1)}%\n`;
  readme += `- Valor Total: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  readme += `- Peso Total: ${totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lb\n\n`;

  readme += `\nINFORMACIÓN REGULATORIA\n`;
  readme += `═══════════════════════════════════════════════════════\n`;
  readme += `Los archivos "Medicamentos", "Suplementos", "ProductosMedicos" y\n`;
  readme += `"Veterinarios" contienen productos regulados que requieren:\n`;
  readme += `- Permiso MINSA previo (medicamentos)\n`;
  readme += `- Notificación sanitaria (suplementos)\n`;
  readme += `- Registro sanitario (productos médicos)\n`;
  readme += `- Permiso MIDA (productos veterinarios)\n\n`;

  readme += `\n${getCompanyFooter().join('\n')}\n`;

  // Create README file name with MAWB
  const readmeName = mawbInfo 
    ? `README_${mawbInfo.airlineCode}-${mawbInfo.mawb.replace(/^.*-/, '')}.txt`
    : 'README.txt';
  zip.file(readmeName, readme);

  const content = await zip.generateAsync({ type: 'blob' });
  
  // Create ZIP file name with MAWB
  const zipName = mawbInfo
    ? `MAWB_${mawbInfo.airlineCode}-${mawbInfo.mawb.replace(/^.*-/, '')}_Completo.zip`
    : `${COMPANY_INFO.shortName.replace(/\s/g, '_')}_Manifiesto_${dateStr}.zip`;
    
  saveAs(content, zipName);
}
