// ============================================
// OPERACIONES ATÓMICAS DE ALMACENAMIENTO
// Garantiza integridad de datos en operaciones complejas
// ============================================

import { ManifestRow, ProcessedBatch, ProcessingSummary } from '@/types/manifest';
import { Liquidacion, ResumenLiquidacion } from '@/types/aduanas';
import { GestorLocks } from '@/lib/concurrencia/gestorLocks';
import { safeJsonParse, safeJsonParseArray } from '@/lib/utils/safeJsonParse';
import { 
  ManifestStorageSchema, 
  ManifestRowSchema, 
  LiquidacionSchema,
  BackupDataSchema 
} from '@/lib/schemas/storageSchemas';
import { z } from 'zod';

// Storage keys
const MANIFESTS_KEY = 'processed_manifests';
const PAQUETES_KEY = 'manifest_packages';
const LIQUIDACIONES_KEY = 'manifest_liquidaciones';
const BACKUP_KEY = 'manifest_backup';

export interface ManifestStorage {
  id: string;
  mawb?: string;
  fileName: string;
  totalRows: number;
  totalBatches: number;
  totalValue: number;
  processedAt: string;
  summary?: ProcessingSummary;
}

export interface ManifiestoCompleto {
  id: string;
  mawb: string;
  manifiesto: ManifestStorage;
  paquetes: ManifestRow[];
  batches: ProcessedBatch[];
  liquidaciones: Liquidacion[];
  resumenLiquidacion: ResumenLiquidacion;
  fechaProceso: string;
}

// Helper functions
function getStoredManifests(): ManifestStorage[] {
  const stored = localStorage.getItem(MANIFESTS_KEY);
  const parsed = safeJsonParseArray(stored, ManifestStorageSchema);
  // Filter out items missing required fields
  return parsed.filter((m): m is ManifestStorage => 
    typeof m.id === 'string' && typeof m.fileName === 'string'
  );
}

function saveManifest(manifest: ManifestStorage): void {
  const manifests = getStoredManifests();
  const existingIndex = manifests.findIndex(m => m.id === manifest.id);
  if (existingIndex >= 0) {
    manifests[existingIndex] = manifest;
  } else {
    manifests.push(manifest);
  }
  localStorage.setItem(MANIFESTS_KEY, JSON.stringify(manifests));
}

/**
 * Obtiene paquetes almacenados por manifiesto
 */
function getPaquetesAlmacenados(): Map<string, ManifestRow[]> {
  const stored = localStorage.getItem(PAQUETES_KEY);
  if (!stored) return new Map();
  
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Map();
    
    // Validate each entry
    const validEntries: [string, ManifestRow[]][] = [];
    for (const entry of parsed) {
      if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && Array.isArray(entry[1])) {
        validEntries.push([entry[0], entry[1] as ManifestRow[]]);
      }
    }
    return new Map(validEntries);
  } catch {
    return new Map();
  }
}

/**
 * Obtiene liquidaciones almacenadas por manifiesto
 */
function getLiquidacionesAlmacenadas(): Map<string, Liquidacion[]> {
  const stored = localStorage.getItem(LIQUIDACIONES_KEY);
  if (!stored) return new Map();
  
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Map();
    
    // Validate each entry
    const validEntries: [string, Liquidacion[]][] = [];
    for (const entry of parsed) {
      if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && Array.isArray(entry[1])) {
        validEntries.push([entry[0], entry[1] as Liquidacion[]]);
      }
    }
    return new Map(validEntries);
  } catch {
    return new Map();
  }
}

/**
 * GUARDA MANIFIESTO COMPLETO DE FORMA ATÓMICA
 * Todo o nada - si falla, hace rollback
 */
export async function guardarManifiestoCompleto(
  datos: ManifiestoCompleto,
  operador: string = 'Sistema'
): Promise<{ exito: boolean; mensaje: string }> {
  
  const { mawb } = datos;
  
  // PASO 0: Validar que no exista duplicado
  const manifiestos = getStoredManifests();
  const existente = manifiestos.find(m => m.mawb === mawb);
  
  if (existente) {
    return {
      exito: false,
      mensaje: `MAWB ${mawb} ya existe. Procesado el ${new Date(existente.processedAt).toLocaleString()}`
    };
  }
  
  // PASO 1: Crear backup del estado actual (para rollback)
  const backup = {
    manifiestos: [...manifiestos],
    paquetes: getPaquetesAlmacenados(),
    liquidaciones: getLiquidacionesAlmacenadas(),
    timestamp: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      manifiestos: backup.manifiestos,
      paquetes: Array.from(backup.paquetes.entries()),
      liquidaciones: Array.from(backup.liquidaciones.entries()),
      timestamp: backup.timestamp
    }));
  } catch (error) {
    console.error('Error creando backup:', error);
    // Continuar aunque falle el backup
  }
  
  try {
    // PASO 2: Guardar manifiesto principal
    saveManifest(datos.manifiesto);
    console.log('✅ Manifiesto principal guardado');
    
    // PASO 3: Guardar paquetes
    const paquetesMap = getPaquetesAlmacenados();
    paquetesMap.set(datos.id, datos.paquetes);
    localStorage.setItem(PAQUETES_KEY, JSON.stringify(Array.from(paquetesMap.entries())));
    console.log('✅ Paquetes guardados:', datos.paquetes.length);
    
    // PASO 4: Guardar liquidaciones
    const liquidacionesMap = getLiquidacionesAlmacenadas();
    liquidacionesMap.set(datos.id, datos.liquidaciones);
    localStorage.setItem(LIQUIDACIONES_KEY, JSON.stringify(Array.from(liquidacionesMap.entries())));
    console.log('✅ Liquidaciones guardadas:', datos.liquidaciones.length);
    
    // PASO 5: Liberar lock si existe
    GestorLocks.liberarLock(mawb, 'completado');
    
    // PASO 6: Limpiar backup (ya no es necesario)
    localStorage.removeItem(BACKUP_KEY);
    
    return {
      exito: true,
      mensaje: `Manifiesto ${mawb} guardado exitosamente con ${datos.paquetes.length} paquetes`
    };
    
  } catch (error) {
    // ROLLBACK: Restaurar estado anterior
    console.error('Error guardando manifiesto, haciendo rollback:', error);
    
    try {
      // Restaurar desde backup
      const backupStr = localStorage.getItem(BACKUP_KEY);
      const backupData = safeJsonParse(backupStr, BackupDataSchema);
      
      if (backupData) {
        // Restaurar manifiestos
        localStorage.setItem('processed_manifests', JSON.stringify(backupData.manifiestos));
        
        // Restaurar paquetes
        localStorage.setItem(PAQUETES_KEY, JSON.stringify(backupData.paquetes));
        
        // Restaurar liquidaciones
        localStorage.setItem(LIQUIDACIONES_KEY, JSON.stringify(backupData.liquidaciones));
        
        console.log('✅ Rollback completado');
      }
    } catch (rollbackError) {
      console.error('Error en rollback:', rollbackError);
    }
    
    // Liberar lock con error
    GestorLocks.liberarLock(mawb, 'error');
    
    return {
      exito: false,
      mensaje: `Error guardando manifiesto: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Obtiene un manifiesto completo con todos sus datos
 */
export function obtenerManifiestoCompleto(id: string): ManifiestoCompleto | null {
  const manifiestos = getStoredManifests();
  const manifiesto = manifiestos.find(m => m.id === id);
  
  if (!manifiesto) return null;
  
  const paquetesMap = getPaquetesAlmacenados();
  const liquidacionesMap = getLiquidacionesAlmacenadas();
  
  const paquetes = paquetesMap.get(id) || [];
  const liquidaciones = liquidacionesMap.get(id) || [];
  
  // Calcular resumen de liquidación
  const resumenLiquidacion: ResumenLiquidacion = {
    totalPaquetes: liquidaciones.length,
    totalValorCIF: liquidaciones.reduce((s, l) => s + l.valorCIF, 0),
    totalTributos: liquidaciones.reduce((s, l) => s + l.totalTributos, 0),
    totalAPagar: liquidaciones.reduce((s, l) => s + l.totalAPagar, 0),
    porCategoria: {
      A: { cantidad: liquidaciones.filter(l => l.categoriaAduanera === 'A').length, valor: 0 },
      B: { cantidad: liquidaciones.filter(l => l.categoriaAduanera === 'B').length, valor: 0 },
      C: { cantidad: liquidaciones.filter(l => l.categoriaAduanera === 'C').length, valor: 0 },
      D: { cantidad: liquidaciones.filter(l => l.categoriaAduanera === 'D').length, valor: 0 }
    },
    pendientesHSCode: liquidaciones.filter(l => !l.hsCode || l.hsCode === '9999.99.99').length,
    conRestricciones: liquidaciones.filter(l => l.tieneRestricciones).length,
    requierenRevision: liquidaciones.filter(l => l.requiereRevisionManual).length
  };
  
  return {
    id,
    mawb: manifiesto.mawb || '',
    manifiesto,
    paquetes,
    batches: [],
    liquidaciones,
    resumenLiquidacion,
    fechaProceso: manifiesto.processedAt
  };
}

/**
 * Elimina un manifiesto y todos sus datos relacionados
 */
export function eliminarManifiestoCompleto(id: string): boolean {
  try {
    // Eliminar de manifiestos
    const manifiestos = getStoredManifests();
    const nuevosManifiestos = manifiestos.filter(m => m.id !== id);
    localStorage.setItem('processed_manifests', JSON.stringify(nuevosManifiestos));
    
    // Eliminar paquetes
    const paquetesMap = getPaquetesAlmacenados();
    paquetesMap.delete(id);
    localStorage.setItem(PAQUETES_KEY, JSON.stringify(Array.from(paquetesMap.entries())));
    
    // Eliminar liquidaciones
    const liquidacionesMap = getLiquidacionesAlmacenadas();
    liquidacionesMap.delete(id);
    localStorage.setItem(LIQUIDACIONES_KEY, JSON.stringify(Array.from(liquidacionesMap.entries())));
    
    console.log('✅ Manifiesto eliminado:', id);
    return true;
    
  } catch (error) {
    console.error('Error eliminando manifiesto:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas de almacenamiento
 */
export function obtenerEstadisticasAlmacenamiento(): {
  totalManifiestos: number;
  totalPaquetes: number;
  totalLiquidaciones: number;
  espacioUsado: string;
} {
  const manifiestos = getStoredManifests();
  const paquetesMap = getPaquetesAlmacenados();
  const liquidacionesMap = getLiquidacionesAlmacenadas();
  
  let totalPaquetes = 0;
  let totalLiquidaciones = 0;
  
  for (const paquetes of paquetesMap.values()) {
    totalPaquetes += paquetes.length;
  }
  
  for (const liquidaciones of liquidacionesMap.values()) {
    totalLiquidaciones += liquidaciones.length;
  }
  
  // Estimar espacio usado en localStorage
  let espacioBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        espacioBytes += key.length + value.length;
      }
    }
  }
  
  const espacioMB = (espacioBytes / (1024 * 1024)).toFixed(2);
  
  return {
    totalManifiestos: manifiestos.length,
    totalPaquetes,
    totalLiquidaciones,
    espacioUsado: `${espacioMB} MB`
  };
}

export default {
  guardarManifiestoCompleto,
  obtenerManifiestoCompleto,
  eliminarManifiestoCompleto,
  obtenerEstadisticasAlmacenamiento
};
