/**
 * MÓDULO DE BASE DE DATOS v2.0
 * 
 * Maneja operaciones atómicas para guardar manifiestos y datos relacionados.
 * Usa IndexedDB para persistencia robusta sin límite de 5MB.
 * Mantiene compatibilidad con localStorage como fallback.
 * 
 * @version 2.0.0
 */

import { ResultadoProcesamiento, FilaProcesada } from '../workers/procesador.worker';
import { 
  initDB, 
  dbPut, 
  dbPutMany, 
  dbGet, 
  dbGetAll, 
  dbGetByIndex, 
  dbDelete, 
  dbDeleteByIndex,
  migrateFromLocalStorage 
} from './indexedDB';

// ============================================
// TIPOS DE BASE DE DATOS
// ============================================

export interface ManifiestoGuardado {
  id: string;
  mawb: string;
  fechaProcesamiento: string;
  fechaCreacion: string;
  totalFilas: number;
  filasValidas: number;
  filasConErrores: number;
  valorTotal: number;
  pesoTotal: number;
  estado: 'procesado' | 'revisado' | 'exportado' | 'archivado';
}

export interface ResultadoGuardado {
  exito: boolean;
  manifiestoId: string;
  mensaje: string;
  errores?: string[];
}

export interface ConsignatarioGuardado {
  id: string;
  manifiestoId: string;
  nombre: string;
  identificacion: string;
  telefono: string;
  direccion: string;
  provincia: string;
  cantidadPaquetes: number;
  valorTotal: number;
  pesoTotal: number;
  trackings: string[];
}

export interface FilaConManifiesto extends FilaProcesada {
  id: string;
  manifiestoId: string;
  fechaGuardado: string;
}

// ============================================
// ESTADO DE INICIALIZACIÓN
// ============================================

let dbInicializada = false;
let usandoIndexedDB = true;

// Intentar inicializar IndexedDB al cargar
async function inicializarDB(): Promise<void> {
  if (dbInicializada) return;
  
  try {
    await initDB();
    
    // Migrar datos de localStorage si existen
    const migracion = await migrateFromLocalStorage();
    if (migracion.migrated) {
      console.log('✅ Datos migrados de localStorage a IndexedDB');
    }
    
    dbInicializada = true;
    usandoIndexedDB = true;
  } catch (error) {
    console.warn('IndexedDB no disponible, usando localStorage como fallback:', error);
    usandoIndexedDB = false;
    dbInicializada = true;
  }
}

// Inicializar inmediatamente
inicializarDB();

// ============================================
// ALMACENAMIENTO LOCAL (Fallback)
// ============================================

const STORAGE_KEY = 'manifiestos_db';
const FILAS_KEY = 'filas_db';
const CONSIGNATARIOS_KEY = 'consignatarios_db';

function generarId(): string {
  return `MAN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

// ============================================
// FUNCIÓN PRINCIPAL: GUARDAR MANIFIESTO
// ============================================

export async function guardarManifiesto(
  resultado: ResultadoProcesamiento
): Promise<ResultadoGuardado> {
  await inicializarDB();
  
  const manifiestoId = generarId();
  const errores: string[] = [];

  try {
    // ========== PREPARAR DATOS ==========
    
    const manifiesto: ManifiestoGuardado = {
      id: manifiestoId,
      mawb: resultado.manifiesto.mawb,
      fechaProcesamiento: resultado.manifiesto.fechaProcesamiento,
      fechaCreacion: new Date().toISOString(),
      totalFilas: resultado.manifiesto.totalFilas,
      filasValidas: resultado.manifiesto.filasValidas,
      filasConErrores: resultado.manifiesto.filasConErrores,
      valorTotal: resultado.resumen.valorTotal,
      pesoTotal: resultado.resumen.pesoTotal,
      estado: 'procesado'
    };

    const filasConManifiesto: FilaConManifiesto[] = resultado.filas.map((fila, idx) => ({
      ...fila,
      id: `FILA-${manifiestoId}-${idx}`,
      manifiestoId,
      fechaGuardado: new Date().toISOString()
    }));

    const consignatariosAgrupados = agruparConsignatarios(resultado.filas, manifiestoId);

    // ========== GUARDAR EN INDEXEDDB O LOCALSTORAGE ==========
    
    if (usandoIndexedDB) {
      // Guardar en IndexedDB
      await dbPut('manifiestos', manifiesto);
      await dbPutMany('filas', filasConManifiesto);
      await dbPutMany('consignatarios', consignatariosAgrupados);
      
      console.log('✅ Manifiesto guardado en IndexedDB:', manifiestoId);
    } else {
      // Fallback a localStorage
      const manifiestos = obtenerManifiestosLocalStorage();
      manifiestos.push(manifiesto);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));

      const filasExistentes = obtenerFilasLocalStorage();
      filasExistentes.push(...filasConManifiesto);
      localStorage.setItem(FILAS_KEY, JSON.stringify(filasExistentes));

      const consignatariosExistentes = obtenerConsignatariosLocalStorage();
      consignatariosExistentes.push(...consignatariosAgrupados);
      localStorage.setItem(CONSIGNATARIOS_KEY, JSON.stringify(consignatariosExistentes));
      
      console.log('✅ Manifiesto guardado en localStorage:', manifiestoId);
    }

    return {
      exito: true,
      manifiestoId,
      mensaje: `Manifiesto ${manifiestoId} guardado exitosamente con ${resultado.filas.length} paquetes`
    };

  } catch (error) {
    // Rollback en caso de error
    await rollbackManifiesto(manifiestoId);
    
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    errores.push(mensaje);
    console.error('Error guardando manifiesto:', error);

    return {
      exito: false,
      manifiestoId,
      mensaje: `Error al guardar manifiesto: ${mensaje}`,
      errores
    };
  }
}

// ============================================
// FUNCIONES DE LECTURA
// ============================================

export async function obtenerManifiestos(): Promise<ManifiestoGuardado[]> {
  await inicializarDB();
  
  try {
    if (usandoIndexedDB) {
      return await dbGetAll<ManifiestoGuardado>('manifiestos');
    }
    return obtenerManifiestosLocalStorage();
  } catch (error) {
    console.error('Error obteniendo manifiestos:', error);
    return obtenerManifiestosLocalStorage();
  }
}

export async function obtenerManifiesto(id: string): Promise<ManifiestoGuardado | null> {
  await inicializarDB();
  
  try {
    if (usandoIndexedDB) {
      const manifiesto = await dbGet<ManifiestoGuardado>('manifiestos', id);
      return manifiesto || null;
    }
    return obtenerManifiestoLocalStorage(id);
  } catch (error) {
    console.error('Error obteniendo manifiesto:', error);
    return obtenerManifiestoLocalStorage(id);
  }
}

export async function obtenerFilasPorManifiesto(manifiestoId: string): Promise<FilaProcesada[]> {
  await inicializarDB();
  
  try {
    if (usandoIndexedDB) {
      const filas = await dbGetByIndex<FilaConManifiesto>('filas', 'manifiestoId', manifiestoId);
      return filas;
    }
    return obtenerFilasPorManifiestoLocalStorage(manifiestoId);
  } catch (error) {
    console.error('Error obteniendo filas:', error);
    return obtenerFilasPorManifiestoLocalStorage(manifiestoId);
  }
}

export async function obtenerConsignatarios(): Promise<ConsignatarioGuardado[]> {
  await inicializarDB();
  
  try {
    if (usandoIndexedDB) {
      return await dbGetAll<ConsignatarioGuardado>('consignatarios');
    }
    return obtenerConsignatariosLocalStorage();
  } catch (error) {
    console.error('Error obteniendo consignatarios:', error);
    return obtenerConsignatariosLocalStorage();
  }
}

// ============================================
// FUNCIONES DE ACTUALIZACIÓN
// ============================================

export async function actualizarEstadoManifiesto(
  id: string, 
  estado: ManifiestoGuardado['estado']
): Promise<boolean> {
  await inicializarDB();
  
  try {
    if (usandoIndexedDB) {
      const manifiesto = await dbGet<ManifiestoGuardado>('manifiestos', id);
      if (!manifiesto) return false;
      
      manifiesto.estado = estado;
      await dbPut('manifiestos', manifiesto);
      return true;
    }
    
    return actualizarEstadoManifiestoLocalStorage(id, estado);
  } catch (error) {
    console.error('Error actualizando estado:', error);
    return false;
  }
}

export async function eliminarManifiesto(id: string): Promise<boolean> {
  await inicializarDB();
  
  try {
    if (usandoIndexedDB) {
      // Eliminar manifiesto
      await dbDelete('manifiestos', id);
      
      // Eliminar filas asociadas
      await dbDeleteByIndex('filas', 'manifiestoId', id);
      
      // Eliminar consignatarios asociados
      await dbDeleteByIndex('consignatarios', 'manifiestoId', id);
      
      console.log('✅ Manifiesto eliminado de IndexedDB:', id);
      return true;
    }
    
    return eliminarManifiestoLocalStorage(id);
  } catch (error) {
    console.error('Error eliminando manifiesto:', error);
    return false;
  }
}

// ============================================
// FUNCIONES LOCALSTORAGE (FALLBACK)
// ============================================

function obtenerManifiestosLocalStorage(): ManifiestoGuardado[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function obtenerManifiestoLocalStorage(id: string): ManifiestoGuardado | null {
  const manifiestos = obtenerManifiestosLocalStorage();
  return manifiestos.find(m => m.id === id) || null;
}

function obtenerFilasLocalStorage(): FilaConManifiesto[] {
  try {
    const data = localStorage.getItem(FILAS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function obtenerFilasPorManifiestoLocalStorage(manifiestoId: string): FilaProcesada[] {
  const filas = obtenerFilasLocalStorage();
  return filas.filter(f => f.manifiestoId === manifiestoId);
}

function obtenerConsignatariosLocalStorage(): ConsignatarioGuardado[] {
  try {
    const data = localStorage.getItem(CONSIGNATARIOS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function actualizarEstadoManifiestoLocalStorage(
  id: string, 
  estado: ManifiestoGuardado['estado']
): boolean {
  try {
    const manifiestos = obtenerManifiestosLocalStorage();
    const index = manifiestos.findIndex(m => m.id === id);
    
    if (index === -1) return false;
    
    manifiestos[index].estado = estado;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));
    return true;
  } catch {
    return false;
  }
}

function eliminarManifiestoLocalStorage(id: string): boolean {
  try {
    const manifiestos = obtenerManifiestosLocalStorage().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));

    const filas = obtenerFilasLocalStorage().filter(f => f.manifiestoId !== id);
    localStorage.setItem(FILAS_KEY, JSON.stringify(filas));

    const consignatarios = obtenerConsignatariosLocalStorage().filter(c => c.manifiestoId !== id);
    localStorage.setItem(CONSIGNATARIOS_KEY, JSON.stringify(consignatarios));

    return true;
  } catch {
    return false;
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function agruparConsignatarios(
  filas: FilaProcesada[], 
  manifiestoId: string
): ConsignatarioGuardado[] {
  const grupos: Record<string, ConsignatarioGuardado> = {};

  for (const fila of filas) {
    const clave = fila.identificacion || fila.destinatario || `SIN_ID_${fila.indice}`;
    
    if (!grupos[clave]) {
      grupos[clave] = {
        id: `CON-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        manifiestoId,
        nombre: fila.destinatario,
        identificacion: fila.identificacion,
        telefono: fila.telefono,
        direccion: fila.direccion,
        provincia: fila.provincia,
        cantidadPaquetes: 0,
        valorTotal: 0,
        pesoTotal: 0,
        trackings: []
      };
    }

    grupos[clave].cantidadPaquetes++;
    grupos[clave].valorTotal += fila.valorUSD;
    grupos[clave].pesoTotal += fila.peso;
    grupos[clave].trackings.push(fila.tracking);
  }

  return Object.values(grupos);
}

async function rollbackManifiesto(manifiestoId: string): Promise<void> {
  try {
    if (usandoIndexedDB) {
      await dbDelete('manifiestos', manifiestoId);
      await dbDeleteByIndex('filas', 'manifiestoId', manifiestoId);
      await dbDeleteByIndex('consignatarios', 'manifiestoId', manifiestoId);
    } else {
      const manifiestos = obtenerManifiestosLocalStorage().filter(m => m.id !== manifiestoId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));

      const filas = obtenerFilasLocalStorage().filter(f => f.manifiestoId !== manifiestoId);
      localStorage.setItem(FILAS_KEY, JSON.stringify(filas));

      const consignatarios = obtenerConsignatariosLocalStorage().filter(c => c.manifiestoId !== manifiestoId);
      localStorage.setItem(CONSIGNATARIOS_KEY, JSON.stringify(consignatarios));
    }
  } catch {
    console.error('Error durante rollback');
  }
}

// ============================================
// ESTADÍSTICAS
// ============================================

export async function obtenerEstadisticas(): Promise<{
  totalManifiestos: number;
  totalPaquetes: number;
  valorTotal: number;
  pesoTotal: number;
  porEstado: Record<string, number>;
  usandoIndexedDB: boolean;
}> {
  await inicializarDB();
  
  const manifiestos = await obtenerManifiestos();
  
  const porEstado: Record<string, number> = {};
  let valorTotal = 0;
  let pesoTotal = 0;
  let totalPaquetes = 0;

  for (const m of manifiestos) {
    porEstado[m.estado] = (porEstado[m.estado] || 0) + 1;
    valorTotal += m.valorTotal;
    pesoTotal += m.pesoTotal;
    totalPaquetes += m.totalFilas;
  }

  return {
    totalManifiestos: manifiestos.length,
    totalPaquetes,
    valorTotal,
    pesoTotal,
    porEstado,
    usandoIndexedDB
  };
}

// ============================================
// EXPORTAR FUNCIONES SÍNCRONAS (compatibilidad)
// ============================================

// Para compatibilidad con código existente que usa funciones síncronas
export function obtenerManifiestosSync(): ManifiestoGuardado[] {
  return obtenerManifiestosLocalStorage();
}

export function obtenerManifiestoSync(id: string): ManifiestoGuardado | null {
  return obtenerManifiestoLocalStorage(id);
}

export function obtenerFilasPorManifiestoSync(manifiestoId: string): FilaProcesada[] {
  return obtenerFilasPorManifiestoLocalStorage(manifiestoId);
}
