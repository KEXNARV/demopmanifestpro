// ============================================
// WRAPPER PARA INDEXEDDB
// Proporciona acceso simplificado a IndexedDB
// con soporte para múltiples stores
// ============================================

import { devLog, devError, devSuccess } from '@/lib/logger';

const DB_NAME = 'pasarex_db';
const DB_VERSION = 2;

export interface DBStores {
  manifiestos: 'manifiestos';
  filas: 'filas';
  consignatarios: 'consignatarios';
  auditoria: 'auditoria';
  liquidaciones: 'liquidaciones';
}

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Inicializa la base de datos IndexedDB
 */
export function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  
  if (dbInitPromise) {
    return dbInitPromise;
  }
  
  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      devError('Error abriendo IndexedDB');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      devSuccess('IndexedDB inicializada correctamente');
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store: Manifiestos
      if (!db.objectStoreNames.contains('manifiestos')) {
        const manifiestoStore = db.createObjectStore('manifiestos', { keyPath: 'id' });
        manifiestoStore.createIndex('mawb', 'mawb', { unique: false });
        manifiestoStore.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
        manifiestoStore.createIndex('estado', 'estado', { unique: false });
      }
      
      // Store: Filas (paquetes)
      if (!db.objectStoreNames.contains('filas')) {
        const filasStore = db.createObjectStore('filas', { keyPath: 'id', autoIncrement: true });
        filasStore.createIndex('manifiestoId', 'manifiestoId', { unique: false });
        filasStore.createIndex('tracking', 'tracking', { unique: false });
      }
      
      // Store: Consignatarios
      if (!db.objectStoreNames.contains('consignatarios')) {
        const consigStore = db.createObjectStore('consignatarios', { keyPath: 'id' });
        consigStore.createIndex('manifiestoId', 'manifiestoId', { unique: false });
        consigStore.createIndex('identificacion', 'identificacion', { unique: false });
      }
      
      // Store: Auditoría
      if (!db.objectStoreNames.contains('auditoria')) {
        const auditoriaStore = db.createObjectStore('auditoria', { keyPath: 'id' });
        auditoriaStore.createIndex('liquidacionId', 'liquidacionId', { unique: false });
        auditoriaStore.createIndex('operador', 'operador', { unique: false });
        auditoriaStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Store: Liquidaciones
      if (!db.objectStoreNames.contains('liquidaciones')) {
        const liqStore = db.createObjectStore('liquidaciones', { keyPath: 'id' });
        liqStore.createIndex('manifiestoId', 'manifiestoId', { unique: false });
        liqStore.createIndex('numeroGuia', 'numeroGuia', { unique: false });
      }
      
      devSuccess('Stores de IndexedDB creados/actualizados');
    };
  });
  
  return dbInitPromise;
}

/**
 * Obtiene una transacción para un store específico
 */
async function getStore(
  storeName: keyof DBStores, 
  mode: IDBTransactionMode = 'readonly'
): Promise<IDBObjectStore> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/**
 * Guarda un registro en un store
 */
export async function dbPut<T extends { id: string }>(
  storeName: keyof DBStores, 
  data: T
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readwrite');
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data.id);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Guarda múltiples registros en un store
 */
export async function dbPutMany<T extends { id: string }>(
  storeName: keyof DBStores, 
  items: T[]
): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    
    for (const item of items) {
      store.put(item);
    }
  });
}

/**
 * Obtiene un registro por ID
 */
export async function dbGet<T>(
  storeName: keyof DBStores, 
  id: string
): Promise<T | undefined> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readonly');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Obtiene todos los registros de un store
 */
export async function dbGetAll<T>(storeName: keyof DBStores): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readonly');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Obtiene registros por índice
 */
export async function dbGetByIndex<T>(
  storeName: keyof DBStores,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Elimina un registro por ID
 */
export async function dbDelete(
  storeName: keyof DBStores, 
  id: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Elimina múltiples registros por índice
 */
export async function dbDeleteByIndex(
  storeName: keyof DBStores,
  indexName: string,
  value: IDBValidKey
): Promise<number> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.openCursor(value);
    let deletedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => resolve(deletedCount);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Cuenta registros en un store
 */
export async function dbCount(storeName: keyof DBStores): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readonly');
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Limpia todos los registros de un store
 */
export async function dbClear(storeName: keyof DBStores): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readwrite');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Obtiene registros filtrados por rango de fechas
 */
export async function dbGetByDateRange<T>(
  storeName: keyof DBStores,
  indexName: string,
  startDate: string,
  endDate: string
): Promise<T[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Migra datos de localStorage a IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<{
  migrated: boolean;
  manifiestos: number;
  filas: number;
  consignatarios: number;
}> {
  const result = { migrated: false, manifiestos: 0, filas: 0, consignatarios: 0 };
  
  try {
    // Verificar si ya se migró
    const existingCount = await dbCount('manifiestos');
    if (existingCount > 0) {
      devLog('IndexedDB ya contiene datos, omitiendo migración');
      return result;
    }
    
    // Migrar manifiestos
    const manifiestoData = localStorage.getItem('manifiestos_db');
    if (manifiestoData) {
      const manifiestos = JSON.parse(manifiestoData);
      if (Array.isArray(manifiestos) && manifiestos.length > 0) {
        await dbPutMany('manifiestos', manifiestos);
        result.manifiestos = manifiestos.length;
      }
    }
    
    // Migrar filas
    const filasData = localStorage.getItem('filas_db');
    if (filasData) {
      const filas = JSON.parse(filasData);
      if (Array.isArray(filas) && filas.length > 0) {
        // Agregar ID si no existe
        const filasConId = filas.map((f: any, i: number) => ({
          ...f,
          id: f.id || `fila_${Date.now()}_${i}`
        }));
        await dbPutMany('filas', filasConId);
        result.filas = filas.length;
      }
    }
    
    // Migrar consignatarios
    const consigData = localStorage.getItem('consignatarios_db');
    if (consigData) {
      const consignatarios = JSON.parse(consigData);
      if (Array.isArray(consignatarios) && consignatarios.length > 0) {
        await dbPutMany('consignatarios', consignatarios);
        result.consignatarios = consignatarios.length;
      }
    }
    
    if (result.manifiestos > 0 || result.filas > 0) {
      result.migrated = true;
      devSuccess(`Migración de localStorage a IndexedDB completada: ${result.manifiestos} manifiestos, ${result.filas} filas`);
      
      // Limpiar localStorage después de migrar exitosamente
      // localStorage.removeItem('manifiestos_db');
      // localStorage.removeItem('filas_db');
      // localStorage.removeItem('consignatarios_db');
    }
    
  } catch (error) {
    devError('Error durante migración');
  }
  
  return result;
}
