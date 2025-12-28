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
import { detectarProductoFarmaceutico } from '@/lib/exportacion/reporteFarmaceuticos';

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
// Ordenado por: Consignatario, Valor, Peso, Zona
// ============================================
const HEADER_FORMATO_CORREDOR = [
  'N° CONSECUTIVO',
  'CONSIGNEE',
  'RUC/CEDULA',
  'VALUE',
  'WEIGHT',
  'PROVINCIA',
  'CITY',
  'MAWB',
  'AWB',
  'ADDRESS',
  'DESCRIPTION',
  'QUANTITY',
  'FREIGHT',
  'TOTAL VALUE',
  'PHARMA',
];

const HEADER_FORMATO_LIQUIDACION = [
  'N° CONSECUTIVO',
  'CONSIGNEE',
  'RUC/CEDULA',
  'VALUE',
  'WEIGHT',
  'PROVINCIA',
  'CITY',
  'MAWB',
  'AWB',
  'ADDRESS',
  'DESCRIPTION',
  'QUANTITY',
  'FREIGHT',
  'TOTAL VALUE',
  'PHARMA',
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
// CREAR FILA FORMATO CORREDOR (Orden nuevo)
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

  const provincia = paquete.province || paquete.detectedProvince || '';
  const ciudad = paquete.city || paquete.detectedCity || enriquecimiento?.ciudad || '';

  const filaBase = [
    consecutivo,
    paquete.recipient || '',
    rucCedula || (sinRUC ? '⚠️ PENDIENTE' : 'N/A'),
    paquete.valueUSD?.toFixed(2) || '0.00',
    paquete.weight?.toFixed(2) || '0.00',
    provincia,
    ciudad,
    mawb,
    paquete.trackingNumber,
    paquete.address || enriquecimiento?.direccion || '',
    (paquete.description || '').substring(0, 80),
    1,
    liquidacion?.valorFlete?.toFixed(2) || '0.00',
    (paquete.valueUSD + (liquidacion?.valorFlete || 0))?.toFixed(2) || '0.00',
    esPharmaFlag ? 'SI' : 'NO',
  ];

  if (incluirImpuestos && liquidacion) {
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
// ORDENAR POR CONSIGNATARIO ÚNICO
// ============================================
function ordenarPorConsignatario<T extends { paquete: ManifestRow }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Por consignatario
    const consA = (a.paquete.recipient || '').toLowerCase();
    const consB = (b.paquete.recipient || '').toLowerCase();
    if (consA !== consB) return consA.localeCompare(consB);
    
    // 2. Por valor
    if (a.paquete.valueUSD !== b.paquete.valueUSD) {
      return b.paquete.valueUSD - a.paquete.valueUSD;
    }
    
    // 3. Por peso
    if (a.paquete.weight !== b.paquete.weight) {
      return b.paquete.weight - a.paquete.weight;
    }
    
    // 4. Por provincia
    const provA = (a.paquete.province || a.paquete.detectedProvince || '').toLowerCase();
    const provB = (b.paquete.province || b.paquete.detectedProvince || '').toLowerCase();
    return provA.localeCompare(provB);
  });
}

// ============================================
// DISTRIBUIR SIN CONSIGNATARIOS REPETIDOS
// ============================================
function distribuirSinRepetidosPorHoja<T extends { paquete: ManifestRow }>(
  items: T[]
): { hoja1: T[]; hoja2: T[] } {
  const consignatariosHoja1 = new Set<string>();
  const hoja1: T[] = [];
  const hoja2: T[] = [];

  // Ordenar primero
  const itemsOrdenados = ordenarPorConsignatario(items);

  for (const item of itemsOrdenados) {
    const consignatario = (item.paquete.recipient || '').toLowerCase().trim();
    
    if (!consignatariosHoja1.has(consignatario)) {
      // Primer paquete de este consignatario va a hoja 1
      consignatariosHoja1.add(consignatario);
      hoja1.push(item);
    } else {
      // Consignatario repetido va a hoja 2
      hoja2.push(item);
    }
  }

  return { hoja1, hoja2 };
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
  // CLASIFICAR PAQUETES (PHARMA basado en HTS cap. 30)
  // ══════════════════════════════════════════════════════════
  
  const pharmaList: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];
  const mas100List: Array<{ paquete: ManifestRow; liquidacion: Liquidacion }> = [];
  const menos100List: Array<{ paquete: ManifestRow; liquidacion?: Liquidacion }> = [];

  paquetes.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const desc = paquete.description || '';
    const hts = liq?.hsCode || '';

    // PHARMA: Usar detector estricto (solo medicamentos, HTS cap. 30)
    const deteccionFarma = detectarProductoFarmaceutico(desc, hts);
    if (deteccionFarma.esFarmaceutico) {
      pharmaList.push({ paquete, liquidacion: liq });
      return;
    }

    // Por valor
    if (paquete.valueUSD >= 100) {
      const liquidacion = liq || crearLiquidacionPendiente(paquete, mawb);
      mas100List.push({ paquete, liquidacion });
    } else {
      menos100List.push({ paquete, liquidacion: liq });
    }
  });

  onProgress?.(25);

  // ══════════════════════════════════════════════════════════
  // CALCULAR MÉTRICAS PARA RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════
  
  const totalGuias = paquetes.length;
  const totalValor = paquetes.reduce((s, p) => s + (p.valueUSD || 0), 0);
  const totalPeso = paquetes.reduce((s, p) => s + (p.weight || 0), 0);
  
  // Calcular totales de impuestos para +100
  const totalImpuestosMas100 = mas100List.reduce((acc, { liquidacion }) => ({
    dai: acc.dai + (liquidacion?.montoDAI || 0),
    itbms: acc.itbms + (liquidacion?.montoITBMS || 0),
    tasa: acc.tasa + CONFIG_LIQUIDACION.tasaSistema,
    total: acc.total + (liquidacion?.montoDAI || 0) + (liquidacion?.montoITBMS || 0) + CONFIG_LIQUIDACION.tasaSistema
  }), { dai: 0, itbms: 0, tasa: 0, total: 0 });

  // Distribución por provincia
  const distribucionProvincias = new Map<string, { cantidad: number; valor: number; peso: number }>();
  paquetes.forEach(p => {
    const prov = p.province || p.detectedProvince || 'Sin Provincia';
    const current = distribucionProvincias.get(prov) || { cantidad: 0, valor: 0, peso: 0 };
    distribucionProvincias.set(prov, {
      cantidad: current.cantidad + 1,
      valor: current.valor + (p.valueUSD || 0),
      peso: current.peso + (p.weight || 0)
    });
  });

  // Contar consignatarios únicos
  const consignatariosUnicos = new Set(paquetes.map(p => (p.recipient || '').toLowerCase().trim())).size;
  
  // Contar RUC disponibles
  let conRUC = 0;
  let sinRUCCount = 0;
  datosFiscales.forEach(d => {
    if (d.rucCedula) conRUC++;
    else sinRUCCount++;
  });

  // ══════════════════════════════════════════════════════════
  // CREAR HOJA RESUMEN EJECUTIVO (PRIMERA HOJA)
  // ══════════════════════════════════════════════════════════
  
  const dataResumen: (string | number)[][] = [
    ['IPL CUSTOMS AI - RESUMEN EJECUTIVO'],
    [''],
    ['INFORMACIÓN DEL MANIFIESTO'],
    ['MAWB:', mawb],
    ['Fecha de Proceso:', format(fechaProceso, 'dd/MM/yyyy HH:mm', { locale: es })],
    [''],
    ['═══════════════════════════════════════════════════════════'],
    [''],
    ['TOTALES GENERALES'],
    ['Total de Guías:', totalGuias],
    ['Consignatarios Únicos:', consignatariosUnicos],
    ['Valor Total USD:', `$ ${totalValor.toFixed(2)}`],
    ['Peso Total (lb):', totalPeso.toFixed(2)],
    ['Valor Promedio por Guía:', `$ ${(totalValor / totalGuias).toFixed(2)}`],
    [''],
    ['═══════════════════════════════════════════════════════════'],
    [''],
    ['CLASIFICACIÓN POR CATEGORÍA', 'Cantidad', 'Valor USD', '% del Total'],
    ['+100 (Requieren Liquidación)', mas100List.length, mas100List.reduce((s, i) => s + i.paquete.valueUSD, 0).toFixed(2), `${((mas100List.length / totalGuias) * 100).toFixed(1)}%`],
    ['-100 (Exentos)', menos100List.length, menos100List.reduce((s, i) => s + i.paquete.valueUSD, 0).toFixed(2), `${((menos100List.length / totalGuias) * 100).toFixed(1)}%`],
    ['MINSA (Farmacéuticos)', pharmaList.length, pharmaList.reduce((s, i) => s + i.paquete.valueUSD, 0).toFixed(2), `${((pharmaList.length / totalGuias) * 100).toFixed(1)}%`],
    [''],
    ['═══════════════════════════════════════════════════════════'],
    [''],
    ['MÉTRICAS DE CUMPLIMIENTO'],
    ['Guías con RUC/Cédula:', conRUC, `${((conRUC / totalGuias) * 100).toFixed(1)}%`],
    ['Guías sin RUC/Cédula:', sinRUCCount, `${((sinRUCCount / totalGuias) * 100).toFixed(1)}%`],
    ['Requieren Revisión:', mas100List.filter(i => !datosFiscales.get(i.paquete.recipient)?.rucCedula).length],
    [''],
    ['═══════════════════════════════════════════════════════════'],
    [''],
    ['ESTIMACIÓN DE IMPUESTOS (+100)'],
    ['Total DAI:', `B/. ${totalImpuestosMas100.dai.toFixed(2)}`],
    ['Total ITBMS:', `B/. ${totalImpuestosMas100.itbms.toFixed(2)}`],
    ['Tasas de Sistema:', `B/. ${totalImpuestosMas100.tasa.toFixed(2)}`],
    ['TOTAL A PAGAR:', `B/. ${totalImpuestosMas100.total.toFixed(2)}`],
    [''],
    ['═══════════════════════════════════════════════════════════'],
    [''],
    ['DISTRIBUCIÓN POR PROVINCIA', 'Cantidad', 'Valor USD', 'Peso (lb)'],
  ];

  // Agregar provincias ordenadas por cantidad
  const provinciasOrdenadas = Array.from(distribucionProvincias.entries())
    .sort((a, b) => b[1].cantidad - a[1].cantidad);
  
  provinciasOrdenadas.forEach(([provincia, datos]) => {
    dataResumen.push([
      provincia,
      datos.cantidad,
      datos.valor.toFixed(2),
      datos.peso.toFixed(2)
    ]);
  });

  dataResumen.push(['']);
  dataResumen.push(['═══════════════════════════════════════════════════════════']);
  dataResumen.push(['']);
  dataResumen.push(['HOJAS INCLUIDAS EN ESTE ARCHIVO:']);
  dataResumen.push(['• RESUMEN - Esta hoja']);
  dataResumen.push(['• +100 - Guías con valor ≥$100 (requieren liquidación)']);
  dataResumen.push(['• -100 (1) - Guías <$100 con consignatarios únicos']);
  if (menos100List.length > consignatariosUnicos) {
    dataResumen.push(['• -100 (2) - Guías <$100 con consignatarios repetidos']);
  }
  if (pharmaList.length > 0) {
    dataResumen.push(['• MINSA - Productos farmacéuticos (Cap. 30 HTS)']);
  }
  dataResumen.push([`• 230-${mawb.replace(/[^0-9]/g, '').slice(-8)} - Control maestro completo`]);
  dataResumen.push(['']);
  dataResumen.push(['Generado por IPL Customs AI - Sistema de Corretaje Aduanal']);

  const wsResumen = XLSX.utils.aoa_to_sheet(dataResumen);
  wsResumen['!cols'] = [
    { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  // Merge para título
  wsResumen['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN');

  onProgress?.(30);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA +100 (LIQUIDACIÓN CON IMPUESTOS Y RUC)
  // ══════════════════════════════════════════════════════════

  const mas100Ordenados = ordenarPorConsignatario(mas100List);
  const dataMas100: (string | number)[][] = [HEADER_FORMATO_LIQUIDACION];
  let consecutivo = 1;

  mas100Ordenados.forEach(({ paquete, liquidacion }) => {
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
  if (mas100Ordenados.length > 0) {
    const totales = mas100Ordenados.reduce((acc, { liquidacion }) => ({
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
      'TOTALES', '', '', totales.value.toFixed(2), '', '', '', '', mas100Ordenados.length,
      '', '', '', '', totales.totalValue.toFixed(2), '',
      totales.dai.toFixed(2), totales.itbms.toFixed(2), totales.tasa.toFixed(2),
      `B/. ${totales.total.toFixed(2)}`
    ]);

    dataMas100.push([]);
    dataMas100.push([
      'ESCENARIOS:', '', '', '', '', '', '', '', '', '', '', '', '', '',
      `PUNTUAL: B/. ${escenarios[0].montoTotal.toFixed(2)}`,
      `+10%: B/. ${escenarios[1].montoTotal.toFixed(2)}`,
      `+20%: B/. ${escenarios[2].montoTotal.toFixed(2)}`,
      '', ''
    ]);
    dataMas100.push([
      'VENCIMIENTOS:', '', '', '', '', '', '', '', '', '', '', '', '', '',
      format(escenarios[0].fechaVencimiento, 'dd/MM/yyyy'),
      format(escenarios[1].fechaVencimiento, 'dd/MM/yyyy'),
      format(escenarios[2].fechaVencimiento, 'dd/MM/yyyy'),
      '', ''
    ]);
  }

  const wsMas100 = XLSX.utils.aoa_to_sheet(dataMas100);
  wsMas100['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 8 },
    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMas100, '+100');

  onProgress?.(45);

  // ══════════════════════════════════════════════════════════
  // PESTAÑAS -100 (1) y -100 (2) - SIN CONSIGNATARIOS REPETIDOS
  // ══════════════════════════════════════════════════════════

  if (menos100List.length > 0) {
    const { hoja1, hoja2 } = distribuirSinRepetidosPorHoja(menos100List);

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
        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 8 },
        { wch: 10 }, { wch: 12 }, { wch: 8 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    };

    // Hoja 1: Un paquete por consignatario (únicos)
    crearHojaMenos100(hoja1, '-100 (1)', 1);
    
    // Hoja 2: Paquetes adicionales de consignatarios repetidos
    if (hoja2.length > 0) {
      crearHojaMenos100(hoja2, '-100 (2)', hoja1.length + 1);
    }
  }

  onProgress?.(60);

  // ══════════════════════════════════════════════════════════
  // PESTAÑA MINSA/PHARMA (Solo medicamentos reales)
  // ══════════════════════════════════════════════════════════

  if (pharmaList.length > 0) {
    const pharmaOrdenados = ordenarPorConsignatario(pharmaList);
    const dataPharma: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
    consecutivo = 1;

    pharmaOrdenados.forEach(({ paquete, liquidacion }) => {
      const enriquecimiento = datosFiscales.get(paquete.recipient);
      const { fila } = crearFilaFormatoCorredor(
        paquete, mawb, consecutivo++, true, enriquecimiento, liquidacion, false
      );
      dataPharma.push(fila);
    });

    const wsPharma = XLSX.utils.aoa_to_sheet(dataPharma);
    wsPharma['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 8 },
      { wch: 10 }, { wch: 12 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPharma, 'MINSA');
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

  const paquetesOrdenados = [...paquetes].sort((a, b) => {
    const consA = (a.recipient || '').toLowerCase();
    const consB = (b.recipient || '').toLowerCase();
    if (consA !== consB) return consA.localeCompare(consB);
    return b.valueUSD - a.valueUSD;
  });

  const dataMaster: (string | number)[][] = [HEADER_FORMATO_CORREDOR];
  consecutivo = 1;

  paquetesOrdenados.forEach(paquete => {
    const liq = liqMap.get(paquete.trackingNumber);
    const deteccionFarma = detectarProductoFarmaceutico(paquete.description || '', liq?.hsCode);
    const enriquecimiento = datosFiscales.get(paquete.recipient);
    
    const { fila } = crearFilaFormatoCorredor(
      paquete, mawb, consecutivo++, deteccionFarma.esFarmaceutico, enriquecimiento, liq, false
    );
    dataMaster.push(fila);
  });

  dataMaster.push([]);
  dataMaster.push([
    'RESUMEN', '', '', totalValor.toFixed(2), totalPeso.toFixed(2), '', '', '', paquetes.length,
    '', '', '', '', '',
    format(fechaProceso, 'dd/MM/yyyy')
  ]);
  dataMaster.push([
    `+100: ${mas100List.length}`, `MINSA: ${pharmaList.length}`, 
    `-100: ${menos100List.length}`, `SIN RUC: ${guiasSinRUC.length}`,
    '', '', '', '', '', '', '', '', '', '', ''
  ]);

  const wsMaster = XLSX.utils.aoa_to_sheet(dataMaster);
  wsMaster['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 8 },
    { wch: 10 }, { wch: 12 }, { wch: 8 }
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

  return {
    blob,
    guiasSinRUC,
    resumenFiscal: {
      totalGuias: paquetes.length,
      conRUC,
      sinRUC: sinRUCCount,
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
};
