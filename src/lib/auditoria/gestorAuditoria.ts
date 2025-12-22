// ============================================
// GESTOR DE AUDITORÍA v2.0
// Registra todos los cambios en liquidaciones
// Usa IndexedDB para persistencia real
// ============================================

import { Liquidacion } from '@/types/aduanas';
import { dbPut, dbGetAll, dbGetByIndex, dbDelete, initDB } from '@/lib/db/indexedDB';
import { devLog, devError, devSuccess } from '@/lib/logger';

/**
 * Registro de auditoría
 */
export interface RegistroAuditoria {
  id: string;
  liquidacionId: string;
  numeroGuia: string;
  timestamp: string;
  operador: string;
  accion: 'creacion' | 'modificacion' | 'aprobacion' | 'anulacion';
  cambios: {
    campo: string;
    valorAnterior: unknown;
    valorNuevo: unknown;
  }[];
  justificacion?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Caché en memoria para lecturas rápidas
let cacheRegistros: RegistroAuditoria[] = [];
let cacheInicializado = false;

/**
 * Generar ID único
 */
function generarId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Inicializa el caché desde IndexedDB
 */
async function inicializarCache(): Promise<void> {
  if (cacheInicializado) return;
  
  try {
    await initDB();
    cacheRegistros = await dbGetAll<RegistroAuditoria>('auditoria');
    cacheInicializado = true;
    devSuccess(`Caché de auditoría inicializado: ${cacheRegistros.length} registros`);
  } catch (error) {
    devError('Error inicializando caché de auditoría');
    cacheRegistros = [];
    cacheInicializado = true;
  }
}

/**
 * Gestor de auditoría para liquidaciones
 */
export class GestorAuditoria {
  
  /**
   * Registra creación de liquidación
   */
  static async registrarCreacion(
    liquidacion: Liquidacion,
    operador: string = 'sistema'
  ): Promise<void> {
    try {
      await inicializarCache();
      
      const registro: RegistroAuditoria = {
        id: generarId(),
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'creacion',
        cambios: [],
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      console.log('Auditoría: Creación registrada', {
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        operador
      });
    } catch (error) {
      console.error('Error registrando creación en auditoría:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }
  
  /**
   * Registra modificación de liquidación
   */
  static async registrarModificacion(
    liquidacionAnterior: Liquidacion,
    liquidacionNueva: Liquidacion,
    operador: string,
    justificacion?: string
  ): Promise<void> {
    try {
      await inicializarCache();
      
      const cambios = this.detectarCambios(liquidacionAnterior, liquidacionNueva);
      
      if (cambios.length === 0) {
        console.debug('Auditoría: No se detectaron cambios');
        return;
      }
      
      const registro: RegistroAuditoria = {
        id: generarId(),
        liquidacionId: liquidacionNueva.id,
        numeroGuia: liquidacionNueva.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'modificacion',
        cambios,
        justificacion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      console.log('Auditoría: Modificación registrada', {
        liquidacionId: liquidacionNueva.id,
        camposModificados: cambios.map(c => c.campo)
      });
    } catch (error) {
      console.error('Error registrando modificación en auditoría:', error);
    }
  }
  
  /**
   * Registra aprobación de liquidación
   */
  static async registrarAprobacion(
    liquidacion: Liquidacion,
    operador: string,
    justificacion?: string
  ): Promise<void> {
    try {
      await inicializarCache();
      
      const registro: RegistroAuditoria = {
        id: generarId(),
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'aprobacion',
        cambios: [
          {
            campo: 'estado',
            valorAnterior: 'calculada',
            valorNuevo: 'aprobada'
          }
        ],
        justificacion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      console.log('Auditoría: Aprobación registrada', {
        liquidacionId: liquidacion.id,
        operador
      });
    } catch (error) {
      console.error('Error registrando aprobación en auditoría:', error);
    }
  }
  
  /**
   * Registra anulación de liquidación
   */
  static async registrarAnulacion(
    liquidacion: Liquidacion,
    operador: string,
    justificacion: string
  ): Promise<void> {
    try {
      await inicializarCache();
      
      const registro: RegistroAuditoria = {
        id: generarId(),
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'anulacion',
        cambios: [
          {
            campo: 'estado',
            valorAnterior: liquidacion.estado,
            valorNuevo: 'anulada'
          }
        ],
        justificacion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      console.log('Auditoría: Anulación registrada', {
        liquidacionId: liquidacion.id,
        operador,
        justificacion
      });
    } catch (error) {
      console.error('Error registrando anulación en auditoría:', error);
    }
  }
  
  /**
   * Obtiene historial completo de una liquidación
   */
  static async obtenerHistorial(liquidacionId: string): Promise<RegistroAuditoria[]> {
    try {
      await inicializarCache();
      
      // Primero buscar en IndexedDB
      const registrosDB = await dbGetByIndex<RegistroAuditoria>(
        'auditoria', 
        'liquidacionId', 
        liquidacionId
      );
      
      return registrosDB.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error obteniendo historial de auditoría:', error);
      
      // Fallback al caché
      return cacheRegistros
        .filter(r => r.liquidacionId === liquidacionId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  }
  
  /**
   * Obtiene cambios recientes de un operador
   */
  static async obtenerCambiosOperador(
    operador: string,
    limite: number = 50
  ): Promise<RegistroAuditoria[]> {
    try {
      await inicializarCache();
      
      const registrosDB = await dbGetByIndex<RegistroAuditoria>(
        'auditoria',
        'operador',
        operador
      );
      
      return registrosDB
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limite);
    } catch (error) {
      console.error('Error obteniendo cambios de operador:', error);
      
      return cacheRegistros
        .filter(r => r.operador === operador)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limite);
    }
  }
  
  /**
   * Detecta diferencias entre dos liquidaciones
   */
  private static detectarCambios(
    anterior: Liquidacion,
    nueva: Liquidacion
  ): { campo: string; valorAnterior: unknown; valorNuevo: unknown }[] {
    const cambios: { campo: string; valorAnterior: unknown; valorNuevo: unknown }[] = [];
    
    const camposCriticos: (keyof Liquidacion)[] = [
      'hsCode',
      'valorCIF',
      'percentDAI',
      'percentISC',
      'percentITBMS',
      'montoDAI',
      'montoISC',
      'montoITBMS',
      'totalTributos',
      'totalAPagar',
      'estado'
    ];
    
    for (const campo of camposCriticos) {
      const valorAnterior = anterior[campo];
      const valorNuevo = nueva[campo];
      
      if (valorAnterior !== valorNuevo) {
        cambios.push({
          campo,
          valorAnterior,
          valorNuevo
        });
      }
    }
    
    return cambios;
  }
  
  /**
   * Obtiene todos los registros (para exportación)
   */
  static async obtenerTodosRegistros(): Promise<RegistroAuditoria[]> {
    try {
      await inicializarCache();
      return await dbGetAll<RegistroAuditoria>('auditoria');
    } catch (error) {
      console.error('Error obteniendo todos los registros:', error);
      return [...cacheRegistros];
    }
  }
  
  /**
   * Limpia registros antiguos (más de 90 días)
   */
  static async limpiarRegistrosAntiguos(): Promise<number> {
    try {
      await inicializarCache();
      
      const limiteMs = 90 * 24 * 60 * 60 * 1000;
      const ahora = Date.now();
      let eliminados = 0;
      
      const todosRegistros = await dbGetAll<RegistroAuditoria>('auditoria');
      
      for (const registro of todosRegistros) {
        if (ahora - new Date(registro.timestamp).getTime() > limiteMs) {
          await dbDelete('auditoria', registro.id);
          eliminados++;
        }
      }
      
      // Actualizar caché
      cacheRegistros = cacheRegistros.filter(
        r => ahora - new Date(r.timestamp).getTime() < limiteMs
      );
      
      console.log(`Auditoría: ${eliminados} registros antiguos eliminados`);
      return eliminados;
    } catch (error) {
      console.error('Error limpiando registros antiguos:', error);
      return 0;
    }
  }
  
  /**
   * Obtiene estadísticas de auditoría
   */
  static async obtenerEstadisticas(): Promise<{
    totalRegistros: number;
    porAccion: Record<string, number>;
    ultimaActividad: string | null;
  }> {
    try {
      await inicializarCache();
      
      const registros = await dbGetAll<RegistroAuditoria>('auditoria');
      
      const porAccion: Record<string, number> = {};
      let ultimaActividad: string | null = null;
      
      for (const reg of registros) {
        porAccion[reg.accion] = (porAccion[reg.accion] || 0) + 1;
        
        if (!ultimaActividad || reg.timestamp > ultimaActividad) {
          ultimaActividad = reg.timestamp;
        }
      }
      
      return {
        totalRegistros: registros.length,
        porAccion,
        ultimaActividad
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalRegistros: 0,
        porAccion: {},
        ultimaActividad: null
      };
    }
  }
}
