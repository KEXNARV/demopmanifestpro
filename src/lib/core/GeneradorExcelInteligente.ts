// ============================================
// GENERADOR EXCEL CORREDOR IDÓNEO - IPL CUSTOMS AI
// Formato exacto requerido por Corredor de Aduanas Panamá
// Con validación fiscal RUC/Cédula y enriquecimiento de datos
// ============================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ManifestRow } from '@/types/manifest';
import { Liquidacion } from '@/types/aduanas';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { servicioFiscal, EnriquecimientoFiscal } from '@/lib/fiscal/ServicioValidacionFiscal';

// ============================================
// CONFIGURACIÓN OFICIAL ANA (Boletas Reales)
// ============================================
const CONFIG_LIQUIDACION = {
  tasaSistema: 3.00, // B/. 3.00 tasa de sistema SIGA
  diasVencimiento1: 3,
  diasVencimiento2: 8,
  diasVencimiento3: 15,
  recargoMora1: 0.10,
  recargoMora2: 0.20,
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

export const HTS_PHARMA_PREFIXES = ['30', '33'];

export const DESCRIPCIONES_GENERICAS = [
  'personal effects', 'efectos personales',
  'merchandise', 'mercancía', 'mercancia',
  'gift', 'regalo', 'present',
  'goods', 'productos', 'items',
  'misc', 'miscellaneous', 'varios'
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

export interface GuiaSinRUC {
  trackingNumber: string;
  consignee: string;
  valorUSD: number;
  motivo: string;
}

export interface ResultadoGeneracion {
  blob: Blob;
  guiasSinRUC: GuiaSinRUC[];
  resumenFiscal: {
    totalGuias: number;
    conRUC: number;
    sinRUC: number;
    requierenRevision: number;
  };
}

// ============================================
// FORMATO COLUMNAS CORREDOR (ORDEN EXACTO)
// ============================================
const HEADER_FORMATO_CORREDOR = [
  'MAWB',
  'AWB',
  'CONSIGNEE',
  'RUC/CEDULA',
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

const HEADER_FORMATO_LIQUIDACION = [
  'MAWB',
  'AWB',
  'CONSIGNEE',
  'RUC/CEDULA',
  'ADDRESS',
  'CITY',
  'DESCRIPTION',
  'QUANTITY',
  'WEIGHT',
  'FREIGHT',
  'VALUE',
  'TOTAL VALUE',
  'PHARMA',
  'N° CONSECUTIVO',
  'DAI',
  'ITBMS',
  'TASA SISTEMA',
  'TOTAL A PAGAR'
];

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

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

  if (porcentajeDiferencia > 10) {
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

function esPharma(descripcion: string, htsCode?: string): boolean {
  if (htsCode) {
    const htsPrefijo = htsCode.replace('.', '').substring(0, 2);
    if (HTS_PHARMA_PREFIXES.includes(htsPrefijo)) return true;
  }
  const desc = descripcion.toLowerCase();
  return PALABRAS_CLAVE_PHARMA.some(kw => desc.includes(kw.toLowerCase()));
}

function calcularEscenariosPago(montoBase: number, fechaRegistro: Date) {
  return [
    {
      fechaVencimiento: addDays(fechaRegistro, CONFIG_LIQUIDACION.diasVencimiento1),
      montoTotal: montoBase,
      etiqueta: 'PAGO PUNTUAL'
    },
    {
      fechaVencimiento: addDays(fechaRegistro, CONFIG_LIQUIDACION.diasVencimiento2),
      montoTotal: montoBase * (1 + CONFIG_LIQUIDACION.recargoMora1),
      etiqueta: 'CON 10% MORA'
    },
    {
      fechaVencimiento: addDays(fechaRegistro, CONFIG_LIQUIDACION.diasVencimiento3),
      montoTotal: montoBase * (1 + CONFIG_LIQUIDACION.recargoMora2),
      etiqueta: 'CON 20% MORA'
    }
  ];
}

// ============================================
// CREAR FILA FORMATO CORREDOR
// ============================================
function crearFilaFormatoCorredor(
  paquete: ManifestRow,
  mawb: string,
  consecutivo: number,
  esPharmaFlag: boolean,
  enriquecimiento: EnriquecimientoFiscal | undefined,
  liquidacion?: Liquidacion,
  incluirImpuestos = false
): { fila: (string | number)[]; sinRUC: boolean } {
  const rucCedula = enriquecimiento?.rucCedula || paquete.identification || '';
  const sinRUC = !rucCedula && paquete.valueUSD >= 100;

  const filaBase = [
    mawb,
    paquete.trackingNumber,
    paquete.recipient || '',
    rucCedula || (sinRUC ? '⚠️ PENDIENTE' : 'N/A'),
    paquete.address || enriquecimiento?.direccion || '',
    paquete.city || paquete.detectedCity || enriquecimiento?.ciudad || '',
    (paquete.description || '').substring(0, 80),
    1,
    paquete.weight?.toFixed(2) || '0.00',
    liquidacion?.valorFlete?.toFixed(2) || '0.00',
    paquete.valueUSD?.toFixed(2) || '0.00',
    (paquete.valueUSD + (liquidacion?.valorFlete || 0))?.toFixed(2) || '0.00',
    esPharmaFlag ? 'SI' : 'NO',
    consecutivo
  ];

  if (incluirImpuestos && liquidacion) {
    // Cálculo espejo: DAI + ITBMS + Tasa Sistema = Total
    const totalConTasa = liquidacion.montoDAI + liquidacion.montoITBMS + CONFIG_LIQUIDACION.tasaSistema;
    
    return {
      fila: [
        ...filaBase,
        liquidacion.montoDAI?.toFixed(2) || '0.00',
        liquidacion.montoITBMS?.toFixed(2) || '0.00',
        CONFIG_LIQUIDACION.tasaSistema.toFixed(2),
        `B/. ${totalConTasa.toFixed(2)}`
      ],
      sinRUC
    };
  }

  return { fila: filaBase, sinRUC };
}

// ============================================
// GENERADOR PRINCIPAL CON VALIDACIÓN FISCAL
// ============================================

export async function generarExcelInteligente(
  datos: DatosExcelInteligente,
  onProgress?: (progress: number) => void,
  omitirValidacionPeso = false
): Promise<ResultadoGeneracion> {
  const wb = XLSX.utils.book_new();
  const { paquetes, liquidaciones, mawb, fechaProceso, pesoBrutoTotal } = datos;
  const guiasSinRUC: GuiaSinRUC[] = [];

  onProgress?.(5);

  // ══════════════════════════════════════════════════════════
  // VALIDAR INTEGRIDAD DE PESOS
  // ══════════════════════════════════════════════════════════
  if (!omitirValidacionPeso) {
    const validacionPeso = await validarIntegridadPesos(paquetes, pesoBrutoTotal);
    if (!validacionPeso.valido) {
      throw new Error(validacionPeso.mensaje);
    }
  }

  onProgress?.(10);

  // ══════════════════════════════════════════════════════════
  // ENRIQUECER DATOS FISCALES DESDE BD HISTÓRICA
  // ══════════════════════════════════════════════════════════
  await servicioFiscal.inicializarCache();
  const datosFiscales = await servicioFiscal.enriquecerDatosFiscales(
    paquetes.map(p => ({
      recipient: p.recipient,
      address: p.address,
      city: p.city || p.detectedCity,
      phone: p.phone
    }))
  );

  onProgress?.(20);

  // Crear mapa de liquidaciones
  const liqMap = new Map<string, Liquidacion>();
  liquidaciones.forEach(l => liqMap.set(l.numeroGuia, l));

  // ══════════════════════════════════════════════════════════
  // CLASIFICAR PAQUETES (PHARMA PRIORITARIO)
  // ══════════════════════════════════════════════════════════
  
  const pharmaList: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];
  const mas100List: Array<{ paquete: ManifestRow; liquidacion: Liquidacion }> = [];
  const menos100List: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];

  paquetes.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const desc = paquete.description || '';
    const hts = liq?.hsCode || '';

    // PRIORIDAD 1: PHARMA
    if (esPharma(desc, hts)) {
      pharmaList.push({ paquete, liquidacion: liq });
      return;
    }

    // PRIORIDAD 2: Por valor
    if (paquete.valueUSD >= 100) {
      const liquidacion = liq || crearLiquidacionPendiente(paquete, mawb);
      mas100List.push({ paquete, liquidacion });
    } else {
      menos100List.push({ paquete, liquidacion: liq });
    }
  });

  onProgress?.(30);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA +100 (LIQUIDACIÓN CON IMPUESTOS Y RUC)
  // ══════════════════════════════════════════════════════════

  const dataMas100: (string | number)[][] = [HEADER_FORMATO_LIQUIDACION];
  let consecutivo = 1;

  mas100List.forEach(({ paquete, liquidacion }) => {
    const enriquecimiento = datosFiscales.get(paquete.recipient);
    const { fila, sinRUC } = crearFilaFormatoCorredor(
      paquete, mawb, consecutivo++, false, enriquecimiento, liquidacion, true
    );
    
    dataMas100.push(fila);

    if (sinRUC) {
      guiasSinRUC.push({
        trackingNumber: paquete.trackingNumber,
        consignee: paquete.recipient,
        valorUSD: paquete.valueUSD,
        motivo: 'Sin RUC/Cédula en base de datos'
      });
    }
  });

  // Totales y escenarios de pago
  if (mas100List.length > 0) {
    const totales = mas100List.reduce((acc, { liquidacion }) => ({
      value: acc.value + liquidacion.valorFOB,
      totalValue: acc.totalValue + liquidacion.valorCIF,
      dai: acc.dai + liquidacion.montoDAI,
      itbms: acc.itbms + liquidacion.montoITBMS,
      tasa: acc.tasa + CONFIG_LIQUIDACION.tasaSistema,
      total: acc.total + liquidacion.montoDAI + liquidacion.montoITBMS + CONFIG_LIQUIDACION.tasaSistema
    }), { value: 0, totalValue: 0, dai: 0, itbms: 0, tasa: 0, total: 0 });

    const escenarios = calcularEscenariosPago(totales.total, fechaProceso);

    dataMas100.push([]);
    dataMas100.push([
      '', 'TOTALES', '', '', '', '', '', mas100List.length,
      '', '', totales.value.toFixed(2), totales.totalValue.toFixed(2), '',
      '', totales.dai.toFixed(2), totales.itbms.toFixed(2), totales.tasa.toFixed(2),
      `B/. ${totales.total.toFixed(2)}`
    ]);

    dataMas100.push([]);
    dataMas100.push([
      'ESCENARIOS:', '', '', '', '', '', '', '', '', '', '', '', '', '',
      `PUNTUAL: B/. ${escenarios[0].montoTotal.toFixed(2)}`,
      `+10%: B/. ${escenarios[1].montoTotal.toFixed(2)}`,
      `+20%: B/. ${escenarios[2].montoTotal.toFixed(2)}`,
      ''
    ]);
    dataMas100.push([
      'VENCIMIENTOS:', '', '', '', '', '', '', '', '', '', '', '', '', '',
      format(escenarios[0].fechaVencimiento, 'dd/MM/yyyy'),
      format(escenarios[1].fechaVencimiento, 'dd/MM/yyyy'),
      format(escenarios[2].fechaVencimiento, 'dd/MM/yyyy'),
      ''
    ]);
  }

  const wsMas100 = XLSX.utils.aoa_to_sheet(dataMas100);
  wsMas100['!cols'] = [
    { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
    { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMas100, '+100');

  onProgress?.(45);

  // ══════════════════════════════════════════════════════════
  // PESTAÑAS -100 (1) y -100 (2)
  // ══════════════════════════════════════════════════════════
  const LIMITE_POR_HOJA = 100;

  if (menos100List.length > 0) {
    const crearHojaMenos100 = (
      items: typeof menos100List, 
      nombreHoja: string,
      inicioConsecutivo: number
    ) => {
      const data: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
      let cons = inicioConsecutivo;

      items.forEach(({ paquete, liquidacion }) => {
        const enriquecimiento = datosFiscales.get(paquete.recipient);
        const { fila } = crearFilaFormatoCorredor(
          paquete, mawb, cons++, false, enriquecimiento, liquidacion, false
        );
        data.push(fila);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
        { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 8 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    };

    if (menos100List.length > LIMITE_POR_HOJA) {
      crearHojaMenos100(menos100List.slice(0, LIMITE_POR_HOJA), '-100 (1)', 1);
      crearHojaMenos100(menos100List.slice(LIMITE_POR_HOJA), '-100 (2)', LIMITE_POR_HOJA + 1);
    } else {
      crearHojaMenos100(menos100List, '-100 (1)', 1);
    }
  }

  onProgress?.(60);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA PHARMA
  // ══════════════════════════════════════════════════════════

  if (pharmaList.length > 0) {
    const dataPharma: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
    consecutivo = 1;

    pharmaList.forEach(({ paquete, liquidacion }) => {
      const enriquecimiento = datosFiscales.get(paquete.recipient);
      const { fila } = crearFilaFormatoCorredor(
        paquete, mawb, consecutivo++, true, enriquecimiento, liquidacion, false
      );
      dataPharma.push(fila);
    });

    const wsPharma = XLSX.utils.aoa_to_sheet(dataPharma);
    wsPharma['!cols'] = [
      { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPharma, 'PHARMA');
  }

  onProgress?.(75);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA REVISIÓN (GUÍAS SIN RUC/CÉDULA)
  // ══════════════════════════════════════════════════════════

  if (guiasSinRUC.length > 0) {
    const dataRevision: (string | number)[][] = [
      ['⚠️ GUÍAS QUE REQUIEREN RUC/CÉDULA'],
      ['AWB', 'CONSIGNEE', 'VALOR USD', 'MOTIVO', 'ACCIÓN REQUERIDA']
    ];

    guiasSinRUC.forEach(g => {
      dataRevision.push([
        g.trackingNumber,
        g.consignee,
        g.valorUSD.toFixed(2),
        g.motivo,
        'Registrar RUC/Cédula en sistema'
      ]);
    });

    const wsRevision = XLSX.utils.aoa_to_sheet(dataRevision);
    wsRevision['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 35 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRevision, 'REVISIÓN');
  }

  onProgress?.(85);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA MAWB (CONTROL MAESTRO)
  // ══════════════════════════════════════════════════════════

  const dataMaster: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
  consecutivo = 1;

  paquetes.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const isPharma = esPharma(paquete.description || '', liq?.hsCode);
    const enriquecimiento = datosFiscales.get(paquete.recipient);
    
    const { fila } = crearFilaFormatoCorredor(
      paquete, mawb, consecutivo++, isPharma, enriquecimiento, liq, false
    );
    dataMaster.push(fila);
  });

  const totalPeso = paquetes.reduce((s, p) => s + (p.weight || 0), 0);
  const totalValor = paquetes.reduce((s, p) => s + (p.valueUSD || 0), 0);

  dataMaster.push([]);
  dataMaster.push([
    'RESUMEN', '', '', '', '', '', '', paquetes.length,
    totalPeso.toFixed(2), '', totalValor.toFixed(2), '', '',
    format(fechaProceso, 'dd/MM/yyyy')
  ]);
  dataMaster.push([
    `+100: ${mas100List.length}`, `PHARMA: ${pharmaList.length}`, 
    `-100: ${menos100List.length}`, `SIN RUC: ${guiasSinRUC.length}`,
    '', '', '', '', '', '', '', '', '', ''
  ]);

  const wsMaster = XLSX.utils.aoa_to_sheet(dataMaster);
  wsMaster['!cols'] = [
    { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
    { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 12 }
  ];

  const mawbClean = mawb.replace(/[^0-9]/g, '').slice(-8) || '00000000';
  XLSX.utils.book_append_sheet(wb, wsMaster, `230-${mawbClean}`);

  onProgress?.(95);

  // ══════════════════════════════════════════════════════════
  // GENERAR ARCHIVO
  // ══════════════════════════════════════════════════════════
  
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  onProgress?.(100);

  // Contar estadísticas fiscales
  let conRUC = 0;
  let sinRUC = 0;
  datosFiscales.forEach(d => {
    if (d.rucCedula) conRUC++;
    else sinRUC++;
  });

  return {
    blob,
    guiasSinRUC,
    resumenFiscal: {
      totalGuias: paquetes.length,
      conRUC,
      sinRUC,
      requierenRevision: guiasSinRUC.length
    }
  };
}

// ============================================
// FUNCIÓN AUXILIAR PARA LIQUIDACIÓN PENDIENTE
// ============================================
function crearLiquidacionPendiente(paquete: ManifestRow, mawb: string): Liquidacion {
  const valorCIF = paquete.valueUSD * 1.015;
  const itbms = valorCIF * 0.07;
  
  return {
    id: `temp-${paquete.trackingNumber}`,
    numeroGuia: paquete.trackingNumber,
    manifiestoId: mawb,
    categoriaAduanera: 'C',
    categoriaDescripcion: 'Pendiente clasificación',
    valorFOB: paquete.valueUSD,
    valorFlete: 0,
    valorSeguro: paquete.valueUSD * 0.015,
    valorCIF,
    monedaOriginal: 'USD',
    tipoCambio: 1,
    percentDAI: 0,
    percentISC: 0,
    percentITBMS: 7,
    montoDAI: 0,
    baseISC: 0,
    montoISC: 0,
    baseITBMS: valorCIF,
    montoITBMS: itbms,
    tasaAduanera: CONFIG_LIQUIDACION.tasaSistema,
    tasasAdicionales: 0,
    totalTributos: itbms,
    totalAPagar: itbms + CONFIG_LIQUIDACION.tasaSistema,
    estado: 'pendiente_hs_code',
    tieneRestricciones: false,
    restricciones: [],
    observaciones: ['Pendiente clasificación HTS'],
    requiereRevisionManual: true,
    motivoRevisionManual: 'Sin código HTS',
    calculadaPor: 'sistema',
    fechaCalculo: new Date().toISOString(),
    version: 1
  };
}

// ============================================
// FUNCIÓN DE DESCARGA
// ============================================

export async function descargarExcelInteligente(
  datos: DatosExcelInteligente,
  onProgress?: (progress: number) => void,
  omitirValidacionPeso = false
): Promise<ResultadoGeneracion> {
  const resultado = await generarExcelInteligente(datos, onProgress, omitirValidacionPeso);
  
  const mawbClean = (datos.mawb || 'Manifiesto').replace(/[^a-zA-Z0-9-]/g, '_');
  const fecha = format(new Date(), 'yyyyMMdd_HHmm');
  const nombreArchivo = `IPL_Customs_${mawbClean}_${fecha}.xlsx`;
  
  saveAs(resultado.blob, nombreArchivo);
  
  return resultado;
}

export default {
  generarExcelInteligente,
  descargarExcelInteligente,
  validarIntegridadPesos,
  PALABRAS_CLAVE_PHARMA,
  DESCRIPCIONES_GENERICAS,
  HTS_PHARMA_PREFIXES
};
