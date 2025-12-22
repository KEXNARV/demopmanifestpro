// ============================================
// CACHÉ DE ARANCELES CON INDEXACIÓN EN MEMORIA
// Mejora de O(n) a O(1) en búsquedas
// ============================================

import { Arancel } from '@/types/aduanas';
import { ARANCELES_PANAMA } from './arancelesData';
import { devLog, devSuccess } from '@/lib/logger';

/**
 * Caché singleton para búsquedas O(1) de aranceles
 */
class CacheArancelesClass {
  private indicePorCodigo = new Map<string, Arancel>();
  private indicePorPalabraClave = new Map<string, Arancel[]>();
  private indiceCompleto: Arancel[] = [];
  private inicializado = false;
  
  /**
   * Inicializa caché desde datos estáticos
   */
  async inicializar(): Promise<void> {
    if (this.inicializado) {
      console.debug('Caché de aranceles ya inicializado');
      return;
    }
    
    const inicio = Date.now();
    
    // Cargar todos los aranceles
    this.indiceCompleto = [...ARANCELES_PANAMA];
    
    // Indexar por código HS
    for (const arancel of this.indiceCompleto) {
      this.indicePorCodigo.set(arancel.hsCode, arancel);
    }
    
    // Indexar por palabras clave
    for (const arancel of this.indiceCompleto) {
      const palabras = this.extraerPalabrasClave(arancel);
      
      for (const palabra of palabras) {
        if (!this.indicePorPalabraClave.has(palabra)) {
          this.indicePorPalabraClave.set(palabra, []);
        }
        this.indicePorPalabraClave.get(palabra)!.push(arancel);
      }
    }
    
    this.inicializado = true;
    
    const duracion = Date.now() - inicio;
    
    devSuccess(`Caché de aranceles inicializado - ${this.indiceCompleto.length} aranceles, ${this.indicePorPalabraClave.size} palabras clave, ${duracion}ms`);
  }
  /**
   * Busca arancel por código HS - O(1)
   */
  buscarPorCodigo(hsCode: string): Arancel | null {
    this.validarInicializado();
    return this.indicePorCodigo.get(hsCode) || null;
  }
  
  /**
   * Busca aranceles por descripción - O(1) promedio
   */
  buscarPorDescripcion(descripcion: string, limit: number = 5): Arancel[] {
    this.validarInicializado();
    
    // Extraer palabras de la descripción
    const palabras = this.normalizarTexto(descripcion).split(' ');
    
    // Mapa de aranceles con score
    const scoreMap = new Map<string, number>();
    
    for (const palabra of palabras) {
      if (palabra.length < 3) continue;
      
      const aranceles = this.indicePorPalabraClave.get(palabra) || [];
      
      for (const arancel of aranceles) {
        const scoreActual = scoreMap.get(arancel.hsCode) || 0;
        scoreMap.set(arancel.hsCode, scoreActual + 1);
      }
    }
    
    // Ordenar por score descendente
    const resultados = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([hsCode]) => this.indicePorCodigo.get(hsCode)!)
      .filter(Boolean);
    
    return resultados;
  }
  
  /**
   * Busca arancel con mejor coincidencia
   */
  buscarMejorCoincidencia(descripcion: string): Arancel | null {
    const resultados = this.buscarPorDescripcion(descripcion, 1);
    return resultados.length > 0 ? resultados[0] : null;
  }
  
  /**
   * Extrae palabras clave de un arancel para indexación
   */
  private extraerPalabrasClave(arancel: Arancel): Set<string> {
    const palabras = new Set<string>();
    
    // Palabras de descripción
    const descNormalizada = this.normalizarTexto(arancel.descripcion);
    for (const palabra of descNormalizada.split(' ')) {
      if (palabra.length >= 3) {
        palabras.add(palabra);
      }
    }
    
    // Palabras de categoría
    const catNormalizada = this.normalizarTexto(arancel.categoria);
    for (const palabra of catNormalizada.split(' ')) {
      if (palabra.length >= 3) {
        palabras.add(palabra);
      }
    }
    
    // Código HS como palabra clave
    palabras.add(arancel.hsCode);
    
    return palabras;
  }
  
  /**
   * Normaliza texto para búsqueda
   */
  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Valida que el caché esté inicializado
   */
  private validarInicializado(): void {
    if (!this.inicializado) {
      // Auto-inicializar sincrónicamente si es posible
      this.indiceCompleto = [...ARANCELES_PANAMA];
      for (const arancel of this.indiceCompleto) {
        this.indicePorCodigo.set(arancel.hsCode, arancel);
      }
      this.inicializado = true;
    }
  }
  
  /**
   * Invalida caché (para actualizaciones)
   */
  invalidar(): void {
    this.indicePorCodigo.clear();
    this.indicePorPalabraClave.clear();
    this.indiceCompleto = [];
    this.inicializado = false;
    devLog('Caché de aranceles invalidado');
  }
  
  /**
   * Obtiene estadísticas del caché
   */
  obtenerEstadisticas() {
    return {
      inicializado: this.inicializado,
      totalAranceles: this.indiceCompleto.length,
      codigosIndexados: this.indicePorCodigo.size,
      palabrasClaveIndexadas: this.indicePorPalabraClave.size
    };
  }
}

// Singleton export
export const CacheAranceles = new CacheArancelesClass();
