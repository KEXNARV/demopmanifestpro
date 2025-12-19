// ============================================
// WORKER DE PROCESAMIENTO DE MANIFIESTOS v2.0
// Arquitectura Profesional con Detección Automática
// ============================================

import { detectarColumnasAutomaticamente, validarMapeoColumnas } from '../deteccion/detectorColumnasMejorado';
import { ClasificadorInteligente } from '../clasificacion/clasificadorInteligente';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface MensajeWorker {
  tipo: 'PROCESAR_MANIFIESTO' | 'CANCELAR' | 'OBTENER_ESTADO';
  payload?: {
    archivo: ArrayBuffer;
    mawb: string;
    opciones?: OpcionesProcesamiento;
  };
}

export interface OpcionesProcesamiento {
  validarDuplicados?: boolean;
  clasificarProductos?: boolean;
  calcularLiquidaciones?: boolean;
  limpiarDatos?: boolean;
  batchSize?: number;
}

export interface RespuestaWorker {
  tipo: 'PROGRESO' | 'RESULTADO' | 'ERROR' | 'ADVERTENCIA';
  payload: {
    fase?: string;
    progreso?: number;
    mensaje?: string;
    datos?: ResultadoProcesamiento;
    error?: string;
    advertencias?: string[];
  };
}

export interface ResultadoProcesamiento {
  manifiesto: {
    mawb: string;
    fechaProcesamiento: string;
    totalFilas: number;
    filasValidas: number;
    filasConErrores: number;
  };
  deteccionColumnas: {
    mapeo: Record<string, string>;
    confianza: Record<string, number>;
    noDetectados: string[];
    sugerencias: Record<string, Array<{ columna: string; confianza: number }>>;
  };
  clasificacion: {
    categorias: Record<string, number>;
    requierenPermisos: number;
    prohibidos: number;
  };
  filas: FilaProcesada[];
  resumen: ResumenProcesamiento;
  errores: ErrorProcesamiento[];
  advertencias: string[];
}

export interface FilaProcesada {
  indice: number;
  tracking: string;
  destinatario: string;
  identificacion: string;
  telefono: string;
  direccion: string;
  descripcion: string;
  valorUSD: number;
  peso: number;
  provincia: string;
  ciudad: string;
  corregimiento: string;
  categoria: string;
  subcategoria: string;
  requierePermiso: boolean;
  autoridades: string[];
  categoriaAduanera: string;
  confianzaClasificacion: number;
  errores: string[];
  advertencias: string[];
}

export interface ResumenProcesamiento {
  totalPaquetes: number;
  valorTotal: number;
  pesoTotal: number;
  promedioValor: number;
  promedioPeso: number;
  porCategoria: Record<string, { cantidad: number; valor: number }>;
  porProvincia: Record<string, number>;
  porCategoriaAduanera: Record<string, number>;
  tiempoProcesamiento: number;
}

export interface ErrorProcesamiento {
  fila: number;
  campo: string;
  valor: string;
  mensaje: string;
  nivel: 'error' | 'advertencia';
}

// ============================================
// ESTADO DEL WORKER
// ============================================

let procesandoActivo = false;
let cancelarProcesamiento = false;

// ============================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO
// ============================================

async function procesarManifiesto(
  archivo: ArrayBuffer,
  mawb: string,
  opciones: OpcionesProcesamiento = {}
): Promise<ResultadoProcesamiento> {
  const inicioTiempo = performance.now();
  
  const config: OpcionesProcesamiento = {
    validarDuplicados: true,
    clasificarProductos: true,
    calcularLiquidaciones: true,
    limpiarDatos: true,
    batchSize: 100,
    ...opciones
  };

  procesandoActivo = true;
  cancelarProcesamiento = false;

  const errores: ErrorProcesamiento[] = [];
  const advertencias: string[] = [];

  try {
    // ========================================
    // FASE 1: Lectura del archivo Excel
    // ========================================
    enviarProgreso('LECTURA', 0, 'Leyendo archivo Excel...');
    
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(archivo, { type: 'array' });
    const primeraHoja = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeraHoja];
    
    // Convertir a JSON con headers
    const datosRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: false
    });

    if (datosRaw.length === 0) {
      throw new Error('El archivo Excel está vacío');
    }

    const headers = Object.keys(datosRaw[0]);
    enviarProgreso('LECTURA', 100, `Leídas ${datosRaw.length} filas con ${headers.length} columnas`);

    // Verificar cancelación
    if (cancelarProcesamiento) {
      throw new Error('Procesamiento cancelado por el usuario');
    }

    // ========================================
    // FASE 2: Detección automática de columnas
    // ========================================
    enviarProgreso('DETECCION', 0, 'Detectando columnas automáticamente...');
    
    const resultadoDeteccion = detectarColumnasAutomaticamente(headers);
    const validacionMapeo = validarMapeoColumnas(resultadoDeteccion.mapping);

    if (!validacionMapeo.valido) {
      advertencias.push(`Columnas faltantes: ${validacionMapeo.faltantes.join(', ')}`);
    }

    if (validacionMapeo.advertencias.length > 0) {
      advertencias.push(...validacionMapeo.advertencias);
    }

    // Calcular confianza promedio
    const confianzas = Object.values(resultadoDeteccion.confianza);
    const confianzaPromedio = confianzas.length > 0 
      ? confianzas.reduce((a, b) => a + b, 0) / confianzas.length 
      : 0;

    if (confianzaPromedio < 50) {
      advertencias.push(`Confianza de detección baja (${confianzaPromedio.toFixed(1)}%). Verifique los resultados.`);
    }

    enviarProgreso('DETECCION', 100, `Detectadas ${Object.keys(resultadoDeteccion.mapping).length} columnas con ${confianzaPromedio.toFixed(1)}% confianza`);

    // Verificar cancelación
    if (cancelarProcesamiento) {
      throw new Error('Procesamiento cancelado por el usuario');
    }

    // ========================================
    // FASE 3: Mapeo y limpieza de datos
    // ========================================
    enviarProgreso('MAPEO', 0, 'Mapeando y limpiando datos...');

    const filasRaw: FilaProcesada[] = [];
    const mapeo = resultadoDeteccion.mapping;
    const totalFilas = datosRaw.length;

    for (let i = 0; i < totalFilas; i++) {
      if (cancelarProcesamiento) {
        throw new Error('Procesamiento cancelado por el usuario');
      }

      const fila = datosRaw[i];
      const filaProcesada = mapearFila(fila, mapeo, i + 1, config, errores);
      filasRaw.push(filaProcesada);

      // Actualizar progreso cada 50 filas
      if (i % 50 === 0 || i === totalFilas - 1) {
        const progreso = Math.round((i / totalFilas) * 100);
        enviarProgreso('MAPEO', progreso, `Procesando fila ${i + 1} de ${totalFilas}`);
      }
    }

    enviarProgreso('MAPEO', 100, `Mapeadas ${filasRaw.length} filas`);

    // ========================================
    // FASE 4: Clasificación inteligente (continuará en PARTE 2)
    // ========================================
    // ... código de clasificación vendrá aquí

    // Placeholder temporal para completar la estructura
    const tiempoProcesamiento = performance.now() - inicioTiempo;
    
    const resultado: ResultadoProcesamiento = {
      manifiesto: {
        mawb,
        fechaProcesamiento: new Date().toISOString(),
        totalFilas: datosRaw.length,
        filasValidas: filasRaw.filter(f => f.errores.length === 0).length,
        filasConErrores: filasRaw.filter(f => f.errores.length > 0).length
      },
      deteccionColumnas: {
        mapeo: resultadoDeteccion.mapping as Record<string, string>,
        confianza: resultadoDeteccion.confianza,
        noDetectados: resultadoDeteccion.noDetectados,
        sugerencias: Object.fromEntries(
          Object.entries(resultadoDeteccion.sugerencias).map(([key, value]) => [
            key,
            value.map(col => ({ columna: col, confianza: 50 }))
          ])
        )
      },
      clasificacion: {
        categorias: {},
        requierenPermisos: 0,
        prohibidos: 0
      },
      filas: filasRaw,
      resumen: calcularResumen(filasRaw, tiempoProcesamiento),
      errores,
      advertencias
    };

    return resultado;

  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    enviarError(mensaje);
    throw error;
  } finally {
    procesandoActivo = false;
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function mapearFila(
  fila: Record<string, unknown>,
  mapeo: Record<string, string>,
  indice: number,
  config: OpcionesProcesamiento,
  errores: ErrorProcesamiento[]
): FilaProcesada {
  const obtenerValor = (campo: string): string => {
    const columna = mapeo[campo];
    if (!columna) return '';
    const valor = fila[columna];
    return valor !== undefined && valor !== null ? String(valor).trim() : '';
  };

  const obtenerNumero = (campo: string): number => {
    const valor = obtenerValor(campo);
    const numero = parseFloat(valor.replace(/[^0-9.-]/g, ''));
    return isNaN(numero) ? 0 : numero;
  };

  const filaProcesada: FilaProcesada = {
    indice,
    tracking: config.limpiarDatos ? limpiarTracking(obtenerValor('trackingNumber')) : obtenerValor('trackingNumber'),
    destinatario: config.limpiarDatos ? limpiarTexto(obtenerValor('recipient')) : obtenerValor('recipient'),
    identificacion: config.limpiarDatos ? limpiarIdentificacion(obtenerValor('identification')) : obtenerValor('identification'),
    telefono: config.limpiarDatos ? limpiarTelefono(obtenerValor('phone')) : obtenerValor('phone'),
    direccion: config.limpiarDatos ? limpiarTexto(obtenerValor('address')) : obtenerValor('address'),
    descripcion: config.limpiarDatos ? limpiarTexto(obtenerValor('description')) : obtenerValor('description'),
    valorUSD: obtenerNumero('valueUSD'),
    peso: obtenerNumero('weight'),
    provincia: normalizarProvincia(obtenerValor('province')),
    ciudad: config.limpiarDatos ? limpiarTexto(obtenerValor('city')) : obtenerValor('city'),
    corregimiento: config.limpiarDatos ? limpiarTexto(obtenerValor('district')) : obtenerValor('district'),
    categoria: '',
    subcategoria: '',
    requierePermiso: false,
    autoridades: [],
    categoriaAduanera: '',
    confianzaClasificacion: 0,
    errores: [],
    advertencias: []
  };

  // Validaciones
  if (!filaProcesada.tracking) {
    filaProcesada.errores.push('Tracking vacío');
    errores.push({
      fila: indice,
      campo: 'tracking',
      valor: '',
      mensaje: 'Número de tracking vacío o inválido',
      nivel: 'error'
    });
  }

  if (!filaProcesada.destinatario) {
    filaProcesada.advertencias.push('Destinatario vacío');
  }

  if (filaProcesada.valorUSD <= 0) {
    filaProcesada.advertencias.push('Valor declarado es 0 o negativo');
  }

  return filaProcesada;
}

function limpiarTracking(valor: string): string {
  return valor.replace(/\s+/g, '').toUpperCase();
}

function limpiarTexto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim();
}

function limpiarIdentificacion(valor: string): string {
  return valor.replace(/[^0-9A-Za-z-]/g, '').toUpperCase();
}

function limpiarTelefono(valor: string): string {
  return valor.replace(/[^0-9+\-() ]/g, '').trim();
}

function normalizarProvincia(valor: string): string {
  const provincias: Record<string, string> = {
    'panama': 'Panamá',
    'panamá': 'Panamá',
    'panama oeste': 'Panamá Oeste',
    'panamá oeste': 'Panamá Oeste',
    'colon': 'Colón',
    'colón': 'Colón',
    'chiriqui': 'Chiriquí',
    'chiriquí': 'Chiriquí',
    'veraguas': 'Veraguas',
    'herrera': 'Herrera',
    'los santos': 'Los Santos',
    'cocle': 'Coclé',
    'coclé': 'Coclé',
    'darien': 'Darién',
    'darién': 'Darién',
    'bocas del toro': 'Bocas del Toro',
    'comarca ngabe bugle': 'Comarca Ngäbe-Buglé',
    'comarca kuna yala': 'Comarca Guna Yala',
    'comarca embera': 'Comarca Emberá'
  };

  const valorNormalizado = valor.toLowerCase().trim();
  return provincias[valorNormalizado] || valor;
}

function calcularResumen(filas: FilaProcesada[], tiempoProcesamiento: number): ResumenProcesamiento {
  const porCategoria: Record<string, { cantidad: number; valor: number }> = {};
  const porProvincia: Record<string, number> = {};
  const porCategoriaAduanera: Record<string, number> = {};

  let valorTotal = 0;
  let pesoTotal = 0;

  for (const fila of filas) {
    valorTotal += fila.valorUSD;
    pesoTotal += fila.peso;

    // Por categoría
    if (fila.categoria) {
      if (!porCategoria[fila.categoria]) {
        porCategoria[fila.categoria] = { cantidad: 0, valor: 0 };
      }
      porCategoria[fila.categoria].cantidad++;
      porCategoria[fila.categoria].valor += fila.valorUSD;
    }

    // Por provincia
    if (fila.provincia) {
      porProvincia[fila.provincia] = (porProvincia[fila.provincia] || 0) + 1;
    }

    // Por categoría aduanera
    if (fila.categoriaAduanera) {
      porCategoriaAduanera[fila.categoriaAduanera] = (porCategoriaAduanera[fila.categoriaAduanera] || 0) + 1;
    }
  }

  return {
    totalPaquetes: filas.length,
    valorTotal,
    pesoTotal,
    promedioValor: filas.length > 0 ? valorTotal / filas.length : 0,
    promedioPeso: filas.length > 0 ? pesoTotal / filas.length : 0,
    porCategoria,
    porProvincia,
    porCategoriaAduanera,
    tiempoProcesamiento
  };
}

// ============================================
// COMUNICACIÓN CON EL HILO PRINCIPAL
// ============================================

function enviarProgreso(fase: string, progreso: number, mensaje: string): void {
  self.postMessage({
    tipo: 'PROGRESO',
    payload: { fase, progreso, mensaje }
  } as RespuestaWorker);
}

function enviarError(error: string): void {
  self.postMessage({
    tipo: 'ERROR',
    payload: { error }
  } as RespuestaWorker);
}

function enviarAdvertencia(advertencias: string[]): void {
  self.postMessage({
    tipo: 'ADVERTENCIA',
    payload: { advertencias }
  } as RespuestaWorker);
}

// ============================================
// MANEJADOR DE MENSAJES DEL WORKER
// ============================================

self.onmessage = async (event: MessageEvent<MensajeWorker>) => {
  const { tipo, payload } = event.data;

  switch (tipo) {
    case 'PROCESAR_MANIFIESTO':
      if (!payload?.archivo || !payload?.mawb) {
        enviarError('Faltan parámetros requeridos: archivo y mawb');
        return;
      }

      try {
        const resultado = await procesarManifiesto(
          payload.archivo,
          payload.mawb,
          payload.opciones
        );

        self.postMessage({
          tipo: 'RESULTADO',
          payload: { datos: resultado }
        } as RespuestaWorker);
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido';
        enviarError(mensaje);
      }
      break;

    case 'CANCELAR':
      cancelarProcesamiento = true;
      break;

    case 'OBTENER_ESTADO':
      self.postMessage({
        tipo: 'PROGRESO',
        payload: {
          fase: procesandoActivo ? 'EN_PROCESO' : 'INACTIVO',
          progreso: 0,
          mensaje: procesandoActivo ? 'Procesamiento en curso' : 'Sin actividad'
        }
      } as RespuestaWorker);
      break;
  }
};

