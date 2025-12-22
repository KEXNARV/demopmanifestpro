// ============================================
// MOTOR DE LIQUIDACIÓN ADUANERA
// Calcula impuestos según normativa ANA Panamá
// Incluye: Corrección #6 (Seguro OMC), #8 (Caché), #9 (Tarifas), #10 (Auditoría)
// ============================================

import { ManifestRow } from '@/types/manifest';
import { 
  Liquidacion, 
  CategoriaAduanera, 
  ResumenLiquidacion,
  ConfiguracionLiquidacion,
  DEFAULT_CONFIG_LIQUIDACION,
  FacturaComercial,
  RestriccionDetectada
} from '@/types/aduanas';
import { buscarArancelPorDescripcion, ARANCEL_GENERICO } from './arancelesData';
import { verificarRestricciones } from './restriccionesData';
import { CacheAranceles } from './cacheAranceles';
import { CalculadorTarifas } from '@/lib/financiero/calculadorTarifas';
import { GestorAuditoria } from '@/lib/auditoria/gestorAuditoria';
import { devLog, devWarn, devError } from '@/lib/logger';

// Generar ID único
function generarId(): string {
  return `liq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Redondear a 2 decimales
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// ============================================
// CLASIFICACIÓN DE CATEGORÍA ADUANERA
// ============================================
export function clasificarCategoriaAduanera(
  valorCIF: number,
  descripcion: string,
  config: ConfiguracionLiquidacion = DEFAULT_CONFIG_LIQUIDACION
): { categoria: CategoriaAduanera; descripcion: string } {
  
  // Categoría A: Documentos (sin valor comercial)
  if (esDocumento(descripcion)) {
    return { categoria: 'A', descripcion: 'Documentos - Exento' };
  }
  
  // Categoría B: De Minimis (≤ $100)
  if (valorCIF <= config.umbralDeMinimis) {
    return { categoria: 'B', descripcion: `De Minimis (≤ $${config.umbralDeMinimis}) - Exento` };
  }
  
  // Categoría D: Alto Valor (≥ $2,000) - Requiere corredor
  if (valorCIF >= config.umbralCorredorObligatorio) {
    return { categoria: 'D', descripcion: `Alto Valor (≥ $${config.umbralCorredorObligatorio}) - Requiere Corredor` };
  }
  
  // Categoría C: Bajo Valor ($100 < valor < $2,000)
  return { categoria: 'C', descripcion: 'Bajo Valor - Liquidación Simplificada' };
}

// Detecta si es un documento
function esDocumento(descripcion: string): boolean {
  const palabrasDocumento = [
    'document', 'documento', 'paper', 'papel',
    'letter', 'carta', 'invoice only', 'correspondence',
    'contract', 'contrato', 'certificate', 'certificado',
    'courier document', 'paperwork'
  ];
  
  const descLower = descripcion.toLowerCase();
  return palabrasDocumento.some(palabra => descLower.includes(palabra));
}

// ============================================
// NORMALIZACIÓN DE VALORES (FOB → CIF)
// CORRECCIÓN #6: Seguro teórico según OMC
// ============================================
export function normalizarValoresCIF(
  valorDeclarado: number,
  factura?: FacturaComercial,
  config: ConfiguracionLiquidacion = DEFAULT_CONFIG_LIQUIDACION
): {
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  moneda: string;
  tipoCambio: number;
  seguroTeorico: boolean;
  fundamentoLegal?: string;
} {
  let valorFOB: number;
  let valorFlete: number;
  let valorSeguro: number;
  let moneda = 'USD';
  let tipoCambio = 1.0;
  let seguroTeorico = false;
  let fundamentoLegal: string | undefined;
  
  if (factura) {
    // CASO 1: HAY FACTURA COMERCIAL
    valorFOB = factura.valorFOB;
    valorFlete = factura.valorFlete || 0;
    moneda = factura.moneda;
    
    // Convertir a USD si es otra moneda
    if (moneda !== 'USD') {
      tipoCambio = obtenerTipoCambioSync(moneda);
      valorFOB *= tipoCambio;
      valorFlete *= tipoCambio;
    }
    
    // ═══════════════════════════════════════════════════════
    // LÓGICA CRÍTICA: SEGURO SEGÚN NORMATIVA OMC
    // Artículo 8.2 del Acuerdo de Valoración Aduanera
    // ═══════════════════════════════════════════════════════
    
    if (factura.valorSeguro !== undefined && factura.valorSeguro !== null) {
      // CASO A: Seguro EXPLÍCITAMENTE declarado (incluso si es $0)
      // Respetamos el valor declarado - puede ser $0 si:
      // - El vendedor asume el seguro
      // - Está incluido en el precio FOB
      // - Cliente decidió no asegurar
      valorSeguro = factura.valorSeguro;
      
      if (moneda !== 'USD') {
        valorSeguro *= tipoCambio;
      }
      
      if (valorSeguro === 0) {
        devLog('Seguro declarado como $0 - Respetando declaración (Seguro incluido en FOB o asumido por vendedor)');
      }
      
    } else {
      // CASO B: Campo de seguro AUSENTE (undefined/null) → APLICAR TEÓRICO
      // Solo aplicamos seguro teórico cuando NO existe el campo
      valorSeguro = valorFOB * (config.tasaSeguroTeorico / 100);
      seguroTeorico = true;
      fundamentoLegal = 'Artículo 8.2 del Acuerdo de Valoración Aduanera OMC';
      
      devWarn(`Seguro teórico aplicado (campo ausente en factura) - FOB: ${valorFOB}, Tasa: ${config.tasaSeguroTeorico}%, Calculado: ${valorSeguro}`);
    }
    
  } else {
    // CASO 2: NO HAY FACTURA - ESTIMAR DESDE VALOR DECLARADO
    // Descomposición empírica basada en estadísticas
    valorFOB = valorDeclarado * 0.85;
    valorFlete = valorDeclarado * 0.12;
    valorSeguro = valorDeclarado * 0.03;
    seguroTeorico = true;
    fundamentoLegal = 'Estimación sin factura comercial';
    
    devWarn(`Valores estimados (sin factura comercial) - CIF: ${valorDeclarado}, FOB: ${valorFOB}, Flete: ${valorFlete}, Seguro: ${valorSeguro}`);
  }
  
  const valorCIF = redondear(valorFOB + valorFlete + valorSeguro);
  
  // Validación de coherencia
  if (valorCIF <= 0) {
    devError(`Valor CIF inválido: ${valorCIF}`);
  }
  
  return {
    valorFOB: redondear(valorFOB),
    valorFlete: redondear(valorFlete),
    valorSeguro: redondear(valorSeguro),
    valorCIF,
    moneda,
    tipoCambio,
    seguroTeorico,
    fundamentoLegal
  };
}

// Tipo de cambio sincrónico (valores aproximados)
function obtenerTipoCambioSync(moneda: string): number {
  const tasas: Record<string, number> = {
    'EUR': 1.10,
    'CNY': 0.14,
    'GBP': 1.27,
    'JPY': 0.0068,
    'MXN': 0.058,
    'COP': 0.00024,
    'USD': 1.0
  };
  return tasas[moneda] || 1.0;
}

// ============================================
// CALCULAR LIQUIDACIÓN PARA UN PAQUETE
// ============================================
export function calcularLiquidacion(
  paquete: ManifestRow,
  manifiestoId: string,
  factura?: FacturaComercial,
  config: ConfiguracionLiquidacion = DEFAULT_CONFIG_LIQUIDACION
): Liquidacion {
  
  // PASO 1: Normalizar valores
  const valores = normalizarValoresCIF(paquete.valueUSD, factura, config);
  
  // PASO 2: Clasificar categoría aduanera
  const { categoria, descripcion: categoriaDesc } = clasificarCategoriaAduanera(
    valores.valorCIF,
    paquete.description,
    config
  );
  
  // PASO 3: Verificar restricciones
  const restriccionesRaw = verificarRestricciones(paquete.description);
  const restricciones: RestriccionDetectada[] = restriccionesRaw.map(r => ({
    tipo: r.tipo,
    mensaje: r.mensaje,
    autoridad: r.autoridad
  }));
  
  // PASO 4: Calcular según categoría
  let liquidacion: Liquidacion;
  
  if (categoria === 'C') {
    // Categoría C: Requiere cálculo fiscal completo
    liquidacion = calcularCategoriaC(paquete, manifiestoId, valores, restricciones, config);
  } else {
    // Categorías A, B, D: Liquidación simplificada
    liquidacion = crearLiquidacionSimple(categoria, categoriaDesc, paquete, manifiestoId, valores, restricciones, config);
  }
  
  return liquidacion;
}

// ============================================
// CÁLCULO CATEGORÍA C (CASCADA FISCAL)
// ============================================
function calcularCategoriaC(
  paquete: ManifestRow,
  manifiestoId: string,
  valores: ReturnType<typeof normalizarValoresCIF>,
  restricciones: RestriccionDetectada[],
  config: ConfiguracionLiquidacion
): Liquidacion {
  
  const { valorFOB, valorFlete, valorSeguro, valorCIF, moneda, tipoCambio, seguroTeorico, fundamentoLegal } = valores;
  
  // Buscar arancel usando caché O(1) (Corrección #8)
  let arancel = CacheAranceles.buscarMejorCoincidencia(paquete.description);
  if (!arancel) {
    arancel = buscarArancelPorDescripcion(paquete.description) || ARANCEL_GENERICO;
  }
  
  // Obtener porcentajes del arancel
  const percentDAI = arancel.daiPercent;
  const percentISC = arancel.iscPercent;
  const percentITBMS = arancel.itbmsPercent || config.itbmsDefault;
  
  // ════════════════════════════════════════════
  // CASCADA FISCAL (Normativa ANA Panamá)
  // ════════════════════════════════════════════
  
  // 1. Base imponible primaria = CIF
  const baseDAI = valorCIF;
  
  // 2. DAI = CIF × %DAI
  const montoDAI = redondear(baseDAI * (percentDAI / 100));
  
  // 3. Base ISC = CIF + DAI
  const baseISC = valorCIF + montoDAI;
  
  // 4. ISC = Base ISC × %ISC
  const montoISC = redondear(baseISC * (percentISC / 100));
  
  // 5. Base ITBMS = CIF + DAI + ISC
  const baseITBMS = valorCIF + montoDAI + montoISC;
  
  // 6. ITBMS = Base ITBMS × %ITBMS
  const montoITBMS = redondear(baseITBMS * (percentITBMS / 100));
  
  // 7. Tasa aduanera courier
  const tasaAduanera = config.tasaAduaneraCourier;
  
  // 8. Total tributos
  const totalTributos = redondear(montoDAI + montoISC + montoITBMS + tasaAduanera);
  
  // ════════════════════════════════════════════
  // TARIFAS COMERCIALES (Corrección #9)
  // ════════════════════════════════════════════
  
  const tarifaCliente = CalculadorTarifas.calcularTotalCliente(
    valorCIF,
    totalTributos,
    1 // cantidad paquetes del cliente
  );
  
  // ════════════════════════════════════════════
  
  const tieneRestricciones = restricciones.length > 0;
  const requiereRevisionManual = tieneRestricciones || arancel.hsCode === '9999.99.99';
  
  const liquidacion: Liquidacion = {
    id: generarId(),
    numeroGuia: paquete.trackingNumber,
    manifiestoId,
    
    categoriaAduanera: 'C',
    categoriaDescripcion: 'Bajo Valor - Liquidación Simplificada',
    
    valorFOB,
    valorFlete,
    valorSeguro,
    valorCIF,
    monedaOriginal: moneda,
    tipoCambio,
    
    hsCode: arancel.hsCode,
    descripcionArancelaria: arancel.descripcion,
    
    percentDAI,
    percentISC,
    percentITBMS,
    
    montoDAI,
    baseISC,
    montoISC,
    baseITBMS,
    montoITBMS,
    
    tasaAduanera,
    tasasAdicionales: 0,
    
    totalTributos,
    totalAPagar: tarifaCliente.totalFinal, // Total CON margen comercial
    
    estado: requiereRevisionManual ? 'pendiente_revision' : 'calculada',
    
    tieneRestricciones,
    restricciones,
    
    observaciones: generarObservaciones(arancel, valores, restricciones),
    requiereRevisionManual,
    motivoRevisionManual: requiereRevisionManual 
      ? (tieneRestricciones ? 'Producto con restricciones' : 'HS Code requiere verificación')
      : undefined,
    
    calculadaPor: 'sistema',
    fechaCalculo: new Date().toISOString(),
    
    // Corrección #6: Transparencia de seguro teórico
    seguroTeorico,
    fundamentoLegal,
    
    // Corrección #9: Tarifas comerciales
    comisionTributos: tarifaCliente.comisionTributos,
    handlingFee: tarifaCliente.handlingFee,
    profitMargin: tarifaCliente.profitMargin,
    descuentoVolumen: tarifaCliente.descuentoVolumen,
    porcentajeDescuento: tarifaCliente.porcentajeDescuento,
    aplicoMinimoCobro: tarifaCliente.aplicoMinimoCobro,
    
    version: 1
  };
  
  // Corrección #10: Registrar en auditoría
  GestorAuditoria.registrarCreacion(liquidacion, 'sistema').catch(() => {
    devError('Error registrando auditoría');
  });
  
  return liquidacion;
}

// Generar observaciones automáticas
function generarObservaciones(
  arancel: ReturnType<typeof buscarArancelPorDescripcion>,
  valores: ReturnType<typeof normalizarValoresCIF>,
  restricciones: RestriccionDetectada[]
): string[] {
  const obs: string[] = [];
  
  if (valores.seguroTeorico) {
    obs.push(`Seguro teórico aplicado: $${valores.valorSeguro.toFixed(2)}`);
  }
  
  if (arancel?.hsCode === '9999.99.99') {
    obs.push('Clasificación arancelaria pendiente - Tasas estándar aplicadas');
  }
  
  if (arancel?.requiresPermiso) {
    obs.push(`Requiere permiso de ${arancel.autoridad}`);
  }
  
  if (restricciones.length > 0) {
    obs.push(`Autoridades involucradas: ${[...new Set(restricciones.map(r => r.autoridad))].join(', ')}`);
  }
  
  return obs;
}

// ============================================
// LIQUIDACIÓN SIMPLE (Categorías A, B, D)
// ============================================
function crearLiquidacionSimple(
  categoria: CategoriaAduanera,
  categoriaDesc: string,
  paquete: ManifestRow,
  manifiestoId: string,
  valores: ReturnType<typeof normalizarValoresCIF>,
  restricciones: RestriccionDetectada[],
  config: ConfiguracionLiquidacion
): Liquidacion {
  
  const { valorFOB, valorFlete, valorSeguro, valorCIF, moneda, tipoCambio } = valores;
  
  let estado: Liquidacion['estado'];
  let observaciones: string[] = [];
  let requiereRevisionManual = false;
  let tasaAduanera = 0;
  let totalTributos = 0;
  let totalAPagar = 0;
  
  if (categoria === 'A') {
    estado = 'liberada';
    observaciones.push('Documento - Exento de tributos');
    totalAPagar = 0;
  } else if (categoria === 'B') {
    estado = 'liberada';
    observaciones.push(`De Minimis (≤ $${config.umbralDeMinimis}) - Exento de tributos`);
    tasaAduanera = config.tasaAduaneraCourier;
    totalTributos = tasaAduanera;
    totalAPagar = valorCIF + tasaAduanera;
  } else {
    // Categoría D
    estado = 'en_revision_manual';
    observaciones.push(`Alto Valor (≥ $${config.umbralCorredorObligatorio}) - Requiere agente aduanero autorizado`);
    requiereRevisionManual = true;
    // No calculamos tributos - lo hace el corredor
    totalAPagar = valorCIF;
  }
  
  // Si tiene restricciones, siempre requiere revisión
  if (restricciones.length > 0) {
    requiereRevisionManual = true;
    estado = 'en_revision_manual';
    observaciones.push(`Producto con restricciones - Requiere revisión`);
  }
  
  return {
    id: generarId(),
    numeroGuia: paquete.trackingNumber,
    manifiestoId,
    
    categoriaAduanera: categoria,
    categoriaDescripcion: categoriaDesc,
    
    valorFOB,
    valorFlete,
    valorSeguro,
    valorCIF,
    monedaOriginal: moneda,
    tipoCambio,
    
    hsCode: undefined,
    descripcionArancelaria: undefined,
    
    percentDAI: 0,
    percentISC: 0,
    percentITBMS: 0,
    
    montoDAI: 0,
    baseISC: 0,
    montoISC: 0,
    baseITBMS: 0,
    montoITBMS: 0,
    
    tasaAduanera,
    tasasAdicionales: 0,
    
    totalTributos,
    totalAPagar: redondear(totalAPagar),
    
    estado,
    
    tieneRestricciones: restricciones.length > 0,
    restricciones,
    
    observaciones,
    requiereRevisionManual,
    motivoRevisionManual: requiereRevisionManual 
      ? (categoria === 'D' ? 'Requiere corredor aduanero' : 'Producto con restricciones')
      : undefined,
    
    calculadaPor: 'sistema',
    fechaCalculo: new Date().toISOString(),
    
    version: 1
  };
}

// ============================================
// PROCESAR LOTE COMPLETO
// ============================================
export function procesarLiquidaciones(
  paquetes: ManifestRow[],
  manifiestoId: string,
  config: ConfiguracionLiquidacion = DEFAULT_CONFIG_LIQUIDACION,
  onProgress?: (progress: number) => void
): Liquidacion[] {
  
  const liquidaciones: Liquidacion[] = [];
  const total = paquetes.length;
  
  for (let i = 0; i < paquetes.length; i++) {
    const paquete = paquetes[i];
    const liquidacion = calcularLiquidacion(paquete, manifiestoId, undefined, config);
    liquidaciones.push(liquidacion);
    
    if (onProgress && i % 10 === 0) {
      onProgress(Math.round((i / total) * 100));
    }
  }
  
  if (onProgress) {
    onProgress(100);
  }
  
  return liquidaciones;
}

// ============================================
// GENERAR RESUMEN DE LIQUIDACIONES
// ============================================
export function generarResumenLiquidacion(liquidaciones: Liquidacion[]): ResumenLiquidacion {
  const resumen: ResumenLiquidacion = {
    totalPaquetes: liquidaciones.length,
    totalValorCIF: 0,
    totalTributos: 0,
    totalAPagar: 0,
    porCategoria: {
      A: { cantidad: 0, valor: 0 },
      B: { cantidad: 0, valor: 0 },
      C: { cantidad: 0, valor: 0 },
      D: { cantidad: 0, valor: 0 }
    },
    pendientesHSCode: 0,
    conRestricciones: 0,
    requierenRevision: 0
  };
  
  for (const liq of liquidaciones) {
    resumen.totalValorCIF += liq.valorCIF;
    resumen.totalTributos += liq.totalTributos;
    resumen.totalAPagar += liq.totalAPagar;
    
    resumen.porCategoria[liq.categoriaAduanera].cantidad++;
    resumen.porCategoria[liq.categoriaAduanera].valor += liq.valorCIF;
    
    if (liq.estado === 'pendiente_hs_code' || liq.hsCode === '9999.99.99') {
      resumen.pendientesHSCode++;
    }
    
    if (liq.tieneRestricciones) {
      resumen.conRestricciones++;
    }
    
    if (liq.requiereRevisionManual) {
      resumen.requierenRevision++;
    }
  }
  
  // Redondear totales
  resumen.totalValorCIF = redondear(resumen.totalValorCIF);
  resumen.totalTributos = redondear(resumen.totalTributos);
  resumen.totalAPagar = redondear(resumen.totalAPagar);
  
  return resumen;
}

// ============================================
// EXPORTAR FUNCIONES ÚTILES
// ============================================
export { buscarArancelPorDescripcion } from './arancelesData';
export { verificarRestricciones, esProductoProhibido } from './restriccionesData';
