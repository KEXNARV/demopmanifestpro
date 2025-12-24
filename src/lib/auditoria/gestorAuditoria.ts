// ============================================
// GESTOR DE AUDITORÍA v3.0
// Registra todos los cambios en liquidaciones
// CORRECCIÓN H04: Hash SHA-256 encadenado para integridad
// ============================================

import { Liquidacion } from '@/types/aduanas';
import { dbPut, dbGetAll, dbGetByIndex, dbDelete, initDB } from '@/lib/db/indexedDB';
import { devLog, devError, devSuccess, devWarn } from '@/lib/logger';
import CryptoJS from 'crypto-js';

/**
 * Registro de auditoría con integridad criptográfica
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
  
  // H04: Campos de integridad criptográfica
  hashContenido: string;      // SHA-256 del contenido del registro
  hashAnterior: string;       // Hash del registro anterior (cadena)
  numeroSecuencia: number;    // Número de secuencia en la cadena
  version: string;            // Versión del esquema de auditoría
}

// Caché en memoria para lecturas rápidas
let cacheRegistros: RegistroAuditoria[] = [];
let cacheInicializado = false;
let ultimoHash: string = 'GENESIS_BLOCK_PASAREX_ADUANAS_2024';
let ultimaSecuencia: number = 0;

const VERSION_AUDITORIA = '3.0';

/**
 * Generar ID único
 */
function generarId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calcula el hash SHA-256 del contenido de un registro
 */
function calcularHashContenido(registro: {
  id: string;
  liquidacionId: string;
  numeroGuia: string;
  timestamp: string;
  operador: string;
  accion: string;
  cambios: unknown[];
  justificacion?: string;
}): string {
  const contenido = JSON.stringify({
    id: registro.id,
    liquidacionId: registro.liquidacionId,
    numeroGuia: registro.numeroGuia,
    timestamp: registro.timestamp,
    operador: registro.operador,
    accion: registro.accion,
    cambios: registro.cambios,
    justificacion: registro.justificacion
  });
  
  return CryptoJS.SHA256(contenido).toString(CryptoJS.enc.Hex);
}

/**
 * Calcula el hash encadenado (incluye hash anterior)
 */
function calcularHashEncadenado(hashContenido: string, hashAnterior: string, secuencia: number): string {
  const cadena = `${secuencia}:${hashAnterior}:${hashContenido}`;
  return CryptoJS.SHA256(cadena).toString(CryptoJS.enc.Hex);
}

/**
 * Inicializa el caché desde IndexedDB
 */
async function inicializarCache(): Promise<void> {
  if (cacheInicializado) return;
  
  try {
    await initDB();
    cacheRegistros = await dbGetAll<RegistroAuditoria>('auditoria');
    
    // Ordenar por secuencia para obtener el último hash
    cacheRegistros.sort((a, b) => (a.numeroSecuencia || 0) - (b.numeroSecuencia || 0));
    
    if (cacheRegistros.length > 0) {
      const ultimo = cacheRegistros[cacheRegistros.length - 1];
      ultimoHash = ultimo.hashContenido || ultimoHash;
      ultimaSecuencia = ultimo.numeroSecuencia || 0;
    }
    
    cacheInicializado = true;
    devSuccess(`Caché de auditoría inicializado: ${cacheRegistros.length} registros, última secuencia: ${ultimaSecuencia}`);
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
   * Crea un registro de auditoría con integridad criptográfica
   */
  private static crearRegistroConHash(
    datosBase: {
      id: string;
      liquidacionId: string;
      numeroGuia: string;
      timestamp: string;
      operador: string;
      accion: 'creacion' | 'modificacion' | 'aprobacion' | 'anulacion';
      cambios: { campo: string; valorAnterior: unknown; valorNuevo: unknown }[];
      justificacion?: string;
      userAgent?: string;
    }
  ): RegistroAuditoria {
    // Calcular hash del contenido
    const hashContenido = calcularHashContenido(datosBase);
    
    // Incrementar secuencia
    ultimaSecuencia++;
    
    // Crear registro completo
    const registro: RegistroAuditoria = {
      ...datosBase,
      hashContenido,
      hashAnterior: ultimoHash,
      numeroSecuencia: ultimaSecuencia,
      version: VERSION_AUDITORIA
    };
    
    // Actualizar último hash para el siguiente registro
    ultimoHash = calcularHashEncadenado(hashContenido, registro.hashAnterior, ultimaSecuencia);
    
    return registro;
  }
  
  /**
   * Registra creación de liquidación
   */
  static async registrarCreacion(
    liquidacion: Liquidacion,
    operador: string = 'sistema'
  ): Promise<void> {
    try {
      await inicializarCache();
      
      const datosBase = {
        id: generarId(),
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'creacion' as const,
        cambios: [] as { campo: string; valorAnterior: unknown; valorNuevo: unknown }[],
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      const registro = this.crearRegistroConHash(datosBase);
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      devLog(`Auditoría: Creación registrada [Seq: ${registro.numeroSecuencia}, Hash: ${registro.hashContenido.substring(0, 12)}...]`);
    } catch (error) {
      devError('Error registrando creación en auditoría');
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
        devLog('Auditoría: No se detectaron cambios');
        return;
      }
      
      const datosBase = {
        id: generarId(),
        liquidacionId: liquidacionNueva.id,
        numeroGuia: liquidacionNueva.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'modificacion' as const,
        cambios,
        justificacion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      const registro = this.crearRegistroConHash(datosBase);
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      devLog(`Auditoría: Modificación registrada [Seq: ${registro.numeroSecuencia}, Campos: ${cambios.map(c => c.campo).join(', ')}]`);
    } catch (error) {
      devError('Error registrando modificación en auditoría');
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
      
      const datosBase = {
        id: generarId(),
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'aprobacion' as const,
        cambios: [
          {
            campo: 'estado',
            valorAnterior: 'calculada' as unknown,
            valorNuevo: 'aprobada' as unknown
          }
        ],
        justificacion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      const registro = this.crearRegistroConHash(datosBase);
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      devLog(`Auditoría: Aprobación registrada [Seq: ${registro.numeroSecuencia}]`);
    } catch (error) {
      devError('Error registrando aprobación en auditoría');
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
      
      const datosBase = {
        id: generarId(),
        liquidacionId: liquidacion.id,
        numeroGuia: liquidacion.numeroGuia,
        timestamp: new Date().toISOString(),
        operador,
        accion: 'anulacion' as const,
        cambios: [
          {
            campo: 'estado',
            valorAnterior: liquidacion.estado as unknown,
            valorNuevo: 'anulada' as unknown
          }
        ],
        justificacion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };
      
      const registro = this.crearRegistroConHash(datosBase);
      
      // Guardar en IndexedDB
      await dbPut('auditoria', registro);
      
      // Actualizar caché
      cacheRegistros.push(registro);
      
      devLog(`Auditoría: Anulación registrada [Seq: ${registro.numeroSecuencia}, Motivo: ${justificacion}]`);
    } catch (error) {
      devError('Error registrando anulación en auditoría');
    }
  }
  
  /**
   * Obtiene historial completo de una liquidación
   */
  static async obtenerHistorial(liquidacionId: string): Promise<RegistroAuditoria[]> {
    try {
      await inicializarCache();
      
      const registrosDB = await dbGetByIndex<RegistroAuditoria>(
        'auditoria', 
        'liquidacionId', 
        liquidacionId
      );
      
      return registrosDB.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      devError('Error obteniendo historial de auditoría');
      
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
      devError('Error obteniendo cambios de operador');
      
      return cacheRegistros
        .filter(r => r.operador === operador)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limite);
    }
  }
  
  /**
   * Verifica la integridad de la cadena de auditoría
   */
  static async verificarIntegridad(): Promise<{
    esValida: boolean;
    totalRegistros: number;
    registrosVerificados: number;
    errores: string[];
  }> {
    try {
      await inicializarCache();
      
      const registros = await dbGetAll<RegistroAuditoria>('auditoria');
      registros.sort((a, b) => (a.numeroSecuencia || 0) - (b.numeroSecuencia || 0));
      
      const errores: string[] = [];
      let hashEsperado = 'GENESIS_BLOCK_PASAREX_ADUANAS_2024';
      
      for (const registro of registros) {
        // Verificar que el hash anterior coincide
        if (registro.hashAnterior !== hashEsperado) {
          errores.push(`Registro ${registro.id}: Hash anterior no coincide (esperado: ${hashEsperado.substring(0, 12)}..., encontrado: ${registro.hashAnterior?.substring(0, 12)}...)`);
        }
        
        // Recalcular hash del contenido
        const hashRecalculado = calcularHashContenido(registro);
        if (hashRecalculado !== registro.hashContenido) {
          errores.push(`Registro ${registro.id}: Contenido modificado (hash no coincide)`);
        }
        
        // Actualizar hash esperado para el siguiente
        hashEsperado = calcularHashEncadenado(registro.hashContenido, registro.hashAnterior, registro.numeroSecuencia);
      }
      
      return {
        esValida: errores.length === 0,
        totalRegistros: registros.length,
        registrosVerificados: registros.length,
        errores
      };
    } catch (error) {
      devError('Error verificando integridad de auditoría');
      return {
        esValida: false,
        totalRegistros: 0,
        registrosVerificados: 0,
        errores: ['Error al verificar integridad']
      };
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
      devError('Error obteniendo todos los registros');
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
      
      devLog(`Auditoría: ${eliminados} registros antiguos eliminados`);
      return eliminados;
    } catch (error) {
      devError('Error limpiando registros antiguos');
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
    integridadVerificada?: boolean;
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
      devError('Error obteniendo estadísticas');
      return {
        totalRegistros: 0,
        porAccion: {},
        ultimaActividad: null
      };
    }
  }
}
