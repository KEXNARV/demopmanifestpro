// ============================================
// SISTEMA DE APRENDIZAJE DE RESTRICCIONES
// Guarda restricciones aprendidas por palabra clave
// La IA aprende cuando el corredor asigna manualmente un permiso
// ============================================

import { TipoRestriccion } from '@/types/aduanas';
import { devLog, devWarn } from '@/lib/logger';

export interface RestriccionAprendida {
  id: string;
  palabraClave: string;
  palabrasRelacionadas: string[];
  tipoRestriccion: TipoRestriccion;
  autoridad: string;
  requierePermiso: boolean;
  descripcion: string;
  
  // Metadatos de aprendizaje
  fechaAprendizaje: Date;
  fuenteAprendizaje: 'manual' | 'patron' | 'ia';
  guiaOrigen?: string;
  usuarioId?: string;
  
  // Estadísticas de uso
  vecesAplicada: number;
  ultimaAplicacion?: Date;
  confianza: number; // 0-100
  
  // Estado
  activo: boolean;
  validadoPorUsuario: boolean;
}

export interface RegistroAprendizaje {
  id: string;
  fecha: Date;
  tipoEvento: 'restriccion_aprendida' | 'hts_corregido' | 'permiso_asignado' | 'patron_detectado';
  conceptoAprendido: string;
  descripcion: string;
  accionAutomaticaNueva: string;
  metadatos?: Record<string, any>;
}

const STORAGE_KEY_RESTRICCIONES = 'pasarex_restricciones_aprendidas';
const STORAGE_KEY_LOG = 'pasarex_log_aprendizaje';

/**
 * Gestor de restricciones aprendidas
 */
export class GestorRestriccionesAprendidas {
  private static restricciones: Map<string, RestriccionAprendida> = new Map();
  private static logAprendizaje: RegistroAprendizaje[] = [];
  private static inicializado = false;
  
  /**
   * Inicializa el gestor cargando datos de localStorage
   */
  static inicializar(): void {
    if (this.inicializado) return;
    
    try {
      // Cargar restricciones
      const datosRestricciones = localStorage.getItem(STORAGE_KEY_RESTRICCIONES);
      if (datosRestricciones) {
        const parsed = JSON.parse(datosRestricciones) as RestriccionAprendida[];
        for (const r of parsed) {
          r.fechaAprendizaje = new Date(r.fechaAprendizaje);
          if (r.ultimaAplicacion) r.ultimaAplicacion = new Date(r.ultimaAplicacion);
          this.restricciones.set(r.id, r);
        }
      }
      
      // Cargar log
      const datosLog = localStorage.getItem(STORAGE_KEY_LOG);
      if (datosLog) {
        this.logAprendizaje = JSON.parse(datosLog).map((r: any) => ({
          ...r,
          fecha: new Date(r.fecha)
        }));
      }
      
      this.inicializado = true;
      devLog(`[Aprendizaje] Cargadas ${this.restricciones.size} restricciones y ${this.logAprendizaje.length} registros`);
    } catch (error) {
      devWarn('[Aprendizaje] Error al cargar datos:', error);
    }
  }
  
  /**
   * Guarda los datos en localStorage
   */
  private static guardar(): void {
    try {
      const restriccionesArray = Array.from(this.restricciones.values());
      localStorage.setItem(STORAGE_KEY_RESTRICCIONES, JSON.stringify(restriccionesArray));
      localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(this.logAprendizaje));
    } catch (error) {
      devWarn('[Aprendizaje] Error al guardar:', error);
    }
  }
  
  /**
   * Aprende una nueva restricción basada en asignación manual del corredor
   */
  static aprenderRestriccion(
    palabraClave: string,
    tipoRestriccion: TipoRestriccion,
    autoridad: string,
    descripcion: string,
    opciones: {
      guiaOrigen?: string;
      usuarioId?: string;
      palabrasRelacionadas?: string[];
      requierePermiso?: boolean;
    } = {}
  ): RestriccionAprendida {
    this.inicializar();
    
    const id = `ra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ahora = new Date();
    
    // Verificar si ya existe una restricción similar
    const existente = this.buscarPorPalabraClave(palabraClave);
    if (existente) {
      // Actualizar la existente
      existente.vecesAplicada++;
      existente.ultimaAplicacion = ahora;
      existente.confianza = Math.min(100, existente.confianza + 5);
      this.guardar();
      return existente;
    }
    
    const restriccion: RestriccionAprendida = {
      id,
      palabraClave: palabraClave.toLowerCase().trim(),
      palabrasRelacionadas: opciones.palabrasRelacionadas || [],
      tipoRestriccion,
      autoridad,
      requierePermiso: opciones.requierePermiso ?? true,
      descripcion,
      fechaAprendizaje: ahora,
      fuenteAprendizaje: 'manual',
      guiaOrigen: opciones.guiaOrigen,
      usuarioId: opciones.usuarioId,
      vecesAplicada: 1,
      ultimaAplicacion: ahora,
      confianza: 50, // Confianza inicial
      activo: true,
      validadoPorUsuario: true
    };
    
    this.restricciones.set(id, restriccion);
    
    // Registrar en log de aprendizaje
    this.registrarAprendizaje({
      tipoEvento: 'restriccion_aprendida',
      conceptoAprendido: `Restricción ${autoridad} para "${palabraClave}"`,
      descripcion: `El corredor asignó permiso de ${autoridad} a productos con "${palabraClave}"`,
      accionAutomaticaNueva: `Aplicar ${autoridad} automáticamente cuando se detecte "${palabraClave}"`
    });
    
    this.guardar();
    
    devLog(`[Aprendizaje] Nueva restricción aprendida: ${palabraClave} → ${autoridad}`);
    
    return restriccion;
  }
  
  /**
   * Busca restricción por palabra clave
   */
  static buscarPorPalabraClave(palabraClave: string): RestriccionAprendida | null {
    this.inicializar();
    const palabraLower = palabraClave.toLowerCase().trim();
    
    for (const restriccion of this.restricciones.values()) {
      if (!restriccion.activo) continue;
      
      // Coincidencia exacta
      if (restriccion.palabraClave === palabraLower) {
        return restriccion;
      }
      
      // Coincidencia en palabras relacionadas
      if (restriccion.palabrasRelacionadas.some(p => p.toLowerCase() === palabraLower)) {
        return restriccion;
      }
    }
    
    return null;
  }
  
  /**
   * Verifica descripciones contra restricciones aprendidas
   */
  static verificarDescripcion(descripcion: string): RestriccionAprendida[] {
    this.inicializar();
    const descLower = descripcion.toLowerCase();
    const coincidencias: RestriccionAprendida[] = [];
    
    for (const restriccion of this.restricciones.values()) {
      if (!restriccion.activo) continue;
      
      // Verificar palabra clave principal
      if (descLower.includes(restriccion.palabraClave)) {
        coincidencias.push(restriccion);
        restriccion.vecesAplicada++;
        restriccion.ultimaAplicacion = new Date();
        continue;
      }
      
      // Verificar palabras relacionadas
      for (const palabra of restriccion.palabrasRelacionadas) {
        if (descLower.includes(palabra.toLowerCase())) {
          coincidencias.push(restriccion);
          restriccion.vecesAplicada++;
          restriccion.ultimaAplicacion = new Date();
          break;
        }
      }
    }
    
    if (coincidencias.length > 0) {
      this.guardar();
    }
    
    return coincidencias;
  }
  
  /**
   * Registra un evento de aprendizaje
   */
  static registrarAprendizaje(datos: Omit<RegistroAprendizaje, 'id' | 'fecha'>): void {
    const registro: RegistroAprendizaje = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fecha: new Date(),
      ...datos
    };
    
    this.logAprendizaje.unshift(registro);
    
    // Limitar a últimos 100 registros
    if (this.logAprendizaje.length > 100) {
      this.logAprendizaje = this.logAprendizaje.slice(0, 100);
    }
    
    this.guardar();
  }
  
  /**
   * Registra corrección de HTS
   */
  static registrarCorreccionHTS(
    hsCodeAnterior: string,
    hsCodeNuevo: string,
    descripcionProducto: string,
    guia: string
  ): void {
    this.inicializar();
    
    this.registrarAprendizaje({
      tipoEvento: 'hts_corregido',
      conceptoAprendido: `HTS ${hsCodeAnterior} → ${hsCodeNuevo}`,
      descripcion: `Corrección manual de código HTS para "${descripcionProducto}"`,
      accionAutomaticaNueva: `Sugerir ${hsCodeNuevo} para productos similares`,
      metadatos: { hsCodeAnterior, hsCodeNuevo, guia }
    });
  }
  
  /**
   * Obtiene todas las restricciones aprendidas
   */
  static obtenerTodas(): RestriccionAprendida[] {
    this.inicializar();
    return Array.from(this.restricciones.values())
      .filter(r => r.activo)
      .sort((a, b) => b.vecesAplicada - a.vecesAplicada);
  }
  
  /**
   * Obtiene el log de aprendizaje
   */
  static obtenerLogAprendizaje(limite: number = 50): RegistroAprendizaje[] {
    this.inicializar();
    return this.logAprendizaje.slice(0, limite);
  }
  
  /**
   * Obtiene estadísticas de aprendizaje
   */
  static obtenerEstadisticas(): {
    totalRestricciones: number;
    restriccionesActivas: number;
    totalAplicaciones: number;
    autoridadesMasComunes: { autoridad: string; cantidad: number }[];
    ultimoAprendizaje?: Date;
  } {
    this.inicializar();
    
    const restriccionesActivas = Array.from(this.restricciones.values()).filter(r => r.activo);
    const totalAplicaciones = restriccionesActivas.reduce((sum, r) => sum + r.vecesAplicada, 0);
    
    // Contar autoridades
    const conteoAutoridades = new Map<string, number>();
    for (const r of restriccionesActivas) {
      conteoAutoridades.set(r.autoridad, (conteoAutoridades.get(r.autoridad) || 0) + 1);
    }
    
    const autoridadesMasComunes = Array.from(conteoAutoridades.entries())
      .map(([autoridad, cantidad]) => ({ autoridad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
    
    const ultimoAprendizaje = this.logAprendizaje[0]?.fecha;
    
    return {
      totalRestricciones: this.restricciones.size,
      restriccionesActivas: restriccionesActivas.length,
      totalAplicaciones,
      autoridadesMasComunes,
      ultimoAprendizaje
    };
  }
  
  /**
   * Desactiva una restricción
   */
  static desactivarRestriccion(id: string): boolean {
    this.inicializar();
    
    const restriccion = this.restricciones.get(id);
    if (restriccion) {
      restriccion.activo = false;
      this.guardar();
      return true;
    }
    return false;
  }
  
  /**
   * Exporta datos para backup
   */
  static exportar(): string {
    this.inicializar();
    return JSON.stringify({
      restricciones: Array.from(this.restricciones.values()),
      log: this.logAprendizaje,
      exportadoEn: new Date().toISOString()
    }, null, 2);
  }
  
  /**
   * Importa datos desde backup
   */
  static importar(datos: string): boolean {
    try {
      const parsed = JSON.parse(datos);
      
      if (parsed.restricciones) {
        for (const r of parsed.restricciones) {
          r.fechaAprendizaje = new Date(r.fechaAprendizaje);
          if (r.ultimaAplicacion) r.ultimaAplicacion = new Date(r.ultimaAplicacion);
          this.restricciones.set(r.id, r);
        }
      }
      
      if (parsed.log) {
        const logsImportados = parsed.log.map((l: any) => ({
          ...l,
          fecha: new Date(l.fecha)
        }));
        this.logAprendizaje = [...logsImportados, ...this.logAprendizaje].slice(0, 100);
      }
      
      this.guardar();
      devLog(`[Aprendizaje] Datos importados correctamente`);
      return true;
    } catch (error) {
      devWarn('[Aprendizaje] Error al importar:', error);
      return false;
    }
  }
}

// Inicializar automáticamente
if (typeof window !== 'undefined') {
  GestorRestriccionesAprendidas.inicializar();
}
