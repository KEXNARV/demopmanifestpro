// ============================================
// GESTOR DE ALERTAS DE MORA
// Lee fechas de registro y calcula alertas de vencimiento
// Basado en formato oficial ANA 2025
// ============================================

import { CONSTANTES_ANA, calcularVencimientosANA, formatearFechaANA } from '@/types/declaracionOficial';
import { devLog, devWarn } from '@/lib/logger';

export interface AlertaMora {
  id: string;
  declaracionNumero: string;
  fechaRegistro: Date;
  montoOriginal: number;
  
  // Escenarios de pago
  escenarios: {
    normal: { monto: number; fechaLimite: Date; diasRestantes: number };
    recargo1: { monto: number; fechaDesde: Date; fechaHasta: Date; porcentaje: number };
    recargo2: { monto: number; fechaDesde: Date; porcentaje: number };
  };
  
  // Estado actual
  estadoActual: 'vigente' | 'recargo_1' | 'recargo_2' | 'vencido';
  montoActual: number;
  diasEnMora: number;
  
  // Alertas
  alertaNivel: 'info' | 'warning' | 'danger';
  mensaje: string;
  proximoCambio?: { fecha: Date; nuevoMonto: number };
}

export interface ConfiguracionMora {
  recargo1Porcentaje: number;
  recargo1DespuesDias: number;
  recargo2Porcentaje: number;
  recargo2DespuesDias: number;
}

const CONFIG_MORA_DEFAULT: ConfiguracionMora = {
  recargo1Porcentaje: CONSTANTES_ANA.RECARGO_1_PERCENT,
  recargo1DespuesDias: CONSTANTES_ANA.DIAS_PAGO_PUNTUAL,
  recargo2Porcentaje: CONSTANTES_ANA.RECARGO_2_PERCENT,
  recargo2DespuesDias: CONSTANTES_ANA.DIAS_RECARGO_10
};

/**
 * Calcula la alerta de mora para una declaración
 */
export function calcularAlertaMora(
  declaracionNumero: string,
  fechaRegistro: Date,
  montoOriginal: number,
  config: ConfiguracionMora = CONFIG_MORA_DEFAULT
): AlertaMora {
  const ahora = new Date();
  const id = `mora_${declaracionNumero}_${Date.now()}`;
  
  // Calcular fechas límite usando días hábiles
  const fechaNormal = agregarDiasHabiles(fechaRegistro, config.recargo1DespuesDias);
  const fechaRecargo1Hasta = agregarDiasHabiles(fechaRegistro, config.recargo2DespuesDias);
  const fechaRecargo2Desde = new Date(fechaRecargo1Hasta);
  fechaRecargo2Desde.setDate(fechaRecargo2Desde.getDate() + 1);
  
  // Calcular montos con recargos
  const montoRecargo1 = redondear(montoOriginal * (1 + config.recargo1Porcentaje / 100));
  const montoRecargo2 = redondear(montoOriginal * (1 + config.recargo2Porcentaje / 100));
  
  // Calcular días restantes/en mora
  const diasHastaVencimiento = Math.ceil(
    (fechaNormal.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const diasEnMora = diasHastaVencimiento < 0 ? Math.abs(diasHastaVencimiento) : 0;
  
  // Determinar estado actual
  let estadoActual: AlertaMora['estadoActual'];
  let montoActual: number;
  let alertaNivel: AlertaMora['alertaNivel'];
  let mensaje: string;
  let proximoCambio: AlertaMora['proximoCambio'] | undefined;
  
  if (ahora <= fechaNormal) {
    // Dentro del plazo normal
    estadoActual = 'vigente';
    montoActual = montoOriginal;
    
    if (diasHastaVencimiento <= 2) {
      alertaNivel = 'warning';
      mensaje = `⚠️ Próximo a vencer: ${diasHastaVencimiento} día(s) para pagar B/. ${montoOriginal.toFixed(2)}`;
      proximoCambio = { fecha: fechaNormal, nuevoMonto: montoRecargo1 };
    } else {
      alertaNivel = 'info';
      mensaje = `✓ Vigente: ${diasHastaVencimiento} días para pagar B/. ${montoOriginal.toFixed(2)}`;
    }
    
  } else if (ahora <= fechaRecargo1Hasta) {
    // En período de recargo 1 (10%)
    estadoActual = 'recargo_1';
    montoActual = montoRecargo1;
    alertaNivel = 'warning';
    
    const diasParaRecargo2 = Math.ceil(
      (fechaRecargo1Hasta.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    mensaje = `⚠️ Recargo ${config.recargo1Porcentaje}% aplicado: B/. ${montoOriginal.toFixed(2)} → B/. ${montoRecargo1.toFixed(2)}. Pague antes de ${diasParaRecargo2} día(s) para evitar recargo adicional.`;
    proximoCambio = { fecha: fechaRecargo2Desde, nuevoMonto: montoRecargo2 };
    
  } else {
    // En período de recargo 2 (20%)
    estadoActual = 'recargo_2';
    montoActual = montoRecargo2;
    alertaNivel = 'danger';
    mensaje = `🚨 Recargo máximo ${config.recargo2Porcentaje}% aplicado: B/. ${montoOriginal.toFixed(2)} → B/. ${montoRecargo2.toFixed(2)}. Pago urgente requerido.`;
  }
  
  devLog(`[Mora] ${declaracionNumero}: Estado=${estadoActual}, Monto=${montoActual}`);
  
  return {
    id,
    declaracionNumero,
    fechaRegistro,
    montoOriginal,
    escenarios: {
      normal: {
        monto: montoOriginal,
        fechaLimite: fechaNormal,
        diasRestantes: Math.max(0, diasHastaVencimiento)
      },
      recargo1: {
        monto: montoRecargo1,
        fechaDesde: new Date(fechaNormal.getTime() + 24 * 60 * 60 * 1000),
        fechaHasta: fechaRecargo1Hasta,
        porcentaje: config.recargo1Porcentaje
      },
      recargo2: {
        monto: montoRecargo2,
        fechaDesde: fechaRecargo2Desde,
        porcentaje: config.recargo2Porcentaje
      }
    },
    estadoActual,
    montoActual,
    diasEnMora,
    alertaNivel,
    mensaje,
    proximoCambio
  };
}

/**
 * Agrega días hábiles a una fecha (excluye sábados y domingos)
 */
function agregarDiasHabiles(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  let diasAgregados = 0;
  
  while (diasAgregados < dias) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }
  
  return resultado;
}

/**
 * Procesa múltiples declaraciones y genera alertas
 */
export function procesarAlertasMora(
  declaraciones: Array<{
    numero: string;
    fechaRegistro: Date | string;
    montoOriginal: number;
  }>,
  config: ConfiguracionMora = CONFIG_MORA_DEFAULT
): {
  alertas: AlertaMora[];
  resumen: {
    totalDeclaraciones: number;
    vigentes: number;
    conRecargo1: number;
    conRecargo2: number;
    montoTotalPendiente: number;
    montoRecargosTotales: number;
  };
} {
  const alertas: AlertaMora[] = [];
  let vigentes = 0;
  let conRecargo1 = 0;
  let conRecargo2 = 0;
  let montoTotalPendiente = 0;
  let montoRecargosTotales = 0;
  
  for (const decl of declaraciones) {
    const fechaRegistro = typeof decl.fechaRegistro === 'string' 
      ? new Date(decl.fechaRegistro) 
      : decl.fechaRegistro;
    
    const alerta = calcularAlertaMora(
      decl.numero,
      fechaRegistro,
      decl.montoOriginal,
      config
    );
    
    alertas.push(alerta);
    montoTotalPendiente += alerta.montoActual;
    
    if (alerta.estadoActual === 'vigente') {
      vigentes++;
    } else if (alerta.estadoActual === 'recargo_1') {
      conRecargo1++;
      montoRecargosTotales += alerta.montoActual - alerta.montoOriginal;
    } else {
      conRecargo2++;
      montoRecargosTotales += alerta.montoActual - alerta.montoOriginal;
    }
  }
  
  return {
    alertas,
    resumen: {
      totalDeclaraciones: declaraciones.length,
      vigentes,
      conRecargo1,
      conRecargo2,
      montoTotalPendiente: redondear(montoTotalPendiente),
      montoRecargosTotales: redondear(montoRecargosTotales)
    }
  };
}

/**
 * Formatea fechas de vencimiento para mostrar al usuario
 */
export function formatearVencimientos(alerta: AlertaMora): string {
  const formatoFecha = (fecha: Date) => formatearFechaANA(fecha);
  
  return `
📅 Fechas de Vencimiento para ${alerta.declaracionNumero}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Pago Normal: B/. ${alerta.escenarios.normal.monto.toFixed(2)}
   Hasta: ${formatoFecha(alerta.escenarios.normal.fechaLimite)}
   
⚠️ Con Recargo ${alerta.escenarios.recargo1.porcentaje}%: B/. ${alerta.escenarios.recargo1.monto.toFixed(2)}
   Del ${formatoFecha(alerta.escenarios.recargo1.fechaDesde)} al ${formatoFecha(alerta.escenarios.recargo1.fechaHasta)}
   
🚨 Con Recargo ${alerta.escenarios.recargo2.porcentaje}%: B/. ${alerta.escenarios.recargo2.monto.toFixed(2)}
   Desde: ${formatoFecha(alerta.escenarios.recargo2.fechaDesde)}
  `.trim();
}

// Utilidad de redondeo
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Ejemplo específico: B/. 41.83 → B/. 46.02 → B/. 50.19
 */
export function ejemploMoraANA(): void {
  const montoOriginal = 41.83;
  const fechaRegistro = new Date();
  fechaRegistro.setDate(fechaRegistro.getDate() - 6);
  
  const alerta = calcularAlertaMora('DE2025122444677-9', fechaRegistro, montoOriginal);
  
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ejemplo de Cálculo de Mora (ANA 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monto Original: B/. ${montoOriginal.toFixed(2)}
Con Recargo 10%: B/. ${(montoOriginal * 1.10).toFixed(2)}
Con Recargo 20%: B/. ${(montoOriginal * 1.20).toFixed(2)}

Estado Actual: ${alerta.estadoActual}
Monto a Pagar: B/. ${alerta.montoActual.toFixed(2)}
Mensaje: ${alerta.mensaje}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
