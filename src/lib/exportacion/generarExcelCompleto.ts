/**
 * GENERACIÓN DE EXCEL COMPLETO
 * 
 * Genera un reporte Excel con 3 hojas:
 * - Resumen Ejecutivo
 * - Detalle de Paquetes
 * - Productos Restringidos
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FilaProcesada } from '@/lib/workers/procesador.worker';
import { ManifiestoGuardado } from '@/lib/db/database';

/**
 * Genera Excel completo con todas las hojas
 */
export async function generarExcelCompleto(
  manifiesto: ManifiestoGuardado,
  paquetes: FilaProcesada[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // ═══════════════════════════════════════════════════════
  // HOJA 1: RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════
  onProgress?.(10);

  const valorCIFTotal = paquetes.reduce((sum, p) => sum + (p.valorUSD || 0), 0);
  const pesoTotal = paquetes.reduce((sum, p) => sum + (p.peso || 0), 0);

  // Calcular tributos por categoría
  let tributosTotal = 0;
  const porCategoria: Record<string, { cantidad: number; valor: number; tributos: number }> = {
    'A': { cantidad: 0, valor: 0, tributos: 0 },
    'B': { cantidad: 0, valor: 0, tributos: 0 },
    'C': { cantidad: 0, valor: 0, tributos: 0 },
    'D': { cantidad: 0, valor: 0, tributos: 0 },
    'Sin Clasificar': { cantidad: 0, valor: 0, tributos: 0 }
  };

  paquetes.forEach(p => {
    const cat = p.categoriaAduanera || 'Sin Clasificar';
    const valor = p.valorUSD || 0;
    let tributo = 0;

    // Calcular tributo según categoría
    switch (cat) {
      case 'A': tributo = 0; break;
      case 'B': tributo = 0; break; // De minimis exento
      case 'C': tributo = valor * 0.15; break;
      case 'D': tributo = valor * 0.25; break;
      default: tributo = 0;
    }

    if (!porCategoria[cat]) {
      porCategoria[cat] = { cantidad: 0, valor: 0, tributos: 0 };
    }
    porCategoria[cat].cantidad++;
    porCategoria[cat].valor += valor;
    porCategoria[cat].tributos += tributo;
    tributosTotal += tributo;
  });

  const resumenData = [
    ['RESUMEN EJECUTIVO DEL MANIFIESTO'],
    [''],
    ['INFORMACIÓN GENERAL'],
    ['MAWB:', manifiesto.mawb || 'N/A'],
    ['Fecha de Proceso:', new Date(manifiesto.fechaProcesamiento).toLocaleString()],
    ['Fecha de Generación:', new Date().toLocaleString()],
    [''],
    ['TOTALES'],
    ['Total de Paquetes:', paquetes.length],
    ['Valor CIF Total (USD):', `$${valorCIFTotal.toFixed(2)}`],
    ['Peso Total (LB):', `${pesoTotal.toFixed(2)} LB`],
    ['Tributos Totales (USD):', `$${tributosTotal.toFixed(2)}`],
    ['TOTAL A COBRAR (USD):', `$${(valorCIFTotal + tributosTotal).toFixed(2)}`],
    [''],
    ['DISTRIBUCIÓN POR CATEGORÍA ADUANERA'],
    ['Categoría', 'Cantidad', 'Valor USD', 'Tributos USD'],
    ['A - Documentos', porCategoria['A'].cantidad, `$${porCategoria['A'].valor.toFixed(2)}`, `$${porCategoria['A'].tributos.toFixed(2)}`],
    ['B - De Minimis (≤$100)', porCategoria['B'].cantidad, `$${porCategoria['B'].valor.toFixed(2)}`, `$${porCategoria['B'].tributos.toFixed(2)}`],
    ['C - Medio ($100-$2,000)', porCategoria['C'].cantidad, `$${porCategoria['C'].valor.toFixed(2)}`, `$${porCategoria['C'].tributos.toFixed(2)}`],
    ['D - Alto (≥$2,000)', porCategoria['D'].cantidad, `$${porCategoria['D'].valor.toFixed(2)}`, `$${porCategoria['D'].tributos.toFixed(2)}`],
    [''],
    ['ALERTAS'],
    ['Paquetes con Restricciones:', paquetes.filter(p => p.requierePermiso).length],
    ['Paquetes con Errores:', paquetes.filter(p => p.errores && p.errores.length > 0).length],
    ['Paquetes con Advertencias:', paquetes.filter(p => p.advertencias && p.advertencias.length > 0).length]
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  
  // Ajustar anchos de columna
  wsResumen['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

  // ═══════════════════════════════════════════════════════
  // HOJA 2: DETALLE DE PAQUETES
  // ═══════════════════════════════════════════════════════
  onProgress?.(40);

  const headersDetalle = [
    '#', 'Guía Aérea', 'Consignatario', 'Identificación',
    'Descripción', 'Categoría Producto', 'Categoría Aduanera',
    'Valor CIF', 'DAI', 'ISC', 'ITBMS', 'Total Tributos',
    'Total a Pagar', 'Estado', 'Restricciones'
  ];

  const detalleData: (string | number)[][] = [headersDetalle];

  paquetes.forEach((p, idx) => {
    const valor = p.valorUSD || 0;
    let dai = 0, isc = 0, itbms = 0;

    // Calcular tributos según categoría
    if (p.categoriaAduanera === 'C') {
      dai = valor * 0.05;
      itbms = valor * 0.07;
    } else if (p.categoriaAduanera === 'D') {
      dai = valor * 0.10;
      isc = valor * 0.05;
      itbms = valor * 0.07;
    }

    const totalTributos = dai + isc + itbms;
    const totalPagar = valor + totalTributos;

    detalleData.push([
      idx + 1,
      p.tracking || '',
      p.destinatario || '',
      p.identificacion || '',
      (p.descripcion || '').substring(0, 80),
      p.categoria || '',
      p.categoriaAduanera || '',
      `$${valor.toFixed(2)}`,
      `$${dai.toFixed(2)}`,
      `$${isc.toFixed(2)}`,
      `$${itbms.toFixed(2)}`,
      `$${totalTributos.toFixed(2)}`,
      `$${totalPagar.toFixed(2)}`,
      p.errores && p.errores.length > 0 ? 'Con errores' : 'OK',
      p.requierePermiso ? (p.autoridades || []).join(', ') : 'Ninguna'
    ]);
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
  
  wsDetalle['!cols'] = [
    { wch: 5 },   // #
    { wch: 18 },  // Guía
    { wch: 25 },  // Consignatario
    { wch: 15 },  // Identificación
    { wch: 40 },  // Descripción
    { wch: 18 },  // Cat. Producto
    { wch: 15 },  // Cat. Aduanera
    { wch: 12 },  // Valor CIF
    { wch: 10 },  // DAI
    { wch: 10 },  // ISC
    { wch: 10 },  // ITBMS
    { wch: 12 },  // Total Tributos
    { wch: 12 },  // Total Pagar
    { wch: 12 },  // Estado
    { wch: 25 }   // Restricciones
  ];

  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle de Paquetes');

  // ═══════════════════════════════════════════════════════
  // HOJA 3: PRODUCTOS RESTRINGIDOS (si hay)
  // ═══════════════════════════════════════════════════════
  onProgress?.(70);

  const paquetesRestringidos = paquetes.filter(p => p.requierePermiso);

  if (paquetesRestringidos.length > 0) {
    const headersRestringidos = [
      '#', 'Guía', 'Descripción', 'Categoría', 'Autoridad Requerida', 'Estado'
    ];

    const restringidosData: (string | number)[][] = [headersRestringidos];

    paquetesRestringidos.forEach((p, idx) => {
      restringidosData.push([
        idx + 1,
        p.tracking || '',
        (p.descripcion || '').substring(0, 60),
        p.categoria || '',
        (p.autoridades || []).join(', ') || 'Por determinar',
        'Pendiente revisión'
      ]);
    });

    const wsRestringidos = XLSX.utils.aoa_to_sheet(restringidosData);
    
    wsRestringidos['!cols'] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 50 },
      { wch: 20 },
      { wch: 25 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, wsRestringidos, 'Productos Restringidos');
  }

  // ═══════════════════════════════════════════════════════
  // GENERAR ARCHIVO FINAL
  // ═══════════════════════════════════════════════════════
  onProgress?.(90);

  const buffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    compression: true
  });

  onProgress?.(100);

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Descarga el Excel completo
 */
export async function descargarExcelCompleto(
  manifiesto: ManifiestoGuardado,
  paquetes: FilaProcesada[],
  onProgress?: (progress: number) => void
): Promise<void> {
  const blob = await generarExcelCompleto(manifiesto, paquetes, onProgress);

  const fechaHoy = new Date().toISOString().split('T')[0];
  const mawbLimpio = (manifiesto.mawb || 'Manifiesto').replace(/[^a-zA-Z0-9-]/g, '_');
  const nombreArchivo = `${mawbLimpio}_${fechaHoy}.xlsx`;

  saveAs(blob, nombreArchivo);
}

export default {
  generarExcelCompleto,
  descargarExcelCompleto
};
