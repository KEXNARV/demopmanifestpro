// ============================================
// GENERADOR EXCEL CORREDOR IDÓNEO - IPL CUSTOMS AI
// Formato exacto requerido por Corredor de Aduanas
// PESTAÑAS: +100 | -100 (1) | -100 (2) | PHARMA | MAWB
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ManifestRow } from '@/types/manifest';
import { Liquidacion } from '@/types/aduanas';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// CONFIGURACIÓN DE MORA (BOLETAS REALES ANA)
// ============================================
const CONFIG_MORA = {
  diasVencimiento1: 3,   // Primer vencimiento
  diasVencimiento2: 8,   // Segundo vencimiento
  diasVencimiento3: 15,  // Tercer vencimiento
  recargoMora1: 0.10,    // 10% de recargo
  recargoMora2: 0.20,    // 20% de recargo
};

// ============================================
// PALABRAS CLAVE PHARMA (MINSA/APA)
// ============================================
export const PALABRAS_CLAVE_PHARMA = [
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
// HTS CODES PHARMA (30XX = farmaceuticos, 33XX = cosméticos)
// ============================================
const HTS_PHARMA_PREFIXES = ['30', '33'];

// ============================================
// DESCRIPCIONES GENÉRICAS PARA REVISIÓN HTS
// ============================================
export const DESCRIPCIONES_GENERICAS = [
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
  pesoBrutoTotal?: number;
}

export interface ResultadoValidacionPeso {
  valido: boolean;
  pesoBrutoTotal: number;
  pesoNetoCalculado: number;
  diferencia: number;
  porcentajeDiferencia: number;
  mensaje: string;
}

export interface EscenarioPago {
  fechaVencimiento: Date;
  montoBase: number;
  recargo: number;
  montoTotal: number;
  etiqueta: string;
}

// ============================================
// FORMATO COLUMNAS CORREDOR (ORDEN EXACTO)
// ============================================
const HEADER_FORMATO_CORREDOR = [
  'MAWB',
  'AWB',
  'CONSIGNEE',
  'ADDRESS',
  'CITY',
  'DESCRIPTION',
  'QUANTITY',
  'WEIGHT',
  'FREIGHT',
  'VALUE',
  'TOTAL VALUE',
  'PHARMA',
  'N° CONSECUTIVO'
];

const HEADER_FORMATO_CORREDOR_LIQUIDACION = [
  ...HEADER_FORMATO_CORREDOR,
  'DAI',
  'ITBMS',
  'TASA SISTEMA',
  'TOTAL A PAGAR'
];

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Valida integridad de pesos antes de permitir descarga
 */
export async function validarIntegridadPesos(
  paquetes: ManifestRow[], 
  pesoBrutoTotal?: number
): Promise<ResultadoValidacionPeso> {
  const pesoNetoCalculado = paquetes.reduce((sum, p) => sum + (p.weight || 0), 0);
  
  if (!pesoBrutoTotal || pesoBrutoTotal <= 0) {
    return {
      valido: true,
      pesoBrutoTotal: pesoNetoCalculado,
      pesoNetoCalculado,
      diferencia: 0,
      porcentajeDiferencia: 0,
      mensaje: 'Peso bruto no declarado - usando suma de pesos individuales'
    };
  }

  const diferencia = Math.abs(pesoBrutoTotal - pesoNetoCalculado);
  const porcentajeDiferencia = (diferencia / pesoBrutoTotal) * 100;

  // Tolerancia del 10%
  if (porcentajeDiferencia > 10) {
    // Registrar alerta en base de datos
    try {
      await supabase.from('alertas_peso').insert({
        guia: 'CONSOLIDADO',
        mawb: paquetes[0]?.mawb || null,
        peso_bruto_declarado: pesoBrutoTotal,
        peso_neto_calculado: pesoNetoCalculado,
        diferencia,
        porcentaje_diferencia: porcentajeDiferencia,
        severidad: porcentajeDiferencia > 20 ? 'CRITICA' : 'ALTA'
      });
    } catch (e) {
      console.warn('No se pudo registrar alerta de peso:', e);
    }

    return {
      valido: false,
      pesoBrutoTotal,
      pesoNetoCalculado,
      diferencia,
      porcentajeDiferencia,
      mensaje: `⚠️ DISCREPANCIA: Peso bruto (${pesoBrutoTotal.toFixed(2)} lb) difiere ${porcentajeDiferencia.toFixed(1)}% de suma individual (${pesoNetoCalculado.toFixed(2)} lb)`
    };
  }

  return {
    valido: true,
    pesoBrutoTotal,
    pesoNetoCalculado,
    diferencia,
    porcentajeDiferencia,
    mensaje: 'Pesos validados correctamente'
  };
}

/**
 * Detecta si una guía es PHARMA por HTS o descripción
 * PRIORIDAD: HTS 30XX/33XX > Palabras clave en descripción
 */
function esPharma(descripcion: string, htsCode?: string): boolean {
  // Primero: verificar HTS (30XX = farmacéuticos, 33XX = cosméticos)
  if (htsCode) {
    const htsPrefijo = htsCode.replace('.', '').substring(0, 2);
    if (HTS_PHARMA_PREFIXES.includes(htsPrefijo)) {
      return true;
    }
  }

  // Segundo: verificar palabras clave en descripción
  const desc = descripcion.toLowerCase();
  return PALABRAS_CLAVE_PHARMA.some(keyword => desc.includes(keyword.toLowerCase()));
}

/**
 * Calcula escenarios de pago según fechas de vencimiento
 */
function calcularEscenariosPago(montoBase: number, fechaRegistro: Date): EscenarioPago[] {
  return [
    {
      fechaVencimiento: addDays(fechaRegistro, CONFIG_MORA.diasVencimiento1),
      montoBase,
      recargo: 0,
      montoTotal: montoBase,
      etiqueta: 'PAGO PUNTUAL'
    },
    {
      fechaVencimiento: addDays(fechaRegistro, CONFIG_MORA.diasVencimiento2),
      montoBase,
      recargo: montoBase * CONFIG_MORA.recargoMora1,
      montoTotal: montoBase * (1 + CONFIG_MORA.recargoMora1),
      etiqueta: 'CON 10% MORA'
    },
    {
      fechaVencimiento: addDays(fechaRegistro, CONFIG_MORA.diasVencimiento3),
      montoBase,
      recargo: montoBase * CONFIG_MORA.recargoMora2,
      montoTotal: montoBase * (1 + CONFIG_MORA.recargoMora2),
      etiqueta: 'CON 20% MORA'
    }
  ];
}

// ============================================
// FUNCIÓN PARA CREAR FILA EN FORMATO CORREDOR
// ============================================

function crearFilaFormatoCorredor(
  paquete: ManifestRow,
  mawb: string,
  consecutivo: number,
  esPharmaFlag: boolean,
  liquidacion?: Liquidacion,
  incluirImpuestos = false
): (string | number)[] {
  const filaBase = [
    mawb,
    paquete.trackingNumber,
    paquete.recipient || '',
    paquete.address || '',
    paquete.city || paquete.detectedCity || '',
    (paquete.description || '').substring(0, 80),
    1, // QUANTITY (asumimos 1 por guía)
    paquete.weight?.toFixed(2) || '0.00',
    liquidacion?.valorFlete?.toFixed(2) || '0.00', // FREIGHT
    paquete.valueUSD?.toFixed(2) || '0.00', // VALUE
    (paquete.valueUSD + (liquidacion?.valorFlete || 0))?.toFixed(2) || '0.00', // TOTAL VALUE
    esPharmaFlag ? 'SI' : 'NO',
    consecutivo
  ];

  if (incluirImpuestos && liquidacion) {
    // Añadir columnas de impuestos para +100
    return [
      ...filaBase,
      liquidacion.montoDAI?.toFixed(2) || '0.00',
      liquidacion.montoITBMS?.toFixed(2) || '0.00',
      liquidacion.tasaAduanera?.toFixed(2) || '2.00',
      liquidacion.totalAPagar?.toFixed(2) || '0.00'
    ];
  }

  return filaBase;
}

// ============================================
// GENERADOR PRINCIPAL - FORMATO CORREDOR
// ============================================

export async function generarExcelInteligente(
  datos: DatosExcelInteligente,
  onProgress?: (progress: number) => void,
  omitirValidacionPeso = false
): Promise<Blob> {
  const wb = XLSX.utils.book_new();
  const { paquetes, liquidaciones, mawb, fechaProceso, pesoBrutoTotal } = datos;

  onProgress?.(5);

  // ══════════════════════════════════════════════════════════
  // VALIDAR INTEGRIDAD DE PESOS (BLOQUEANTE)
  // ══════════════════════════════════════════════════════════
  if (!omitirValidacionPeso) {
    const validacionPeso = await validarIntegridadPesos(paquetes, pesoBrutoTotal);
    if (!validacionPeso.valido) {
      throw new Error(validacionPeso.mensaje);
    }
  }

  onProgress?.(10);

  // Crear mapa de liquidaciones para búsqueda rápida
  const liqMap = new Map<string, Liquidacion>();
  liquidaciones.forEach(l => liqMap.set(l.numeroGuia, l));

  // ══════════════════════════════════════════════════════════
  // CLASIFICAR PAQUETES CON PRIORIDAD PHARMA
  // Lógica: PHARMA primero (sin importar valor), luego +100 / -100
  // ══════════════════════════════════════════════════════════
  
  const pharmaList: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];
  const mas100List: Array<{ paquete: ManifestRow; liquidacion: Liquidacion }> = [];
  const menos100List: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];

  paquetes.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const desc = paquete.description || '';
    const hts = liq?.hsCode || '';

    // PRIORIDAD 1: PHARMA (HTS 30/33 o palabras clave)
    if (esPharma(desc, hts)) {
      pharmaList.push({ paquete, liquidacion: liq });
      return;
    }

    // PRIORIDAD 2: Por valor
    if (paquete.valueUSD >= 100) {
      if (liq) {
        mas100List.push({ paquete, liquidacion: liq });
      } else {
        // Sin liquidación pero >= $100, necesita liquidación
        mas100List.push({ paquete, liquidacion: {
          id: `temp-${paquete.trackingNumber}`,
          numeroGuia: paquete.trackingNumber,
          manifiestoId: mawb,
          categoriaAduanera: 'C',
          categoriaDescripcion: 'Pendiente liquidación',
          valorFOB: paquete.valueUSD,
          valorFlete: 0,
          valorSeguro: paquete.valueUSD * 0.015,
          valorCIF: paquete.valueUSD * 1.015,
          monedaOriginal: 'USD',
          tipoCambio: 1,
          percentDAI: 0,
          percentISC: 0,
          percentITBMS: 7,
          montoDAI: 0,
          baseISC: 0,
          montoISC: 0,
          baseITBMS: paquete.valueUSD * 1.015,
          montoITBMS: paquete.valueUSD * 1.015 * 0.07,
          tasaAduanera: 2,
          tasasAdicionales: 0,
          totalTributos: paquete.valueUSD * 1.015 * 0.07,
          totalAPagar: (paquete.valueUSD * 1.015 * 0.07) + 2,
          estado: 'pendiente_hs_code',
          tieneRestricciones: false,
          restricciones: [],
          observaciones: [],
          requiereRevisionManual: true,
          motivoRevisionManual: 'Sin clasificación HTS',
          calculadaPor: 'sistema',
          fechaCalculo: new Date().toISOString(),
          version: 1
        }});
      }
    } else {
      menos100List.push({ paquete, liquidacion: liq });
    }
  });

  onProgress?.(25);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA 1: +100 (LIQUIDACIÓN CON IMPUESTOS)
  // ══════════════════════════════════════════════════════════

  const dataMas100: (string | number)[][] = [HEADER_FORMATO_CORREDOR_LIQUIDACION];
  let consecutivo = 1;

  mas100List.forEach(({ paquete, liquidacion }) => {
    dataMas100.push(crearFilaFormatoCorredor(
      paquete, 
      mawb, 
      consecutivo++, 
      false, 
      liquidacion,
      true // incluir impuestos
    ));
  });

  // Fila de totales
  if (mas100List.length > 0) {
    const totales = mas100List.reduce((acc, { liquidacion }) => ({
      weight: acc.weight + (liquidacion.valorFOB > 0 ? 0 : 0), // peso ya está en filas
      value: acc.value + liquidacion.valorFOB,
      totalValue: acc.totalValue + liquidacion.valorCIF,
      dai: acc.dai + liquidacion.montoDAI,
      itbms: acc.itbms + liquidacion.montoITBMS,
      tasa: acc.tasa + liquidacion.tasaAduanera,
      total: acc.total + liquidacion.totalAPagar
    }), { weight: 0, value: 0, totalValue: 0, dai: 0, itbms: 0, tasa: 0, total: 0 });

    const escenarios = calcularEscenariosPago(totales.total, fechaProceso);

    dataMas100.push([]); // Fila vacía
    dataMas100.push([
      '', 'TOTALES', '', '', '', '', mas100List.length,
      '', '', totales.value.toFixed(2), totales.totalValue.toFixed(2), '',
      '', totales.dai.toFixed(2), totales.itbms.toFixed(2), totales.tasa.toFixed(2), 
      `B/. ${totales.total.toFixed(2)}`
    ]);

    // Escenarios de pago
    dataMas100.push([]);
    dataMas100.push([
      'ESCENARIOS DE PAGO:', '', '', '', '', '', '',
      '', '', '', '', '', '',
      `PUNTUAL: B/. ${escenarios[0].montoTotal.toFixed(2)}`,
      `+10%: B/. ${escenarios[1].montoTotal.toFixed(2)}`,
      `+20%: B/. ${escenarios[2].montoTotal.toFixed(2)}`,
      ''
    ]);
    dataMas100.push([
      'VENCIMIENTOS:', '', '', '', '', '', '',
      '', '', '', '', '', '',
      format(escenarios[0].fechaVencimiento, 'dd/MM/yyyy'),
      format(escenarios[1].fechaVencimiento, 'dd/MM/yyyy'),
      format(escenarios[2].fechaVencimiento, 'dd/MM/yyyy'),
      ''
    ]);
  }

  const wsMas100 = XLSX.utils.aoa_to_sheet(dataMas100);
  wsMas100['!cols'] = [
    { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
    { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMas100, '+100');

  onProgress?.(40);

  // ══════════════════════════════════════════════════════════
  // PESTAÑAS -100 (1) y -100 (2): DE MINIMIS
  // Máximo 100 registros por pestaña
  // ══════════════════════════════════════════════════════════

  const LIMITE_POR_HOJA = 100;
  consecutivo = 1;

  if (menos100List.length > 0) {
    const crearHojaMenos100 = (
      items: typeof menos100List, 
      nombreHoja: string,
      inicioConsecutivo: number
    ) => {
      const data: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
      let cons = inicioConsecutivo;

      items.forEach(({ paquete, liquidacion }) => {
        data.push(crearFilaFormatoCorredor(
          paquete,
          mawb,
          cons++,
          false,
          liquidacion,
          false
        ));
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
        { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 8 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    };

    if (menos100List.length > LIMITE_POR_HOJA) {
      // Dividir en múltiples hojas
      crearHojaMenos100(menos100List.slice(0, LIMITE_POR_HOJA), '-100 (1)', 1);
      crearHojaMenos100(menos100List.slice(LIMITE_POR_HOJA), '-100 (2)', LIMITE_POR_HOJA + 1);
    } else {
      crearHojaMenos100(menos100List, '-100 (1)', 1);
    }
  }

  onProgress?.(55);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA PHARMA: Productos con restricciones sanitarias
  // ══════════════════════════════════════════════════════════

  if (pharmaList.length > 0) {
    const dataPharma: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
    consecutivo = 1;

    pharmaList.forEach(({ paquete, liquidacion }) => {
      dataPharma.push(crearFilaFormatoCorredor(
        paquete,
        mawb,
        consecutivo++,
        true, // Es PHARMA
        liquidacion,
        false
      ));
    });

    const wsPharma = XLSX.utils.aoa_to_sheet(dataPharma);
    wsPharma['!cols'] = [
      { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
      { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPharma, 'PHARMA');
  }

  onProgress?.(70);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA MAWB: HOJA DE CONTROL MAESTRO (TODA LA CARGA)
  // Nombre de hoja: 230-{MAWB}
  // ══════════════════════════════════════════════════════════

  const dataMaster: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
  consecutivo = 1;

  // Todos los paquetes en orden original
  paquetes.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const isPharma = esPharma(paquete.description || '', liq?.hsCode);
    
    dataMaster.push(crearFilaFormatoCorredor(
      paquete,
      mawb,
      consecutivo++,
      isPharma,
      liq,
      false
    ));
  });

  // Resumen al final
  const totalPeso = paquetes.reduce((s, p) => s + (p.weight || 0), 0);
  const totalValor = paquetes.reduce((s, p) => s + (p.valueUSD || 0), 0);

  dataMaster.push([]);
  dataMaster.push([
    'RESUMEN', '', '', '', '', '', paquetes.length,
    totalPeso.toFixed(2), '', totalValor.toFixed(2), '', '',
    format(fechaProceso, 'dd/MM/yyyy')
  ]);
  dataMaster.push([
    `+100: ${mas100List.length}`, `PHARMA: ${pharmaList.length}`, 
    `-100: ${menos100List.length}`, '', '', '', '', '', '', '', '', '', ''
  ]);

  const wsMaster = XLSX.utils.aoa_to_sheet(dataMaster);
  wsMaster['!cols'] = [
    { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
    { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 12 }
  ];

  // Nombre de hoja: 230-MAWB (formato corredor)
  const mawbClean = mawb.replace(/[^0-9]/g, '').slice(-8) || '00000000';
  XLSX.utils.book_append_sheet(wb, wsMaster, `230-${mawbClean}`);

  onProgress?.(90);

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
  onProgress?: (progress: number) => void,
  omitirValidacionPeso = false
): Promise<void> {
  const blob = await generarExcelInteligente(datos, onProgress, omitirValidacionPeso);
  
  const mawbClean = (datos.mawb || 'Manifiesto').replace(/[^a-zA-Z0-9-]/g, '_');
  const fecha = format(new Date(), 'yyyyMMdd_HHmm');
  const nombreArchivo = `IPL_Customs_${mawbClean}_${fecha}.xlsx`;
  
  saveAs(blob, nombreArchivo);
}

export default {
  generarExcelInteligente,
  descargarExcelInteligente,
  validarIntegridadPesos,
  PALABRAS_CLAVE_PHARMA,
  DESCRIPCIONES_GENERICAS
};
