// ============================================
// WORKER DE PROCESAMIENTO DE MANIFIESTOS v2.0
// Arquitectura Profesional con Detección Automática
// ============================================

import { detectarColumnasAutomaticamente, validarMapeoColumnas } from '../deteccion/detectorColumnasMejorado';
import { ClasificadorInteligente } from '../clasificacion/clasificadorInteligente';

// ============================================
// PROTECTOR DE DATOS PARA WORKER
// (Versión simplificada - no tiene acceso a sessionStorage)
// ============================================

class ProtectorDatosWorker {
  static encriptar(texto: string): string {
    if (!texto) return '';
    // Encriptación Base64 para el contexto del worker
    return btoa(unescape(encodeURIComponent(texto)));
  }

  static desencriptar(textoEncriptado: string): string {
    if (!textoEncriptado) return '';
    try {
      return decodeURIComponent(escape(atob(textoEncriptado)));
    } catch {
      return textoEncriptado;
    }
  }

  static hashear(texto: string): string {
    if (!texto) return '';
    // Hash simple para búsquedas
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  static ofuscar(texto: string, tipo: 'cedula' | 'telefono' | 'email' | 'direccion'): string {
    if (!texto) return '';
    switch (tipo) {
      case 'cedula':
        return texto.length > 4 ? `***${texto.slice(-4)}` : '****';
      case 'telefono':
        return texto.length > 4 ? `***-${texto.slice(-4)}` : '****';
      case 'email':
        const [local, domain] = texto.split('@');
        return local ? `${local[0]}***@${domain || '***'}` : '***@***';
      case 'direccion':
        return texto.length > 10 ? `${texto.slice(0, 10)}...` : texto;
      default:
        return '***';
    }
  }
}

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

    // 🔍 LOGS DE DEBUGGING - DETECCIÓN DE COLUMNAS
    console.log('═══════════════════════════════════════');
    console.log('📋 DETECCIÓN DE COLUMNAS');
    console.log('═══════════════════════════════════════');
    console.log('Columnas disponibles:', headers);
    console.log('Mapeo detectado:', resultadoDeteccion.mapping);
    console.log('Confianza:', resultadoDeteccion.confianza);
    console.log('Advertencias:', advertencias);
    console.log('═══════════════════════════════════════');

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
    // FASE 4: Clasificación inteligente
    // ========================================
    enviarProgreso('CLASIFICACION', 0, 'Clasificando productos...');

    const clasificador = ClasificadorInteligente;
    const categoriasCount: Record<string, number> = {};
    let requierenPermisos = 0;
    let prohibidos = 0;

    for (let i = 0; i < filasRaw.length; i++) {
      if (cancelarProcesamiento) {
        throw new Error('Procesamiento cancelado por el usuario');
      }

      const fila = filasRaw[i];
      
      if (config.clasificarProductos && fila.descripcion) {
        const clasificacion = clasificador.clasificar(fila.descripcion, fila.valorUSD);
        
        fila.categoria = clasificacion.categoriaProducto;
        fila.subcategoria = clasificacion.subcategoria;
        fila.requierePermiso = clasificacion.requierePermiso;
        fila.autoridades = clasificacion.autoridades;
        fila.categoriaAduanera = clasificacion.categoriaAduanera;
        fila.confianzaClasificacion = clasificacion.confianza;

        // Contadores
        categoriasCount[clasificacion.categoriaProducto] = (categoriasCount[clasificacion.categoriaProducto] || 0) + 1;
        if (clasificacion.requierePermiso) requierenPermisos++;
        if (clasificacion.esProhibido) {
          prohibidos++;
          fila.errores.push(`Producto posiblemente prohibido`);
        }

        // Advertencias de clasificación
        if (clasificacion.advertencias && clasificacion.advertencias.length > 0) {
          fila.advertencias.push(...clasificacion.advertencias);
        }

        // 🔍 LOG DE DEBUGGING - PAQUETE CLASIFICADO
        console.log('📦 PAQUETE CLASIFICADO:', {
          guia: fila.tracking,
          descripcion: fila.descripcion.substring(0, 50),
          categoriaProducto: fila.categoria,
          categoriaAduanera: fila.categoriaAduanera,
          confianza: fila.confianzaClasificacion
        });
      }

      // Actualizar progreso cada 50 filas
      if (i % 50 === 0 || i === filasRaw.length - 1) {
        const progreso = Math.round((i / filasRaw.length) * 100);
        enviarProgreso('CLASIFICACION', progreso, `Clasificando ${i + 1} de ${filasRaw.length}`);
      }
    }

    enviarProgreso('CLASIFICACION', 100, `Clasificados ${filasRaw.length} productos`);

    // ========================================
    // FASE 5: Validación de duplicados
    // ========================================
    if (config.validarDuplicados) {
      enviarProgreso('DUPLICADOS', 0, 'Verificando duplicados...');
      
      const trackingVistos = new Map<string, number[]>();
      
      for (const fila of filasRaw) {
        if (fila.tracking) {
          const indices = trackingVistos.get(fila.tracking) || [];
          indices.push(fila.indice);
          trackingVistos.set(fila.tracking, indices);
        }
      }

      // Marcar duplicados
      let duplicadosEncontrados = 0;
      for (const [tracking, indices] of trackingVistos) {
        if (indices.length > 1) {
          duplicadosEncontrados++;
          for (const idx of indices) {
            const fila = filasRaw.find(f => f.indice === idx);
            if (fila) {
              fila.advertencias.push(`Tracking duplicado (aparece ${indices.length} veces)`);
            }
          }
        }
      }

      if (duplicadosEncontrados > 0) {
        advertencias.push(`Se encontraron ${duplicadosEncontrados} tracking numbers duplicados`);
      }

      enviarProgreso('DUPLICADOS', 100, `Verificación completada: ${duplicadosEncontrados} duplicados`);
    }

    // ========================================
    // FASE 6: Agrupación por consignatario
    // ========================================
    enviarProgreso('CONSIGNATARIOS', 0, 'Agrupando por consignatario...');

    const consignatarios = agruparPorConsignatario(filasRaw);
    
    enviarProgreso('CONSIGNATARIOS', 100, `Agrupados ${Object.keys(consignatarios).length} consignatarios`);

    // ========================================
    // FASE 7: Generación de resumen final
    // ========================================
    enviarProgreso('RESUMEN', 0, 'Generando resumen...');

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
        categorias: categoriasCount,
        requierenPermisos,
        prohibidos
      },
      filas: filasRaw,
      resumen: calcularResumen(filasRaw, tiempoProcesamiento),
      errores,
      advertencias
    };

    enviarProgreso('RESUMEN', 100, `Procesamiento completado en ${(tiempoProcesamiento / 1000).toFixed(2)}s`);

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

// ============================================
// AGRUPACIÓN POR CONSIGNATARIO
// ============================================

interface ConsignatarioAgrupado {
  nombre: string;
  identificacion: string;
  telefono: string;
  direccion: string;
  provincia: string;
  paquetes: FilaProcesada[];
  valorTotal: number;
  pesoTotal: number;
  cantidadPaquetes: number;
}

function agruparPorConsignatario(filas: FilaProcesada[]): Record<string, ConsignatarioAgrupado> {
  const consignatarios: Record<string, ConsignatarioAgrupado> = {};

  for (const fila of filas) {
    // Usar identificación como clave, o nombre si no hay identificación
    const clave = fila.identificacion || fila.destinatario || `SIN_ID_${fila.indice}`;
    
    if (!consignatarios[clave]) {
      consignatarios[clave] = {
        nombre: fila.destinatario,
        identificacion: fila.identificacion,
        telefono: fila.telefono,
        direccion: fila.direccion,
        provincia: fila.provincia,
        paquetes: [],
        valorTotal: 0,
        pesoTotal: 0,
        cantidadPaquetes: 0
      };
    }

    consignatarios[clave].paquetes.push(fila);
    consignatarios[clave].valorTotal += fila.valorUSD;
    consignatarios[clave].pesoTotal += fila.peso;
    consignatarios[clave].cantidadPaquetes++;
  }

  return consignatarios;
}

// ============================================
// FUNCIONES AUXILIARES ADICIONALES
// ============================================

function detectarAerolinea(mawb: string): { codigo: string; nombre: string } {
  const prefijos: Record<string, string> = {
    '074': 'KLM Royal Dutch Airlines',
    '006': 'Delta Air Lines',
    '001': 'American Airlines',
    '016': 'United Airlines',
    '172': 'Copa Airlines',
    '220': 'Lufthansa',
    '057': 'Air France',
    '083': 'Avianca',
    '139': 'LATAM Airlines',
    '045': 'Iberia',
    '058': 'Cargolux',
    '235': 'Turkish Airlines',
    '180': 'Korean Air',
    '157': 'Qatar Airways',
    '176': 'Emirates'
  };

  const prefijo = mawb.substring(0, 3);
  return {
    codigo: prefijo,
    nombre: prefijos[prefijo] || 'Aerolínea Desconocida'
  };
}

function validarMAWB(mawb: string): { valido: boolean; mensaje: string } {
  // Formato estándar: XXX-XXXXXXXX (3 dígitos prefijo + 8 dígitos)
  const limpio = mawb.replace(/[-\s]/g, '');
  
  if (limpio.length !== 11) {
    return { valido: false, mensaje: 'MAWB debe tener 11 dígitos' };
  }

  if (!/^\d+$/.test(limpio)) {
    return { valido: false, mensaje: 'MAWB solo debe contener números' };
  }

  // Verificar dígito de control (módulo 7)
  const sinControl = limpio.substring(0, 10);
  const digitoControl = parseInt(limpio.substring(10, 11));
  const calculado = parseInt(sinControl) % 7;

  if (calculado !== digitoControl) {
    return { valido: false, mensaje: 'Dígito de control inválido' };
  }

  return { valido: true, mensaje: 'MAWB válido' };
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(valor);
}

function formatearPeso(peso: number): string {
  if (peso >= 1000) {
    return `${(peso / 1000).toFixed(2)} kg`;
  }
  return `${peso.toFixed(2)} lbs`;
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

