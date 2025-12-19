// ============================================
// GESTOR DE LOCKS PARA CONTROL DE CONCURRENCIA
// Previene procesamiento duplicado del mismo MAWB
// ============================================

export interface ManifiestoLock {
  mawb: string;
  operador: string;
  timestamp: string;
  estado: 'procesando' | 'completado' | 'error';
  sessionId: string;
}

// Storage key para locks
const LOCKS_KEY = 'manifest_locks';
const TIMEOUT_MINUTOS = 30;

// Generar session ID único
function generarSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Session ID único para esta instancia
const SESSION_ID = generarSessionId();

// Key para almacenar manifiestos procesados
const MANIFESTS_STORAGE_KEY = 'processed_manifests';

// Función auxiliar para obtener manifiestos almacenados
function getStoredManifestsLocal(): Array<{ mawb?: string; processedAt: string; totalRows: number }> {
  try {
    const stored = localStorage.getItem(MANIFESTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * GESTOR DE LOCKS PARA CONTROL DE CONCURRENCIA
 */
export class GestorLocks {
  
  /**
   * Obtiene todos los locks almacenados
   */
  private static getLocks(): Map<string, ManifiestoLock> {
    try {
      const stored = localStorage.getItem(LOCKS_KEY);
      if (!stored) return new Map();
      
      const locksArray = JSON.parse(stored) as [string, ManifiestoLock][];
      return new Map(locksArray);
    } catch {
      return new Map();
    }
  }
  
  /**
   * Guarda los locks
   */
  private static saveLocks(locks: Map<string, ManifiestoLock>): void {
    try {
      const locksArray = Array.from(locks.entries());
      localStorage.setItem(LOCKS_KEY, JSON.stringify(locksArray));
    } catch (error) {
      console.error('Error guardando locks:', error);
    }
  }
  
  /**
   * Intenta adquirir lock para procesar MAWB
   * @throws Error si no puede adquirir el lock
   */
  static adquirirLock(mawb: string, operador: string = 'Sistema'): boolean {
    const locks = this.getLocks();
    
    // 1. Verificar si ya fue procesado completamente
    const manifiestos = getStoredManifestsLocal();
    const manifiestoExistente = manifiestos.find(m => m.mawb === mawb);
    
    if (manifiestoExistente) {
      throw new Error(
        `❌ MAWB ${mawb} ya fue procesado.\n` +
        `Fecha: ${new Date(manifiestoExistente.processedAt).toLocaleString()}\n` +
        `Total paquetes: ${manifiestoExistente.totalRows}`
      );
    }
    
    // 2. Verificar si hay un lock activo
    const lockExistente = locks.get(mawb);
    
    if (lockExistente && lockExistente.estado === 'procesando') {
      // Calcular tiempo transcurrido
      const tiempoTranscurrido = Date.now() - new Date(lockExistente.timestamp).getTime();
      const minutosTranscurridos = Math.floor(tiempoTranscurrido / 60000);
      
      // Si el lock es reciente, rechazar
      if (minutosTranscurridos < TIMEOUT_MINUTOS) {
        throw new Error(
          `⏳ MAWB ${mawb} está siendo procesado.\n` +
          `Operador: ${lockExistente.operador}\n` +
          `Iniciado hace: ${minutosTranscurridos} minutos\n` +
          `\nPor favor espere o contacte al operador.`
        );
      }
      
      // Lock expirado - permitir override
      console.warn('Lock expirado, permitiendo override', {
        mawb,
        operadorAnterior: lockExistente.operador,
        minutosTranscurridos
      });
    }
    
    // 3. Crear nuevo lock
    const nuevoLock: ManifiestoLock = {
      mawb,
      operador,
      timestamp: new Date().toISOString(),
      estado: 'procesando',
      sessionId: SESSION_ID
    };
    
    locks.set(mawb, nuevoLock);
    this.saveLocks(locks);
    
    console.log('✅ Lock adquirido exitosamente', { mawb, operador });
    
    return true;
  }
  
  /**
   * Libera lock después de procesar
   */
  static liberarLock(mawb: string, estado: 'completado' | 'error'): void {
    const locks = this.getLocks();
    const lock = locks.get(mawb);
    
    if (lock) {
      lock.estado = estado;
      lock.timestamp = new Date().toISOString();
      locks.set(mawb, lock);
      this.saveLocks(locks);
      
      console.log('Lock actualizado', { mawb, estado });
    }
  }
  
  /**
   * Elimina lock (para limpiezas manuales)
   */
  static eliminarLock(mawb: string): void {
    const locks = this.getLocks();
    locks.delete(mawb);
    this.saveLocks(locks);
  }
  
  /**
   * Verifica si un MAWB está bloqueado
   */
  static estaBloqueado(mawb: string): { bloqueado: boolean; info?: ManifiestoLock } {
    const locks = this.getLocks();
    const lock = locks.get(mawb);
    
    if (!lock || lock.estado !== 'procesando') {
      return { bloqueado: false };
    }
    
    // Verificar si expiró
    const tiempoTranscurrido = Date.now() - new Date(lock.timestamp).getTime();
    const minutosTranscurridos = tiempoTranscurrido / 60000;
    
    if (minutosTranscurridos >= TIMEOUT_MINUTOS) {
      return { bloqueado: false };
    }
    
    return { bloqueado: true, info: lock };
  }
  
  /**
   * Limpia locks expirados
   */
  static limpiarLocksExpirados(): number {
    const locks = this.getLocks();
    const ahora = Date.now();
    let limpiados = 0;
    
    for (const [mawb, lock] of locks.entries()) {
      const tiempoTranscurrido = ahora - new Date(lock.timestamp).getTime();
      const minutosTranscurridos = tiempoTranscurrido / 60000;
      
      // Limpiar locks de más de 2 horas
      if (minutosTranscurridos > 120) {
        locks.delete(mawb);
        limpiados++;
      }
    }
    
    if (limpiados > 0) {
      this.saveLocks(locks);
      console.log('Locks expirados limpiados', { cantidad: limpiados });
    }
    
    return limpiados;
  }
  
  /**
   * Obtiene todos los locks activos
   */
  static getLocksActivos(): ManifiestoLock[] {
    const locks = this.getLocks();
    return Array.from(locks.values()).filter(lock => {
      if (lock.estado !== 'procesando') return false;
      
      const tiempoTranscurrido = Date.now() - new Date(lock.timestamp).getTime();
      const minutosTranscurridos = tiempoTranscurrido / 60000;
      
      return minutosTranscurridos < TIMEOUT_MINUTOS;
    });
  }
}

export default GestorLocks;
