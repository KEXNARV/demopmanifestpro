// ============================================
// CONFIGURACIÓN CENTRALIZADA DE UMBRALES
// H01: Fuente única de verdad para todos los módulos
// ============================================

import { ConfiguracionLiquidacion, DEFAULT_CONFIG_LIQUIDACION } from '@/types/aduanas';

// Singleton para configuración global
let currentConfig: ConfiguracionLiquidacion = { ...DEFAULT_CONFIG_LIQUIDACION };

/**
 * Servicio de configuración centralizado
 * Todos los módulos deben usar este servicio para obtener umbrales
 */
export class ConfigService {
  /**
   * Obtiene la configuración actual
   */
  static getConfig(): ConfiguracionLiquidacion {
    return { ...currentConfig };
  }
  
  /**
   * Obtiene el umbral De Minimis
   * Política: valor <= umbral → exento (Categoría B)
   */
  static getUmbralDeMinimis(): number {
    return currentConfig.umbralDeMinimis;
  }
  
  /**
   * Obtiene el umbral para corredor obligatorio
   * Política: valor >= umbral → requiere corredor (Categoría D)
   */
  static getUmbralCorredorObligatorio(): number {
    return currentConfig.umbralCorredorObligatorio;
  }
  
  /**
   * Clasifica un valor según la política de umbrales
   * POLÍTICA ÚNICA:
   * - Categoría B (exento): valor <= umbralDeMinimis
   * - Categoría C (tributos): umbralDeMinimis < valor < umbralCorredorObligatorio
   * - Categoría D (corredor): valor >= umbralCorredorObligatorio
   */
  static clasificarPorValor(valor: number): 'B' | 'C' | 'D' {
    if (valor <= currentConfig.umbralDeMinimis) return 'B';
    if (valor >= currentConfig.umbralCorredorObligatorio) return 'D';
    return 'C';
  }
  
  /**
   * Verifica si un valor está exento (De Minimis)
   */
  static esExento(valor: number): boolean {
    return valor <= currentConfig.umbralDeMinimis;
  }
  
  /**
   * Verifica si un valor requiere corredor
   */
  static requiereCorredor(valor: number): boolean {
    return valor >= currentConfig.umbralCorredorObligatorio;
  }
  
  /**
   * Actualiza la configuración (solo para admin)
   */
  static updateConfig(newConfig: Partial<ConfiguracionLiquidacion>): void {
    currentConfig = { ...currentConfig, ...newConfig };
    console.log('Configuración actualizada:', currentConfig);
  }
  
  /**
   * Restaura configuración por defecto
   */
  static resetConfig(): void {
    currentConfig = { ...DEFAULT_CONFIG_LIQUIDACION };
  }
}

export default ConfigService;
