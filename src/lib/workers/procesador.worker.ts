// ============================================
// WORKER DE PROCESAMIENTO DE MANIFIESTOS v3.0
// Procesamiento Completamente Automático con IA
// ============================================

import * as XLSX from 'xlsx';
import { AnalizadorManifiesto, TipoColumna } from '../analizador/analizador-manifiesto-completo';
import { ClasificadorInteligente } from '../clasificacion/clasificadorInteligente';

// ============================================
// LOGGER SEGURO PARA WORKER (solo en desarrollo)
// ============================================
const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : true;

const devLog = (msg: string) => { if (isDev) console.log(msg); };
const devWarn = (msg: string) => { if (isDev) console.warn(msg); };
const devError = (msg: string) => { if (isDev) console.error(msg); };
const devSection = (title: string) => { 
  if (isDev) { 
    console.log('═'.repeat(70)); 
    console.log(title); 
    console.log('═'.repeat(70)); 
  } 
};

// ============================================
// GENERADOR DE IDs
// ============================================

function nanoid(size = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < size; i++) {
    id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return id;
}

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface MensajeWorker {
  tipo: 'PROCESAR_MANIFIESTO' | 'CANCELAR' | 'OBTENER_ESTADO';
  payload?: {
    archivo: ArrayBuffer;
    mawb?: string;
    operador?: string;
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
  tipo: 'PROGRESO' | 'RESULTADO' | 'ERROR' | 'COMPLETADO' | 'ADVERTENCIA';
  payload: any;
}

// Re-export types for backward compatibility
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
  resumen: {
    totalPaquetes: number;
    valorTotal: number;
    pesoTotal: number;
    promedioValor: number;
    promedioPeso: number;
    porCategoria: Record<string, { cantidad: number; valor: number }>;
    porProvincia: Record<string, number>;
    porCategoriaAduanera: Record<string, number>;
    tiempoProcesamiento: number;
  };
  errores: Array<{
    fila: number;
    campo: string;
    valor: string;
    mensaje: string;
    nivel: 'error' | 'advertencia';
  }>;
  advertencias: string[];
}

// ============================================
// ESTADO DEL WORKER
// ============================================

let procesandoActivo = false;
let cancelarProcesamiento = false;

// ============================================
// FUNCIÓN DE ENVÍO DE PROGRESO
// ============================================

function enviarProgreso(progreso: number, mensaje: string): void {
  self.postMessage({
    tipo: 'PROGRESO',
    payload: { progreso, mensaje }
  } as RespuestaWorker);
}

function enviarError(error: string): void {
  self.postMessage({
    tipo: 'ERROR',
    payload: { error }
  } as RespuestaWorker);
}

// ============================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO AUTOMÁTICO
// ============================================

async function procesarManifiesto(data: { archivo: ArrayBuffer; operador?: string }) {
  const { archivo, operador } = data;
  
  try {
    devSection('🚀 INICIANDO PROCESAMIENTO AUTOMÁTICO');
    
    procesandoActivo = true;
    cancelarProcesamiento = false;
    
    // ═══════════════════════════════════════════════════════════
    // FASE 1: ANÁLISIS INTELIGENTE DEL ARCHIVO (0-20%)
    // ═══════════════════════════════════════════════════════════
    
    enviarProgreso(5, 'Analizando estructura del manifiesto...');
    
    const analisis = await AnalizadorManifiesto.analizarArchivo(archivo);
    
    // Validar que el análisis fue exitoso
    if (!analisis.formatoValido) {
      throw new Error(
        '❌ No se pudo analizar el manifiesto correctamente.\n\n' +
        'Problemas detectados:\n' +
        analisis.advertencias.join('\n') +
        '\n\nAsegúrate de que el archivo contenga:\n' +
        '• MAWB en formato IATA (XXX-XXXXXXXX)\n' +
        '• Columna de guías/tracking\n' +
        '• Columna de descripción de productos'
      );
    }
    
    enviarProgreso(10, `Archivo analizado. MAWB: ${analisis.mawb}`);
    
    if (analisis.advertencias.length > 0) {
      devWarn('⚠️ Advertencias del análisis: ' + analisis.advertencias.join(', '));
    }
    
    devLog(`✅ Análisis completado - MAWB: ${analisis.mawb}, Aerolínea: ${analisis.aerolinea}, Filas: ${analisis.totalFilas}, Confianza: ${(analisis.confianzaGeneral * 100).toFixed(0)}%`);
    
    // ═══════════════════════════════════════════════════════════
    // FASE 2: LEER DATOS DEL EXCEL (20-30%)
    // ═══════════════════════════════════════════════════════════
    
    enviarProgreso(20, 'Leyendo datos del Excel...');
    
    const workbook = XLSX.read(archivo, { cellFormula: false });
    const primeraHoja = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeraHoja];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false, 
      defval: '' 
    });
    
    enviarProgreso(25, `${jsonData.length} filas encontradas`);
    
    // Verificar cancelación
    if (cancelarProcesamiento) {
      throw new Error('Procesamiento cancelado por el usuario');
    }
    
    // ═══════════════════════════════════════════════════════════
    // FASE 3: PROCESAR PAQUETES CON MAPEO AUTOMÁTICO (30-70%)
    // ═══════════════════════════════════════════════════════════
    
    enviarProgreso(30, 'Procesando paquetes con clasificación automática...');
    
    const paquetes: any[] = [];
    const errores: string[] = [];
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
      if (cancelarProcesamiento) {
        throw new Error('Procesamiento cancelado por el usuario');
      }
      
      const chunk = jsonData.slice(i, i + CHUNK_SIZE);
      const progresoBase = 30 + ((i / jsonData.length) * 40);
      
      for (let j = 0; j < chunk.length; j++) {
        const fila = chunk[j];
        const numeroFila = i + j + 2;
        
        try {
          const paquete = procesarFilaAutomatica(
            fila, 
            analisis.columnas, 
            analisis.mawb!,
            numeroFila
          );
          
          if (paquete) {
            paquetes.push(paquete);
          }
          
        } catch (error) {
          const mensaje = `Fila ${numeroFila}: ${error instanceof Error ? error.message : 'Error'}`;
          errores.push(mensaje);
          devError(mensaje);
        }
      }
      
      enviarProgreso(
        progresoBase,
        `Procesados ${Math.min(i + CHUNK_SIZE, jsonData.length)} de ${jsonData.length} paquetes`
      );
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    if (paquetes.length === 0) {
      throw new Error(
        'No se procesó ningún paquete válido.\n\n' +
        'Errores:\n' + errores.slice(0, 5).join('\n')
      );
    }
    
    enviarProgreso(70, `${paquetes.length} paquetes procesados exitosamente`);
    
    // ═══════════════════════════════════════════════════════════
    // FASE 4: CLASIFICACIÓN HTS Y LIQUIDACIONES (70-90%)
    // ═══════════════════════════════════════════════════════════
    
    enviarProgreso(75, 'Clasificando por HTS Code y calculando liquidaciones...');
    
    const liquidaciones: any[] = [];
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < paquetes.length; i += BATCH_SIZE) {
      if (cancelarProcesamiento) {
        throw new Error('Procesamiento cancelado por el usuario');
      }
      
      const batch = paquetes.slice(i, i + BATCH_SIZE);
      const progresoBase = 75 + ((i / paquetes.length) * 15);
      
      const liquidacionesBatch = await Promise.all(
        batch.map(async (paquete) => {
          try {
            return await calcularLiquidacionConHTS(paquete);
          } catch (error) {
            devError(`Error liquidando ${paquete.numeroGuia}`);
            return crearLiquidacionError(paquete, error);
          }
        })
      );
      
      liquidaciones.push(...liquidacionesBatch);
      
      enviarProgreso(
        progresoBase,
        `Liquidaciones: ${Math.min(i + BATCH_SIZE, paquetes.length)} de ${paquetes.length}`
      );
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // ═══════════════════════════════════════════════════════════
    // FASE 5: DISTRIBUCIÓN POR VALOR (90-95%)
    // ═══════════════════════════════════════════════════════════
    
    enviarProgreso(90, 'Generando distribución por valor...');
    
    const distribucion = generarDistribucionPorValor(paquetes, liquidaciones);
    
    // ═══════════════════════════════════════════════════════════
    // FASE 6: CREAR MANIFIESTO Y ESTADÍSTICAS (95-100%)
    // ═══════════════════════════════════════════════════════════
    
    enviarProgreso(95, 'Generando estadísticas finales...');
    
    const estadisticas = calcularEstadisticasCompletas(paquetes, liquidaciones, distribucion);
    
    const manifiesto = {
      id: nanoid(),
      mawb: analisis.mawb,
      numeroManifiesto: analisis.mawb,
      aerolinea: analisis.aerolinea,
      prefijoIATA: analisis.prefijoIATA,
      fechaArribo: new Date().toISOString(),
      fechaProceso: new Date().toISOString(),
      operador: operador || 'Sistema Automático',
      totalPaquetes: paquetes.length,
      estado: 'procesado',
      estadisticas,
      distribucion,
      confianzaAnalisis: analisis.confianzaGeneral,
      advertenciasAnalisis: analisis.advertencias,
      version: 1
    };
    
    // Asignar manifiestoId
    for (const paquete of paquetes) {
      paquete.manifiestoId = manifiesto.id;
    }
    
    for (const liquidacion of liquidaciones) {
      liquidacion.manifiestoId = manifiesto.id;
    }
    
    enviarProgreso(100, 'Procesamiento completado');
    
    console.log('═'.repeat(70));
    console.log('✅ PROCESAMIENTO COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(70));
    
    self.postMessage({
      tipo: 'COMPLETADO',
      payload: {
        manifiesto,
        paquetes,
        liquidaciones,
        distribucion,
        analisis: {
          mawb: analisis.mawb,
          aerolinea: analisis.aerolinea,
          confianza: analisis.confianzaGeneral,
          advertencias: analisis.advertencias
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en procesamiento:', error);
    
    self.postMessage({
      tipo: 'ERROR',
      payload: {
        mensaje: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  } finally {
    procesandoActivo = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PROCESAR FILA CON MAPEO AUTOMÁTICO
// 
// IMPORTANTE: El análisis se realiza por GUÍA INDIVIDUAL (tracking/AWB),
// NO por la guía aérea master (MAWB). El MAWB solo es referencia del
// manifiesto consolidado. Cada paquete tiene su propia guía única.
// ═══════════════════════════════════════════════════════════════

function procesarFilaAutomatica(
  fila: any,
  columnasDetectadas: Map<TipoColumna, any>,
  mawb: string,
  numeroFila: number
): any | null {
  
  // Función auxiliar para obtener valor
  const obtenerValor = (tipo: TipoColumna): string => {
    const col = columnasDetectadas.get(tipo);
    if (!col) return '';
    return String(fila[col.nombreOriginal] || '').trim();
  };
  
  // 1. Obtener tracking (OBLIGATORIO) - primero AWB, luego LOCAL TRACKING
  let tracking = obtenerValor('awb');
  if (!tracking) {
    tracking = obtenerValor('localTracking');
  }
  if (!tracking) {
    console.warn(`Fila ${numeroFila}: Sin tracking (AWB o LOCAL TRACKING PROVIDER), omitiendo`);
    return null;
  }
  
  // 2. Obtener descripción (OBLIGATORIO)
  let descripcion = obtenerValor('descripcion');
  if (!descripcion) {
    descripcion = 'Mercancía General';
    console.warn(`Fila ${numeroFila}: Sin descripción, usando default`);
  }
  
  // 3. Obtener valor USD
  let valor = 0;
  const valorStr = obtenerValor('valor').replace(/[^0-9.-]/g, '');
  try {
    valor = parseFloat(valorStr) || 0;
    if (valor < 0) valor = 0;
  } catch {
    console.warn(`Fila ${numeroFila}: Valor inválido`);
  }
  
  // 4. Obtener peso
  let peso = 0;
  const pesoStr = obtenerValor('peso').replace(/[^0-9.-]/g, '');
  try {
    peso = parseFloat(pesoStr) || 0;
    if (peso < 0) peso = 0;
    
    // Convertir kg a lb si parece kg (valor pequeño)
    if (peso > 0 && peso < 100) {
      peso = peso * 2.20462;
    }
  } catch {
    peso = 0;
  }
  
  // Estimar peso si no hay
  if (peso === 0 && valor > 0) {
    peso = Math.max(valor * 0.1, 0.5);
  }
  
  // 5. Obtener flete (FREIGHT)
  let flete = 0;
  const fleteStr = obtenerValor('flete').replace(/[^0-9.-]/g, '');
  try {
    flete = parseFloat(fleteStr) || 0;
  } catch {
    flete = 0;
  }
  
  // 6. Obtener cantidad
  let cantidad = 1;
  const cantidadStr = obtenerValor('cantidad').replace(/[^0-9]/g, '');
  try {
    cantidad = parseInt(cantidadStr) || 1;
  } catch {
    cantidad = 1;
  }
  
  // 7. Clasificar producto usando ClasificadorInteligente
  const clasificacion = ClasificadorInteligente.clasificar(descripcion, valor);
  
  // 8. Procesar consignatario y datos adicionales
  const nombreConsignatario = obtenerValor('consignatario') || 'Sin nombre';
  const direccionEntrega = obtenerValor('direccion') || 'Sin dirección';
  const ciudad = obtenerValor('ciudad') || 'Panamá';
  const dni = obtenerValor('dni') || '';
  const email = obtenerValor('email') || '';
  const telefono = obtenerValor('telefono') || '';
  const codigoArancelario = obtenerValor('codigoArancelario') || '';
  const descripcionArancel = obtenerValor('descripcionArancel') || '';
  const consolidado = obtenerValor('consolidado') || '';
  const codigoPostal = obtenerValor('codigoPostal') || '';
  const numeroInterno = obtenerValor('numeroInterno') || '';
  const tipoDoc = obtenerValor('tipoDoc') || '';
  
  // 9. Crear paquete - identificado por GUÍA INDIVIDUAL (numeroGuia), no por MAWB
  const paquete = {
    id: nanoid(),
    manifiestoId: '',
    // GUÍA INDIVIDUAL del paquete (Amazon, courier local) - IDENTIFICADOR ÚNICO
    numeroGuia: tracking,
    // MAWB es solo REFERENCIA del manifiesto consolidado, NO para análisis individual
    mawb,
    
    // Clasificación
    categoriaProducto: clasificacion.categoriaProducto,
    categoriaAduanera: clasificacion.categoriaAduanera,
    
    // Consignatario
    consignatario: {
      nombreCompleto: nombreConsignatario,
      identificacion: dni,
      telefono,
      email,
      direccion: direccionEntrega,
      tipoIdentificacion: tipoDoc || 'sin_identificacion',
      cantidadPaquetes: 1
    },
    
    // Producto
    descripcion,
    valor,
    peso,
    flete,
    cantidad,
    
    // Código arancelario
    codigoArancelario,
    descripcionArancel,
    
    // Ubicación
    ubicacion: {
      ciudad,
      codigoPostal,
      direccionCompleta: direccionEntrega,
      confianza: 85
    },
    
    // Consolidado
    consolidado,
    numeroInterno,
    
    // Estado
    estado: 'recibido',
    
    // Metadata de clasificación
    confianzaClasificacion: clasificacion.confianza,
    palabrasClaveDetectadas: clasificacion.palabrasClaveDetectadas || [],
    requierePermiso: clasificacion.requierePermiso,
    autoridad: clasificacion.autoridades?.join(', ') || '',
    
    // Fechas
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    version: 1
  };
  
  return paquete;
}

// ═══════════════════════════════════════════════════════════════
// CALCULAR LIQUIDACIÓN CON HTS CODE
// ═══════════════════════════════════════════════════════════════

async function calcularLiquidacionConHTS(paquete: any): Promise<any> {
  
  const valorCIF = paquete.valor;
  let hsCode = '9999.99.00'; // Default genérico
  let daiPercent = 0;
  let iscPercent = 0;
  let itbmsPercent = 7; // ITBMS estándar Panamá
  
  // Clasificación por categoría aduanera
  if (paquete.categoriaAduanera === 'A') {
    // Documentos - exentos
    return {
      id: nanoid(),
      numeroGuia: paquete.numeroGuia,
      manifiestoId: paquete.manifiestoId,
      categoriaAduanera: 'A',
      valorCIF,
      hsCode: '4901.10.00', // Libros y documentos
      daiPercent: 0,
      iscPercent: 0,
      itbmsPercent: 0,
      montoDAI: 0,
      montoISC: 0,
      montoITBMS: 0,
      tasaAduanera: 0,
      totalTributos: 0,
      totalAPagar: valorCIF,
      estado: 'exento',
      fechaCalculo: new Date().toISOString(),
      calculadaPor: 'sistema',
      version: 1
    };
  }
  
  if (paquete.categoriaAduanera === 'B') {
    // De Minimis (≤ $100)
    return {
      id: nanoid(),
      numeroGuia: paquete.numeroGuia,
      manifiestoId: paquete.manifiestoId,
      categoriaAduanera: 'B',
      valorCIF,
      hsCode: '9999.99.00',
      daiPercent: 0,
      iscPercent: 0,
      itbmsPercent: 0,
      montoDAI: 0,
      montoISC: 0,
      montoITBMS: 0,
      tasaAduanera: 2.00, // Tasa mínima
      totalTributos: 2.00,
      totalAPagar: valorCIF + 2.00,
      estado: 'de_minimis',
      fechaCalculo: new Date().toISOString(),
      calculadaPor: 'sistema',
      version: 1
    };
  }
  
  // Categoría C o D - cálculo completo
  // Tasas según categoría de producto
  switch (paquete.categoriaProducto) {
    case 'electronica':
      daiPercent = 10;
      hsCode = '8517.12.00'; // Teléfonos
      break;
    case 'ropa':
      daiPercent = 15;
      hsCode = '6109.10.00'; // Camisetas
      break;
    case 'calzado':
      daiPercent = 15;
      hsCode = '6403.99.00'; // Calzado
      break;
    case 'medicamentos':
      daiPercent = 0;
      itbmsPercent = 0; // Exento
      hsCode = '3004.90.00';
      break;
    case 'suplementos':
      daiPercent = 5;
      hsCode = '2106.90.99';
      break;
    default:
      daiPercent = 10; // Tasa general
      break;
  }
  
  // Cálculos
  const montoDAI = valorCIF * (daiPercent / 100);
  const baseISC = valorCIF + montoDAI;
  const montoISC = baseISC * (iscPercent / 100);
  const baseITBMS = baseISC + montoISC;
  const montoITBMS = baseITBMS * (itbmsPercent / 100);
  const tasaAduanera = 2.00;
  
  const totalTributos = montoDAI + montoISC + montoITBMS + tasaAduanera;
  const totalAPagar = valorCIF + totalTributos;
  
  return {
    id: nanoid(),
    numeroGuia: paquete.numeroGuia,
    manifiestoId: paquete.manifiestoId,
    categoriaAduanera: paquete.categoriaAduanera,
    valorCIF,
    hsCode,
    daiPercent,
    iscPercent,
    itbmsPercent,
    montoDAI: Math.round(montoDAI * 100) / 100,
    montoISC: Math.round(montoISC * 100) / 100,
    montoITBMS: Math.round(montoITBMS * 100) / 100,
    tasaAduanera,
    totalTributos: Math.round(totalTributos * 100) / 100,
    totalAPagar: Math.round(totalAPagar * 100) / 100,
    estado: 'calculada',
    fechaCalculo: new Date().toISOString(),
    calculadaPor: 'sistema',
    version: 1
  };
}

// ═══════════════════════════════════════════════════════════════
// CREAR LIQUIDACIÓN DE ERROR
// ═══════════════════════════════════════════════════════════════

function crearLiquidacionError(paquete: any, error: any): any {
  return {
    id: nanoid(),
    numeroGuia: paquete.numeroGuia,
    manifiestoId: paquete.manifiestoId,
    categoriaAduanera: paquete.categoriaAduanera || 'D',
    valorCIF: paquete.valor,
    hsCode: '9999.99.00',
    daiPercent: 0,
    iscPercent: 0,
    itbmsPercent: 0,
    montoDAI: 0,
    montoISC: 0,
    montoITBMS: 0,
    tasaAduanera: 0,
    totalTributos: 0,
    totalAPagar: paquete.valor,
    estado: 'error',
    error: error instanceof Error ? error.message : 'Error desconocido',
    fechaCalculo: new Date().toISOString(),
    calculadaPor: 'sistema',
    version: 1
  };
}

// ═══════════════════════════════════════════════════════════════
// GENERAR DISTRIBUCIÓN POR VALOR
// ═══════════════════════════════════════════════════════════════

function generarDistribucionPorValor(paquetes: any[], liquidaciones: any[]) {
  
  const loteA = {
    nombre: 'Lote A - Menor a $100',
    paquetes: [] as any[],
    liquidaciones: [] as any[],
    totalPaquetes: 0,
    valorTotal: 0,
    tributosTotal: 0,
    totalCobrar: 0
  };
  
  const loteB = {
    nombre: 'Lote B - Mayor a $100',
    paquetes: [] as any[],
    liquidaciones: [] as any[],
    totalPaquetes: 0,
    valorTotal: 0,
    tributosTotal: 0,
    totalCobrar: 0
  };
  
  for (let i = 0; i < paquetes.length; i++) {
    const paquete = paquetes[i];
    const liquidacion = liquidaciones[i];
    
    if (paquete.valor <= 100) {
      loteA.paquetes.push(paquete);
      loteA.liquidaciones.push(liquidacion);
      loteA.totalPaquetes++;
      loteA.valorTotal += paquete.valor;
      loteA.tributosTotal += liquidacion.totalTributos;
      loteA.totalCobrar += liquidacion.totalAPagar;
    } else {
      loteB.paquetes.push(paquete);
      loteB.liquidaciones.push(liquidacion);
      loteB.totalPaquetes++;
      loteB.valorTotal += paquete.valor;
      loteB.tributosTotal += liquidacion.totalTributos;
      loteB.totalCobrar += liquidacion.totalAPagar;
    }
  }
  
  // Redondear totales
  loteA.valorTotal = Math.round(loteA.valorTotal * 100) / 100;
  loteA.tributosTotal = Math.round(loteA.tributosTotal * 100) / 100;
  loteA.totalCobrar = Math.round(loteA.totalCobrar * 100) / 100;
  
  loteB.valorTotal = Math.round(loteB.valorTotal * 100) / 100;
  loteB.tributosTotal = Math.round(loteB.tributosTotal * 100) / 100;
  loteB.totalCobrar = Math.round(loteB.totalCobrar * 100) / 100;
  
  return { loteA, loteB };
}

// ═══════════════════════════════════════════════════════════════
// CALCULAR ESTADÍSTICAS COMPLETAS
// ═══════════════════════════════════════════════════════════════

function calcularEstadisticasCompletas(
  paquetes: any[], 
  liquidaciones: any[], 
  distribucion: any
) {
  
  return {
    totalPaquetes: paquetes.length,
    
    // Por categoría aduanera
    categoriaA: paquetes.filter(p => p.categoriaAduanera === 'A').length,
    categoriaB: paquetes.filter(p => p.categoriaAduanera === 'B').length,
    categoriaC: paquetes.filter(p => p.categoriaAduanera === 'C').length,
    categoriaD: paquetes.filter(p => p.categoriaAduanera === 'D').length,
    
    // Restricciones
    conRestricciones: paquetes.filter(p => p.requierePermiso).length,
    
    // Financiero
    valorCIFTotal: Math.round(paquetes.reduce((sum, p) => sum + p.valor, 0) * 100) / 100,
    tributosTotal: Math.round(liquidaciones.reduce((sum, l) => sum + l.totalTributos, 0) * 100) / 100,
    totalCobrar: Math.round(liquidaciones.reduce((sum, l) => sum + l.totalAPagar, 0) * 100) / 100,
    
    pesoTotal: Math.round(paquetes.reduce((sum, p) => sum + p.peso, 0) * 100) / 100,
    
    // Distribución
    distribucion: {
      menorA100: {
        cantidad: distribucion.loteA.totalPaquetes,
        porcentaje: paquetes.length > 0 ? Math.round((distribucion.loteA.totalPaquetes / paquetes.length) * 100) : 0
      },
      mayorA100: {
        cantidad: distribucion.loteB.totalPaquetes,
        porcentaje: paquetes.length > 0 ? Math.round((distribucion.loteB.totalPaquetes / paquetes.length) * 100) : 0
      }
    }
  };
}

// ============================================
// MANEJADOR DE MENSAJES DEL WORKER
// ============================================

self.onmessage = async (event: MessageEvent<MensajeWorker>) => {
  const { tipo, payload } = event.data;

  switch (tipo) {
    case 'PROCESAR_MANIFIESTO':
      if (!payload?.archivo) {
        enviarError('Falta el archivo para procesar');
        return;
      }

      try {
        await procesarManifiesto({
          archivo: payload.archivo,
          operador: payload.operador
        });
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
          progreso: procesandoActivo ? 50 : 0,
          mensaje: procesandoActivo ? 'Procesamiento en curso' : 'Sin actividad'
        }
      } as RespuestaWorker);
      break;
  }
};
