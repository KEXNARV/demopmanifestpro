// ============================================
// SISTEMA DE TASAS DE CAMBIO v1.0
// CORRECCIÓN H03: Tasas dinámicas con fecha de vigencia
// ============================================

import { TipoCambio } from '@/types/aduanas';
import { devLog, devWarn } from '@/lib/logger';

/**
 * Configuración de tasas de cambio
 */
export interface ConfigTasasCambio {
  // Fecha de última actualización
  fechaActualizacion: string;
  // Fuente de las tasas
  fuente: string;
  // Tasas por moneda
  tasas: Record<string, TipoCambio>;
  // Vigencia en horas
  vigenciaHoras: number;
}

/**
 * Tasas de cambio por defecto
 * Fuente: Estimaciones basadas en mercado - DEBEN actualizarse periódicamente
 */
const TASAS_DEFAULT: ConfigTasasCambio = {
  fechaActualizacion: new Date().toISOString().split('T')[0],
  fuente: 'Estimación interna - Actualizar con fuente oficial',
  vigenciaHoras: 24,
  tasas: {
    USD: {
      fecha: new Date().toISOString(),
      moneda: 'USD',
      tasa: 1.0,
      fuente: 'Base',
      oficial: true
    },
    EUR: {
      fecha: new Date().toISOString(),
      moneda: 'EUR',
      tasa: 1.08,
      fuente: 'Estimación',
      oficial: false
    },
    GBP: {
      fecha: new Date().toISOString(),
      moneda: 'GBP',
      tasa: 1.27,
      fuente: 'Estimación',
      oficial: false
    },
    CNY: {
      fecha: new Date().toISOString(),
      moneda: 'CNY',
      tasa: 0.14,
      fuente: 'Estimación',
      oficial: false
    },
    JPY: {
      fecha: new Date().toISOString(),
      moneda: 'JPY',
      tasa: 0.0067,
      fuente: 'Estimación',
      oficial: false
    },
    MXN: {
      fecha: new Date().toISOString(),
      moneda: 'MXN',
      tasa: 0.058,
      fuente: 'Estimación',
      oficial: false
    },
    COP: {
      fecha: new Date().toISOString(),
      moneda: 'COP',
      tasa: 0.00024,
      fuente: 'Estimación',
      oficial: false
    },
    BRL: {
      fecha: new Date().toISOString(),
      moneda: 'BRL',
      tasa: 0.20,
      fuente: 'Estimación',
      oficial: false
    },
    CAD: {
      fecha: new Date().toISOString(),
      moneda: 'CAD',
      tasa: 0.74,
      fuente: 'Estimación',
      oficial: false
    },
    CHF: {
      fecha: new Date().toISOString(),
      moneda: 'CHF',
      tasa: 1.13,
      fuente: 'Estimación',
      oficial: false
    }
  }
};

// Almacenamiento en memoria (puede extenderse a IndexedDB)
let configuracionActual: ConfigTasasCambio = { ...TASAS_DEFAULT };

/**
 * Gestor de Tasas de Cambio
 */
export class GestorTasasCambio {
  
  /**
   * Obtiene la tasa de cambio para una moneda
   */
  static obtenerTasa(moneda: string): TipoCambio {
    const monedaUpper = moneda.toUpperCase();
    
    if (configuracionActual.tasas[monedaUpper]) {
      const tasa = configuracionActual.tasas[monedaUpper];
      
      // Verificar vigencia
      if (this.esTasaVigente(tasa)) {
        return tasa;
      } else {
        devWarn(`Tasa para ${monedaUpper} está vencida. Fecha: ${tasa.fecha}`);
      }
    }
    
    // Fallback a tasa 1.0 para moneda desconocida
    devWarn(`Moneda ${monedaUpper} no encontrada. Usando tasa 1.0`);
    return {
      fecha: new Date().toISOString(),
      moneda: monedaUpper,
      tasa: 1.0,
      fuente: 'Fallback - Moneda no configurada',
      oficial: false
    };
  }
  
  /**
   * Convierte un valor a USD
   */
  static convertirAUSD(valor: number, monedaOrigen: string): {
    valorUSD: number;
    tasaAplicada: number;
    fechaTasa: string;
    fuente: string;
    esOficial: boolean;
  } {
    if (monedaOrigen.toUpperCase() === 'USD') {
      return {
        valorUSD: valor,
        tasaAplicada: 1.0,
        fechaTasa: new Date().toISOString(),
        fuente: 'Sin conversión',
        esOficial: true
      };
    }
    
    const tipoCambio = this.obtenerTasa(monedaOrigen);
    const valorUSD = Math.round(valor * tipoCambio.tasa * 100) / 100;
    
    devLog(`Conversión: ${valor} ${monedaOrigen} → ${valorUSD} USD (tasa: ${tipoCambio.tasa})`);
    
    return {
      valorUSD,
      tasaAplicada: tipoCambio.tasa,
      fechaTasa: tipoCambio.fecha,
      fuente: tipoCambio.fuente,
      esOficial: tipoCambio.oficial
    };
  }
  
  /**
   * Verifica si una tasa está vigente
   */
  static esTasaVigente(tasa: TipoCambio): boolean {
    const fechaTasa = new Date(tasa.fecha).getTime();
    const ahora = Date.now();
    const horasVigencia = configuracionActual.vigenciaHoras * 60 * 60 * 1000;
    
    return (ahora - fechaTasa) < horasVigencia;
  }
  
  /**
   * Actualiza las tasas de cambio
   */
  static actualizarTasas(nuevasTasas: Partial<Record<string, number>>, fuente: string): void {
    const fechaActual = new Date().toISOString();
    
    for (const [moneda, tasa] of Object.entries(nuevasTasas)) {
      if (tasa !== undefined) {
        configuracionActual.tasas[moneda.toUpperCase()] = {
          fecha: fechaActual,
          moneda: moneda.toUpperCase(),
          tasa,
          fuente,
          oficial: fuente.toLowerCase().includes('oficial')
        };
      }
    }
    
    configuracionActual.fechaActualizacion = fechaActual;
    configuracionActual.fuente = fuente;
    
    devLog(`Tasas actualizadas desde: ${fuente}`);
  }
  
  /**
   * Obtiene todas las tasas configuradas
   */
  static obtenerTodasLasTasas(): ConfigTasasCambio {
    return { ...configuracionActual };
  }
  
  /**
   * Obtiene el estado de vigencia de las tasas
   */
  static obtenerEstadoVigencia(): {
    vigentes: string[];
    vencidas: string[];
    fechaUltimaActualizacion: string;
  } {
    const vigentes: string[] = [];
    const vencidas: string[] = [];
    
    for (const [moneda, tasa] of Object.entries(configuracionActual.tasas)) {
      if (this.esTasaVigente(tasa)) {
        vigentes.push(moneda);
      } else {
        vencidas.push(moneda);
      }
    }
    
    return {
      vigentes,
      vencidas,
      fechaUltimaActualizacion: configuracionActual.fechaActualizacion
    };
  }
  
  /**
   * Restablece las tasas a valores por defecto
   */
  static resetearTasas(): void {
    configuracionActual = { ...TASAS_DEFAULT };
    devWarn('Tasas de cambio restablecidas a valores por defecto');
  }
}

export default GestorTasasCambio;
