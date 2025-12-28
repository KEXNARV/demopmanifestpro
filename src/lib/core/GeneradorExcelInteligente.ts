// ============================================
// GENERADOR EXCEL INTELIGENTE - IPL CUSTOMS AI
// Archivo único consolidado con pestañas inteligentes
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ManifestRow } from '@/types/manifest';
import { Liquidacion } from '@/types/aduanas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// PALABRAS CLAVE PHARMA (MINSA/APA)
// ============================================
const PALABRAS_CLAVE_PHARMA = [
  'vitamin', 'vitamina', 'supplement', 'suplemento',
  'skin care', 'skincare', 'cosmetic', 'cosmetico', 'cosmético',
  'health', 'salud', 'medicine', 'medicamento', 'medicina',
  'food', 'alimento', 'dietary', 'nutrition', 'nutricional',
  'pharmaceutical', 'farmaceutico', 'farmacéutico',
  'capsule', 'cápsula', 'tablet', 'tableta', 'pill',
  'cream', 'crema', 'lotion', 'loción', 'serum',
  'protein', 'proteina', 'proteína', 'omega', 'collagen', 'colágeno',
  'shampoo', 'conditioner', 'acondicionador',
  'beauty', 'belleza', 'makeup', 'maquillaje'
];

// ============================================
// DESCRIPCIONES GENÉRICAS PARA REVISIÓN HTS
// ============================================
const DESCRIPCIONES_GENERICAS = [
  'personal effects', 'efectos personales',
  'merchandise', 'mercancía', 'mercancia',
  'gift', 'regalo', 'present',
  'goods', 'productos', 'items',
  'misc', 'miscellaneous', 'varios',
  'parts', 'partes', 'repuestos',
  'sample', 'muestra', 'samples',
  'equipment', 'equipo'
];

// ============================================
// INTERFACES
// ============================================
export interface DatosExcelInteligente {
  paquetes: ManifestRow[];
  liquidaciones: Liquidacion[];
  mawb: string;
  fechaProceso: Date;
}

export interface ResultadoAnalisisAI {
  inconsistencias: Array<{
    guia: string;
    tipo: string;
    mensaje: string;
    severidad: 'alta' | 'media' | 'baja';
  }>;
  alertas: string[];
}

// ============================================
// FUNCIONES DE ANÁLISIS AI
// ============================================

/**
 * Analiza consistencia peso vs bultos usando lógica AI
 */
function analizarConsistenciaPesoBultos(paquetes: ManifestRow[]): ResultadoAnalisisAI {
  const inconsistencias: ResultadoAnalisisAI['inconsistencias'] = [];
  const alertas: string[] = [];

  // Calcular peso promedio por categoría
  const pesosPromedio: Record<string, { total: number; count: number }> = {};
  
  paquetes.forEach(p => {
    const cat = p.category || 'general';
    if (!pesosPromedio[cat]) {
      pesosPromedio[cat] = { total: 0, count: 0 };
    }
    pesosPromedio[cat].total += p.weight;
    pesosPromedio[cat].count++;
  });

  // Detectar outliers
  paquetes.forEach(p => {
    const cat = p.category || 'general';
    const promedio = pesosPromedio[cat].count > 0 
      ? pesosPromedio[cat].total / pesosPromedio[cat].count 
      : 0;
    
    // Si el peso es 5x mayor al promedio de la categoría
    if (promedio > 0 && p.weight > promedio * 5) {
      inconsistencias.push({
        guia: p.trackingNumber,
        tipo: 'PESO_ANORMAL',
        mensaje: `Peso ${p.weight.toFixed(2)}lb es 5x mayor al promedio (${promedio.toFixed(2)}lb)`,
        severidad: 'alta'
      });
    }

    // Personal Effects con valor alto = auditoría manual
    const descLower = (p.description || '').toLowerCase();
    if (descLower.includes('personal effects') || descLower.includes('efectos personales')) {
      if (p.valueUSD > 200) {
        inconsistencias.push({
          guia: p.trackingNumber,
          tipo: 'PERSONAL_EFFECTS_ALTO_VALOR',
          mensaje: `"Personal Effects" con valor $${p.valueUSD.toFixed(2)} requiere auditoría`,
          severidad: 'alta'
        });
      }
    }

    // Ratio peso/valor anormal
    if (p.weight > 0 && p.valueUSD > 0) {
      const ratioValorPeso = p.valueUSD / p.weight;
      if (ratioValorPeso > 500) {
        inconsistencias.push({
          guia: p.trackingNumber,
          tipo: 'RATIO_VALOR_PESO',
          mensaje: `Ratio valor/peso ($${ratioValorPeso.toFixed(0)}/lb) inusualmente alto`,
          severidad: 'media'
        });
      }
    }
  });

  if (inconsistencias.length > 0) {
    alertas.push(`Se detectaron ${inconsistencias.length} inconsistencias peso/bultos`);
  }

  return { inconsistencias, alertas };
}

/**
 * Detecta si una guía es PHARMA
 */
function esPharma(descripcion: string): boolean {
  const desc = descripcion.toLowerCase();
  return PALABRAS_CLAVE_PHARMA.some(keyword => desc.includes(keyword.toLowerCase()));
}

/**
 * Detecta si requiere revisión HTS
 */
function requiereRevisionHTS(paquete: ManifestRow, liquidacion?: Liquidacion): boolean {
  const desc = (paquete.description || '').toLowerCase();
  
  // Sin código HTS
  if (!liquidacion?.hsCode) return true;
  
  // Descripción genérica
  if (DESCRIPCIONES_GENERICAS.some(g => desc.includes(g.toLowerCase()))) {
    return true;
  }
  
  // Personal Effects con valor alto
  if ((desc.includes('personal effects') || desc.includes('efectos personales')) && paquete.valueUSD > 150) {
    return true;
  }
  
  return false;
}

// ============================================
// GENERADOR PRINCIPAL
// ============================================

export async function generarExcelInteligente(
  datos: DatosExcelInteligente,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const wb = XLSX.utils.book_new();
  const { paquetes, liquidaciones, mawb, fechaProceso } = datos;

  onProgress?.(5);

  // Crear mapa de liquidaciones para búsqueda rápida
  const liqMap = new Map<string, Liquidacion>();
  liquidaciones.forEach(l => liqMap.set(l.numeroGuia, l));

  // ══════════════════════════════════════════════════════════
  // CLASIFICAR PAQUETES EN CATEGORÍAS
  // ══════════════════════════════════════════════════════════
  
  const liquidacionMas100: Array<{ paquete: ManifestRow; liquidacion: Liquidacion }> = [];
  const deMinimisTodos: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];
  const pharma: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];
  const revisionHTS: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion; motivo: string }> = [];

  paquetes.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const desc = paquete.description || '';
    
    // Primero: verificar si es PHARMA (prioridad sobre valor)
    if (esPharma(desc)) {
      pharma.push({ paquete, liquidacion: liq });
      return;
    }
    
    // Verificar si requiere revisión HTS
    if (requiereRevisionHTS(paquete, liq)) {
      const motivos: string[] = [];
      if (!liq?.hsCode) motivos.push('Sin código HTS');
      const descLower = desc.toLowerCase();
      if (DESCRIPCIONES_GENERICAS.some(g => descLower.includes(g))) {
        motivos.push('Descripción genérica');
      }
      if ((descLower.includes('personal effects') || descLower.includes('efectos personales')) && paquete.valueUSD > 150) {
        motivos.push('Personal Effects alto valor');
      }
      
      revisionHTS.push({ 
        paquete, 
        liquidacion: liq, 
        motivo: motivos.join(', ') || 'Requiere clasificación'
      });
      return;
    }
    
    // Clasificar por valor
    if (paquete.valueUSD >= 100) {
      if (liq) {
        liquidacionMas100.push({ paquete, liquidacion: liq });
      }
    } else {
      deMinimisTodos.push({ paquete, liquidacion: liq });
    }
  });

  onProgress?.(20);

  // Análisis AI
  const analisisAI = analizarConsistenciaPesoBultos(paquetes);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA 1: +100 (LIQUIDACIÓN)
  // Formato: RUC/Cédula | Nombre | Guía | CIF | DAI | ITBMS | Total
  // ══════════════════════════════════════════════════════════
  
  const headerLiquidacion = [
    'RUC/Cédula', 'Consignatario', 'Guía', 'Descripción',
    'CIF USD', 'DAI %', 'DAI USD', 'ITBMS %', 'ITBMS USD', 
    'Tasa Aduana', 'TOTAL USD', 'HTS Code', 'Estado'
  ];

  const dataLiquidacion: (string | number)[][] = [headerLiquidacion];
  
  liquidacionMas100.forEach(({ paquete, liquidacion }) => {
    dataLiquidacion.push([
      paquete.identification || 'S/I',
      paquete.recipient || '',
      paquete.trackingNumber,
      (paquete.description || '').substring(0, 60),
      liquidacion.valorCIF.toFixed(2),
      liquidacion.percentDAI.toFixed(2),
      liquidacion.montoDAI.toFixed(2),
      liquidacion.percentITBMS.toFixed(2),
      liquidacion.montoITBMS.toFixed(2),
      liquidacion.tasaAduanera.toFixed(2),
      liquidacion.totalAPagar.toFixed(2),
      liquidacion.hsCode || 'PENDIENTE',
      liquidacion.estado.toUpperCase()
    ]);
  });

  // Agregar fila de totales
  if (liquidacionMas100.length > 0) {
    const totales = liquidacionMas100.reduce((acc, { liquidacion }) => ({
      cif: acc.cif + liquidacion.valorCIF,
      dai: acc.dai + liquidacion.montoDAI,
      itbms: acc.itbms + liquidacion.montoITBMS,
      tasa: acc.tasa + liquidacion.tasaAduanera,
      total: acc.total + liquidacion.totalAPagar
    }), { cif: 0, dai: 0, itbms: 0, tasa: 0, total: 0 });

    dataLiquidacion.push([]);
    dataLiquidacion.push([
      '', 'TOTALES', '', '',
      totales.cif.toFixed(2), '',
      totales.dai.toFixed(2), '',
      totales.itbms.toFixed(2),
      totales.tasa.toFixed(2),
      totales.total.toFixed(2), '', ''
    ]);
  }

  const wsLiquidacion = XLSX.utils.aoa_to_sheet(dataLiquidacion);
  wsLiquidacion['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 40 },
    { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLiquidacion, '+100');

  onProgress?.(35);

  // ══════════════════════════════════════════════════════════
  // PESTAÑAS -100 (1) y -100 (2): DE MINIMIS
  // Dividir en 2 grupos si > 100 registros
  // ══════════════════════════════════════════════════════════
  
  const headerDeMinimis = [
    'RUC/Cédula', 'Consignatario', 'Guía', 'Descripción', 
    'Valor USD', 'Peso LB', 'Teléfono', 'Provincia', 'Estado'
  ];

  if (deMinimisTodos.length > 0) {
    const mitad = Math.ceil(deMinimisTodos.length / 2);
    const necesitaDividir = deMinimisTodos.length > 100;

    const crearHojaDeMinimis = (
      items: typeof deMinimisTodos, 
      nombreHoja: string
    ) => {
      const data: (string | number)[][] = [headerDeMinimis];
      
      items.forEach(({ paquete }) => {
        data.push([
          paquete.identification || 'S/I',
          paquete.recipient || '',
          paquete.trackingNumber,
          (paquete.description || '').substring(0, 50),
          paquete.valueUSD.toFixed(2),
          paquete.weight.toFixed(2),
          paquete.phone || '',
          paquete.detectedProvince || paquete.province || '',
          'DE MINIMIS'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 40 },
        { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    };

    if (necesitaDividir) {
      crearHojaDeMinimis(deMinimisTodos.slice(0, mitad), '-100 (1)');
      crearHojaDeMinimis(deMinimisTodos.slice(mitad), '-100 (2)');
    } else {
      crearHojaDeMinimis(deMinimisTodos, '-100');
    }
  }

  onProgress?.(55);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA PHARMA: Productos MINSA/APA
  // ══════════════════════════════════════════════════════════
  
  if (pharma.length > 0) {
    const headerPharma = [
      'Guía', 'Consignatario', 'Descripción', 'Valor USD',
      'Palabras Detectadas', 'Autoridad', 'Acción Requerida'
    ];

    const dataPharma: (string | number)[][] = [headerPharma];
    
    pharma.forEach(({ paquete }) => {
      const desc = paquete.description || '';
      const palabrasEncontradas = PALABRAS_CLAVE_PHARMA
        .filter(kw => desc.toLowerCase().includes(kw.toLowerCase()))
        .slice(0, 3)
        .join(', ');

      dataPharma.push([
        paquete.trackingNumber,
        paquete.recipient || '',
        desc.substring(0, 60),
        paquete.valueUSD.toFixed(2),
        palabrasEncontradas,
        'MINSA / APA',
        'Requiere verificación sanitaria'
      ]);
    });

    const wsPharma = XLSX.utils.aoa_to_sheet(dataPharma);
    wsPharma['!cols'] = [
      { wch: 18 }, { wch: 25 }, { wch: 45 }, { wch: 12 },
      { wch: 25 }, { wch: 15 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPharma, 'PHARMA');
  }

  onProgress?.(70);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA REVISIÓN HTS: Descripciones genéricas o sin código
  // ══════════════════════════════════════════════════════════
  
  if (revisionHTS.length > 0) {
    const headerRevision = [
      'Guía', 'Consignatario', 'Descripción', 'Valor USD',
      'Peso LB', 'Motivo Revisión', 'HTS Actual', 'Alerta AI'
    ];

    const dataRevision: (string | number)[][] = [headerRevision];
    
    revisionHTS.forEach(({ paquete, liquidacion, motivo }) => {
      // Buscar alertas AI para esta guía
      const alertasGuia = analisisAI.inconsistencias
        .filter(i => i.guia === paquete.trackingNumber)
        .map(i => i.mensaje)
        .join('; ');

      dataRevision.push([
        paquete.trackingNumber,
        paquete.recipient || '',
        (paquete.description || '').substring(0, 50),
        paquete.valueUSD.toFixed(2),
        paquete.weight.toFixed(2),
        motivo,
        liquidacion?.hsCode || 'SIN CÓDIGO',
        alertasGuia || '-'
      ]);
    });

    const wsRevision = XLSX.utils.aoa_to_sheet(dataRevision);
    wsRevision['!cols'] = [
      { wch: 18 }, { wch: 25 }, { wch: 40 }, { wch: 12 },
      { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRevision, 'REVISIÓN HTS');
  }

  onProgress?.(85);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA RESUMEN: Estadísticas y alertas AI
  // ══════════════════════════════════════════════════════════
  
  const resumenData = [
    ['IPL CUSTOMS AI - REPORTE CONSOLIDADO INTELIGENTE'],
    [''],
    ['INFORMACIÓN DEL MANIFIESTO'],
    ['MAWB:', mawb || 'N/A'],
    ['Fecha Proceso:', format(fechaProceso, 'PPP', { locale: es })],
    ['Generado:', format(new Date(), 'PPP HH:mm', { locale: es })],
    [''],
    ['═══════════════════════════════════════════'],
    ['DISTRIBUCIÓN DE PAQUETES'],
    ['═══════════════════════════════════════════'],
    [''],
    ['Categoría', 'Cantidad', 'Pestaña'],
    ['Liquidación (≥$100)', liquidacionMas100.length, '+100'],
    ['De Minimis (<$100)', deMinimisTodos.length, deMinimisTodos.length > 100 ? '-100 (1/2)' : '-100'],
    ['PHARMA (MINSA/APA)', pharma.length, 'PHARMA'],
    ['Revisión HTS', revisionHTS.length, 'REVISIÓN HTS'],
    [''],
    ['TOTAL PAQUETES:', paquetes.length, ''],
    [''],
    ['═══════════════════════════════════════════'],
    ['ANÁLISIS AI - CONSISTENCIA PESO/BULTOS'],
    ['═══════════════════════════════════════════'],
    [''],
    ['Inconsistencias Detectadas:', analisisAI.inconsistencias.length, '']
  ];

  // Agregar detalles de inconsistencias
  if (analisisAI.inconsistencias.length > 0) {
    resumenData.push(['']);
    resumenData.push(['Guía', 'Tipo', 'Mensaje']);
    analisisAI.inconsistencias.slice(0, 10).forEach(inc => {
      resumenData.push([inc.guia, inc.tipo, inc.mensaje]);
    });
    if (analisisAI.inconsistencias.length > 10) {
      resumenData.push(['', '', `... y ${analisisAI.inconsistencias.length - 10} más`]);
    }
  }

  // Totales financieros
  const totalCIF = liquidacionMas100.reduce((s, { liquidacion }) => s + liquidacion.valorCIF, 0);
  const totalTributos = liquidacionMas100.reduce((s, { liquidacion }) => s + liquidacion.totalTributos, 0);
  const totalAPagar = liquidacionMas100.reduce((s, { liquidacion }) => s + liquidacion.totalAPagar, 0);

  resumenData.push(['']);
  resumenData.push(['═══════════════════════════════════════════']);
  resumenData.push(['RESUMEN FINANCIERO (Liquidación +100)']);
  resumenData.push(['═══════════════════════════════════════════']);
  resumenData.push(['']);
  resumenData.push(['Total CIF:', `$${totalCIF.toFixed(2)}`, '']);
  resumenData.push(['Total Tributos:', `$${totalTributos.toFixed(2)}`, '']);
  resumenData.push(['TOTAL A PAGAR:', `$${totalAPagar.toFixed(2)}`, '']);

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 40 }];
  
  // Insertar al inicio
  wb.SheetNames.unshift('RESUMEN');
  wb.Sheets['RESUMEN'] = wsResumen;

  onProgress?.(95);

  // ══════════════════════════════════════════════════════════
  // GENERAR ARCHIVO
  // ══════════════════════════════════════════════════════════
  
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

// ============================================
// FUNCIÓN DE DESCARGA
// ============================================

export async function descargarExcelInteligente(
  datos: DatosExcelInteligente,
  onProgress?: (progress: number) => void
): Promise<void> {
  const blob = await generarExcelInteligente(datos, onProgress);
  
  const mawbClean = (datos.mawb || 'Manifiesto').replace(/[^a-zA-Z0-9-]/g, '_');
  const fecha = format(new Date(), 'yyyyMMdd_HHmm');
  const nombreArchivo = `IPL_Customs_${mawbClean}_${fecha}.xlsx`;
  
  saveAs(blob, nombreArchivo);
}

export default {
  generarExcelInteligente,
  descargarExcelInteligente,
  PALABRAS_CLAVE_PHARMA,
  DESCRIPCIONES_GENERICAS
};
