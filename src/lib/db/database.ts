/**
 * MÓDULO DE BASE DE DATOS
 * 
 * Maneja operaciones atómicas para guardar manifiestos y datos relacionados.
 * Usa transacciones para garantizar integridad de datos.
 * 
 * @version 1.0.0
 */

import { ResultadoProcesamiento, FilaProcesada } from '../workers/procesador.worker';

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

// ============================================
// ALMACENAMIENTO LOCAL (IndexedDB simulation)
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
  const manifiestoId = generarId();
  const errores: string[] = [];

  try {
    // ========== INICIO TRANSACCIÓN ATÓMICA ==========
    
    // 1. Preparar datos del manifiesto
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

    // 2. Preparar filas con referencia al manifiesto
    const filasConManifiesto = resultado.filas.map(fila => ({
      ...fila,
      manifiestoId,
      fechaGuardado: new Date().toISOString()
    }));

    // 3. Guardar manifiesto
    const manifiestos = obtenerManifiestos();
    manifiestos.push(manifiesto);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));

    // 4. Guardar filas
    const filasExistentes = obtenerFilas();
    filasExistentes.push(...filasConManifiesto);
    localStorage.setItem(FILAS_KEY, JSON.stringify(filasExistentes));

    // 5. Guardar consignatarios agrupados
    const consignatariosAgrupados = agruparConsignatarios(resultado.filas, manifiestoId);
    const consignatariosExistentes = obtenerConsignatarios();
    consignatariosExistentes.push(...consignatariosAgrupados);
    localStorage.setItem(CONSIGNATARIOS_KEY, JSON.stringify(consignatariosExistentes));

    // ========== FIN TRANSACCIÓN ==========

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

export function obtenerManifiestos(): ManifiestoGuardado[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function obtenerManifiesto(id: string): ManifiestoGuardado | null {
  const manifiestos = obtenerManifiestos();
  return manifiestos.find(m => m.id === id) || null;
}

export function obtenerFilas(): (FilaProcesada & { manifiestoId: string })[] {
  try {
    const data = localStorage.getItem(FILAS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function obtenerFilasPorManifiesto(manifiestoId: string): FilaProcesada[] {
  const filas = obtenerFilas();
  return filas.filter(f => f.manifiestoId === manifiestoId);
}

export function obtenerConsignatarios(): ConsignatarioGuardado[] {
  try {
    const data = localStorage.getItem(CONSIGNATARIOS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// ============================================
// FUNCIONES DE ACTUALIZACIÓN
// ============================================

export function actualizarEstadoManifiesto(
  id: string, 
  estado: ManifiestoGuardado['estado']
): boolean {
  try {
    const manifiestos = obtenerManifiestos();
    const index = manifiestos.findIndex(m => m.id === id);
    
    if (index === -1) return false;
    
    manifiestos[index].estado = estado;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));
    return true;
  } catch {
    return false;
  }
}

export function eliminarManifiesto(id: string): boolean {
  try {
    // Eliminar manifiesto
    const manifiestos = obtenerManifiestos().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));

    // Eliminar filas asociadas
    const filas = obtenerFilas().filter(f => f.manifiestoId !== id);
    localStorage.setItem(FILAS_KEY, JSON.stringify(filas));

    // Eliminar consignatarios asociados
    const consignatarios = obtenerConsignatarios().filter(c => c.manifiestoId !== id);
    localStorage.setItem(CONSIGNATARIOS_KEY, JSON.stringify(consignatarios));

    return true;
  } catch {
    return false;
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

interface ConsignatarioGuardado {
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
    // Intentar eliminar datos parciales
    const manifiestos = obtenerManifiestos().filter(m => m.id !== manifiestoId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifiestos));

    const filas = obtenerFilas().filter(f => f.manifiestoId !== manifiestoId);
    localStorage.setItem(FILAS_KEY, JSON.stringify(filas));

    const consignatarios = obtenerConsignatarios().filter(c => c.manifiestoId !== manifiestoId);
    localStorage.setItem(CONSIGNATARIOS_KEY, JSON.stringify(consignatarios));
  } catch {
    console.error('Error durante rollback');
  }
}

// ============================================
// ESTADÍSTICAS
// ============================================

export function obtenerEstadisticas(): {
  totalManifiestos: number;
  totalPaquetes: number;
  valorTotal: number;
  pesoTotal: number;
  porEstado: Record<string, number>;
} {
  const manifiestos = obtenerManifiestos();
  const filas = obtenerFilas();

  const porEstado: Record<string, number> = {};
  let valorTotal = 0;
  let pesoTotal = 0;

  for (const m of manifiestos) {
    porEstado[m.estado] = (porEstado[m.estado] || 0) + 1;
    valorTotal += m.valorTotal;
    pesoTotal += m.pesoTotal;
  }

  return {
    totalManifiestos: manifiestos.length,
    totalPaquetes: filas.length,
    valorTotal,
    pesoTotal,
    porEstado
  };
}
