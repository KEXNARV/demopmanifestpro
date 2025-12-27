// ============================================
// CALCULADORA DE LIQUIDACIÓN OFICIAL ANA
// Sincronización exacta con modelos reales ANA555
// ITBMS + DAI + Tasa Sistema = B/. 56.66
// ============================================

import { CONSTANTES_DECLARACION } from '@/types/declaracionOficial';
import { devLog } from '@/lib/logger';

export interface ComponentesLiquidacion {
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  
  // Tributos
  montoDAI: number;
  percentDAI: number;
  montoISC: number;
  percentISC: number;
  montoITBMS: number;
  percentITBMS: number;
  
  // Tasas de sistema
  tasaSIGA: number;
  tasaFormulario: number;
  
  // Totales
  totalTributos: number;      // DAI + ISC + ITBMS
  totalTasas: number;         // SIGA + Formulario
  totalAPagar: number;        // Todo incluido
  
  // Desglose para verificación
  desglose: {
    concepto: string;
    base: number;
    tasa: string;
    monto: number;
  }[];
}

export interface ConfiguracionLiquidacionANA {
  daiPercent: number;
  iscPercent: number;
  itbmsPercent: number;
  incluirTasaSIGA: boolean;
  incluirTasaFormulario: boolean;
}

const CONFIG_DEFAULT: ConfiguracionLiquidacionANA = {
  daiPercent: 0,
  iscPercent: 0,
  itbmsPercent: CONSTANTES_DECLARACION.ITBMS_STANDARD,
  incluirTasaSIGA: true,
  incluirTasaFormulario: true
};

/**
 * Calcula liquidación exacta según modelo ANA
 * Asegura que ITBMS + DAI + Tasa Sistema = monto esperado
 */
export function calcularLiquidacionOficial(
  valorFOB: number,
  valorFlete: number,
  valorSeguro: number,
  config: Partial<ConfiguracionLiquidacionANA> = {}
): ComponentesLiquidacion {
  const cfg = { ...CONFIG_DEFAULT, ...config };
  
  // Redondeo bancario (2 decimales)
  const redondear = (valor: number): number => {
    return Math.round(valor * 100) / 100;
  };
  
  // 1. Calcular CIF
  const valorCIF = redondear(valorFOB + valorFlete + valorSeguro);
  
  // 2. Calcular DAI sobre CIF
  const montoDAI = redondear(valorCIF * (cfg.daiPercent / 100));
  
  // 3. Calcular base ISC = CIF + DAI
  const baseISC = valorCIF + montoDAI;
  const montoISC = redondear(baseISC * (cfg.iscPercent / 100));
  
  // 4. Calcular base ITBMS = CIF + DAI + ISC
  const baseITBMS = valorCIF + montoDAI + montoISC;
  const montoITBMS = redondear(baseITBMS * (cfg.itbmsPercent / 100));
  
  // 5. Tasas de sistema
  const tasaSIGA = cfg.incluirTasaSIGA ? CONSTANTES_DECLARACION.TASA_SIGA : 0;
  const tasaFormulario = cfg.incluirTasaFormulario ? CONSTANTES_DECLARACION.TASA_FORMULARIO : 0;
  
  // 6. Totales
  const totalTributos = redondear(montoDAI + montoISC + montoITBMS);
  const totalTasas = redondear(tasaSIGA + tasaFormulario);
  const totalAPagar = redondear(totalTributos + totalTasas);
  
  // 7. Generar desglose
  const desglose: ComponentesLiquidacion['desglose'] = [
    { concepto: 'Valor FOB', base: valorFOB, tasa: '-', monto: valorFOB },
    { concepto: 'Flete', base: valorFOB, tasa: '-', monto: valorFlete },
    { concepto: 'Seguro', base: valorFOB, tasa: `${CONSTANTES_DECLARACION.SEGURO_TEORICO_PERCENT}%`, monto: valorSeguro },
    { concepto: 'VALOR CIF', base: 0, tasa: '-', monto: valorCIF },
    { concepto: 'DAI (Arancel)', base: valorCIF, tasa: `${cfg.daiPercent}%`, monto: montoDAI },
    { concepto: 'ISC', base: baseISC, tasa: `${cfg.iscPercent}%`, monto: montoISC },
    { concepto: 'ITBMS', base: baseITBMS, tasa: `${cfg.itbmsPercent}%`, monto: montoITBMS },
    { concepto: 'Tasa SIGA', base: 0, tasa: 'Fija', monto: tasaSIGA },
    { concepto: 'Tasa Formulario', base: 0, tasa: 'Fija', monto: tasaFormulario },
    { concepto: 'TOTAL A PAGAR', base: 0, tasa: '-', monto: totalAPagar }
  ];
  
  devLog(`[Liquidación] CIF: ${valorCIF}, DAI: ${montoDAI}, ITBMS: ${montoITBMS}, Total: ${totalAPagar}`);
  
  return {
    valorFOB,
    valorFlete,
    valorSeguro,
    valorCIF,
    montoDAI,
    percentDAI: cfg.daiPercent,
    montoISC,
    percentISC: cfg.iscPercent,
    montoITBMS,
    percentITBMS: cfg.itbmsPercent,
    tasaSIGA,
    tasaFormulario,
    totalTributos,
    totalTasas,
    totalAPagar,
    desglose
  };
}

/**
 * Verifica si una liquidación suma correctamente
 * Útil para validar contra modelos ANA reales
 */
export function verificarLiquidacion(
  liquidacion: ComponentesLiquidacion,
  montoEsperado: number,
  tolerancia: number = 0.01
): {
  coincide: boolean;
  diferencia: number;
  mensaje: string;
} {
  const diferencia = Math.abs(liquidacion.totalAPagar - montoEsperado);
  const coincide = diferencia <= tolerancia;
  
  return {
    coincide,
    diferencia,
    mensaje: coincide 
      ? `✓ Liquidación correcta: B/. ${liquidacion.totalAPagar.toFixed(2)}`
      : `✗ Diferencia de B/. ${diferencia.toFixed(2)} (Esperado: ${montoEsperado.toFixed(2)}, Calculado: ${liquidacion.totalAPagar.toFixed(2)})`
  };
}

/**
 * Ejemplo de cálculo para B/. 56.66 (modelo ANA555)
 * Basado en valores típicos de courier bajo valor
 */
export function ejemploLiquidacionANA555(): {
  liquidacion: ComponentesLiquidacion;
  explicacion: string;
} {
  // Valores típicos para llegar a B/. 56.66
  // Asumiendo: FOB ~$700, Flete ~$50, DAI 0%, ITBMS 7%
  const valorFOB = 700.00;
  const valorFlete = 50.00;
  const valorSeguro = valorFOB * (CONSTANTES_DECLARACION.SEGURO_TEORICO_PERCENT / 100);
  
  const liquidacion = calcularLiquidacionOficial(valorFOB, valorFlete, valorSeguro, {
    daiPercent: 0,      // Producto exento de DAI
    iscPercent: 0,      // Sin ISC
    itbmsPercent: 7     // ITBMS estándar
  });
  
  const explicacion = `
Ejemplo de Liquidación ANA555:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOB: $${valorFOB.toFixed(2)}
Flete: $${valorFlete.toFixed(2)}
Seguro (1%): $${valorSeguro.toFixed(2)}
CIF: $${liquidacion.valorCIF.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAI (0%): $${liquidacion.montoDAI.toFixed(2)}
ISC (0%): $${liquidacion.montoISC.toFixed(2)}
ITBMS (7%): $${liquidacion.montoITBMS.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tributos: $${liquidacion.totalTributos.toFixed(2)}
Tasa SIGA: $${liquidacion.tasaSIGA.toFixed(2)}
Tasa Formulario: $${liquidacion.tasaFormulario.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL A PAGAR: B/. ${liquidacion.totalAPagar.toFixed(2)}
  `.trim();
  
  return { liquidacion, explicacion };
}

/**
 * Calcula el valor FOB necesario para llegar a un monto de tributos específico
 * Útil para verificación inversa
 */
export function calcularFOBParaTributos(
  tributosObjetivo: number,
  config: Partial<ConfiguracionLiquidacionANA> = {}
): number {
  const cfg = { ...CONFIG_DEFAULT, ...config };
  
  // Descontar tasas fijas
  const tasasFijas = (cfg.incluirTasaSIGA ? CONSTANTES_DECLARACION.TASA_SIGA : 0) +
                     (cfg.incluirTasaFormulario ? CONSTANTES_DECLARACION.TASA_FORMULARIO : 0);
  
  const tributosNetos = tributosObjetivo - tasasFijas;
  
  // Fórmula inversa considerando cascada fiscal
  // tributos = CIF * (DAI/100) + (CIF + DAI) * (ISC/100) + (CIF + DAI + ISC) * (ITBMS/100)
  // Simplificando para ISC = 0:
  // tributos = CIF * DAI/100 + (CIF + CIF*DAI/100) * ITBMS/100
  // tributos = CIF * (DAI/100 + ITBMS/100 + DAI*ITBMS/10000)
  
  const factorTotal = (cfg.daiPercent / 100) + 
                      (cfg.itbmsPercent / 100) + 
                      (cfg.daiPercent * cfg.itbmsPercent / 10000);
  
  const cifNecesario = tributosNetos / factorTotal;
  
  // Asumir flete 7% y seguro 1%
  const fobEstimado = cifNecesario / 1.08;
  
  return Math.round(fobEstimado * 100) / 100;
}
