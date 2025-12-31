/**
 * ANALIZADOR MULTI-MODAL DE MANIFIESTOS
 * Procesa manifiestos de cualquier modo de transporte
 * IPL Group - Zona Libre de Colón
 */

import * as XLSX from 'xlsx';
import { DetectorModoTransporte } from './DetectorModoTransporte';
import { 
  ModoTransporte, 
  DocumentoMaestro,
  DocumentoIndividual,
  MAWB,
  BillOfLading,
  CartaDePorte,
  HAWB,
  HBL,
  GuiaTerrestre,
  ResultadoAnalisisMultiModal,
  ZonaAduanera,
  NAVIERAS,
  TRANSPORTISTAS_TERRESTRES
} from '@/types/transporte';

// ============================================
// PATRONES DE COLUMNAS POR MODO
// ============================================

type TipoColumnaMultiModal = 
  // Comunes
  | 'documentoMaestro'
  | 'documentoIndividual'
  | 'descripcion'
  | 'valor'
  | 'peso'
  | 'cantidad'
  | 'destinatario'
  | 'direccion'
  | 'ciudad'
  | 'telefono'
  | 'identificacion'
  // Aéreo específico
  | 'aerolinea'
  | 'vuelo'
  | 'aeropuertoOrigen'
  | 'aeropuertoDestino'
  // Marítimo específico
  | 'naviera'
  | 'buque'
  | 'contenedor'
  | 'tipoContenedor'
  | 'sello'
  | 'puertoOrigen'
  | 'puertoDestino'
  | 'teus'
  // Terrestre específico
  | 'placa'
  | 'conductor'
  | 'ruta'
  | 'frontera'
  | 'selloAduanero';

const PATRONES_COLUMNAS: Record<TipoColumnaMultiModal, string[]> = {
  // Documentos maestros
  documentoMaestro: [
    'mawb', 'master awb', 'b/l', 'bl', 'bill of lading', 'mbl',
    'carta porte', 'carta de porte', 'master', 'conocimiento'
  ],
  documentoIndividual: [
    'hawb', 'house awb', 'awb', 'hbl', 'house bl', 'guia', 'guía',
    'tracking', 'guia terrestre', 'bulto'
  ],
  
  // Comunes
  descripcion: ['description', 'descripcion', 'producto', 'mercancia', 'goods'],
  valor: ['value', 'valor', 'amount', 'monto', 'precio', 'usd'],
  peso: ['weight', 'peso', 'kg', 'lb', 'kilos'],
  cantidad: ['quantity', 'cantidad', 'qty', 'pieces', 'piezas'],
  destinatario: ['consignee', 'consignatario', 'destinatario', 'recipient', 'nombre'],
  direccion: ['address', 'direccion', 'domicilio', 'ubicacion'],
  ciudad: ['city', 'ciudad', 'municipio', 'localidad'],
  telefono: ['phone', 'telefono', 'tel', 'celular', 'movil'],
  identificacion: ['dni', 'cedula', 'id', 'ruc', 'identificacion'],
  
  // Aéreo
  aerolinea: ['airline', 'aerolinea', 'carrier', 'transportista aereo'],
  vuelo: ['flight', 'vuelo', 'flight number', 'numero vuelo'],
  aeropuertoOrigen: ['origin airport', 'aeropuerto origen', 'departure', 'salida'],
  aeropuertoDestino: ['destination airport', 'aeropuerto destino', 'arrival', 'llegada'],
  
  // Marítimo
  naviera: ['shipping line', 'naviera', 'carrier', 'linea naviera'],
  buque: ['vessel', 'buque', 'ship', 'barco', 'nave'],
  contenedor: ['container', 'contenedor', 'container number', 'numero contenedor'],
  tipoContenedor: ['container type', 'tipo contenedor', 'size type'],
  sello: ['seal', 'sello', 'precinto', 'seal number'],
  puertoOrigen: ['port of loading', 'puerto origen', 'pol', 'puerto carga'],
  puertoDestino: ['port of discharge', 'puerto destino', 'pod', 'puerto descarga'],
  teus: ['teu', 'teus', 'twenty foot equivalent'],
  
  // Terrestre
  placa: ['plate', 'placa', 'license plate', 'matricula', 'patente'],
  conductor: ['driver', 'conductor', 'chofer', 'operador'],
  ruta: ['route', 'ruta', 'itinerario', 'trayecto'],
  frontera: ['border', 'frontera', 'crossing', 'paso fronterizo'],
  selloAduanero: ['customs seal', 'sello aduanero', 'precinto aduana']
};

// Prefijos IATA de aerolíneas
const PREFIJOS_IATA: Record<string, { nombre: string; codigo: string }> = {
  '001': { nombre: 'American Airlines', codigo: 'AA' },
  '016': { nombre: 'United Airlines', codigo: 'UA' },
  '020': { nombre: 'Lufthansa', codigo: 'LH' },
  '074': { nombre: 'KLM', codigo: 'KL' },
  '125': { nombre: 'British Airways', codigo: 'BA' },
  '172': { nombre: 'Copa Airlines', codigo: 'CM' },
  '180': { nombre: 'Korean Air', codigo: 'KE' },
  '205': { nombre: 'Avianca', codigo: 'AV' },
  '230': { nombre: 'Avianca Cargo', codigo: 'AV' },
  '406': { nombre: 'FedEx', codigo: 'FX' },
  '410': { nombre: 'UPS', codigo: '5X' },
  '427': { nombre: 'DHL', codigo: 'DH' },
  '876': { nombre: 'Amazon Prime Air', codigo: '3A' },
  '157': { nombre: 'Qatar Airways', codigo: 'QR' },
  '618': { nombre: 'Emirates', codigo: 'EK' },
  '810': { nombre: 'Amerijet International', codigo: 'M6' }
};

interface ColumnaDetectada {
  nombreOriginal: string;
  tipo: TipoColumnaMultiModal;
  confianza: number;
  indice: number;
}

export class AnalizadorMultiModal {
  
  /**
   * FUNCIÓN PRINCIPAL: Analiza archivo de cualquier modo
   */
  static async analizarArchivo(arrayBuffer: ArrayBuffer): Promise<ResultadoAnalisisMultiModal> {
    console.log('🌐 INICIANDO ANÁLISIS MULTI-MODAL');
    console.log('═'.repeat(70));
    
    // 1. Leer Excel
    const workbook = XLSX.read(arrayBuffer, { cellFormula: false });
    const primeraHoja = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeraHoja];
    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false, 
      defval: '' 
    });
    
    if (jsonData.length === 0) {
      throw new Error('❌ El archivo está vacío');
    }
    
    const columnasOriginales = Object.keys(jsonData[0]);
    console.log(`📊 Total de filas: ${jsonData.length}`);
    console.log(`📋 Columnas: ${columnasOriginales.length}`);
    
    // 2. Detectar modo de transporte
    const deteccion = DetectorModoTransporte.detectar(columnasOriginales, jsonData);
    console.log(`🚀 Modo detectado: ${deteccion.modo.toUpperCase()} (${deteccion.confianza.toFixed(1)}%)`);
    
    // 3. Detectar columnas según modo
    const columnasDetectadas = this.detectarColumnas(columnasOriginales, deteccion.modo);
    
    // 4. Procesar según modo
    let documentoMaestro: DocumentoMaestro | null = null;
    let documentosIndividuales: DocumentoIndividual[] = [];
    const advertencias: string[] = [];
    const errores: string[] = [];
    
    switch (deteccion.modo) {
      case 'aereo':
        const resultadoAereo = this.procesarAereo(jsonData, columnasDetectadas, columnasOriginales);
        documentoMaestro = resultadoAereo.mawb;
        documentosIndividuales = resultadoAereo.hawbs;
        advertencias.push(...resultadoAereo.advertencias);
        break;
        
      case 'maritimo':
        const resultadoMaritimo = this.procesarMaritimo(jsonData, columnasDetectadas, columnasOriginales);
        documentoMaestro = resultadoMaritimo.bl;
        documentosIndividuales = resultadoMaritimo.hbls;
        advertencias.push(...resultadoMaritimo.advertencias);
        break;
        
      case 'terrestre':
        const resultadoTerrestre = this.procesarTerrestre(jsonData, columnasDetectadas, columnasOriginales);
        documentoMaestro = resultadoTerrestre.cartaPorte;
        documentosIndividuales = resultadoTerrestre.guias;
        advertencias.push(...resultadoTerrestre.advertencias);
        break;
    }
    
    // 5. Calcular totales
    const totalBultos = documentosIndividuales.length;
    const valorTotalUSD = documentosIndividuales.reduce((sum, d) => sum + d.valorUSD, 0);
    const pesoTotal = documentosIndividuales.reduce((sum, d) => sum + d.peso, 0);
    
    console.log('═'.repeat(70));
    console.log(`✅ Análisis completado: ${totalBultos} bultos, USD ${valorTotalUSD.toFixed(2)}`);
    
    return {
      modoDetectado: deteccion.modo,
      confianzaDeteccion: deteccion.confianza,
      documentoMaestro,
      documentosIndividuales,
      totalBultos,
      valorTotalUSD,
      pesoTotal,
      zonaAduanera: deteccion.zonaAduaneraSugerida,
      advertencias,
      errores
    };
  }
  
  /**
   * Detecta columnas usando patrones multi-modales
   */
  private static detectarColumnas(
    columnas: string[], 
    modo: ModoTransporte
  ): Map<TipoColumnaMultiModal, ColumnaDetectada> {
    
    const detectadas = new Map<TipoColumnaMultiModal, ColumnaDetectada>();
    
    for (let i = 0; i < columnas.length; i++) {
      const nombreOriginal = columnas[i];
      const nombreNormalizado = nombreOriginal.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      for (const [tipo, patrones] of Object.entries(PATRONES_COLUMNAS)) {
        for (const patron of patrones) {
          if (nombreNormalizado.includes(patron) || 
              this.calcularSimilitud(nombreNormalizado, patron) > 0.8) {
            
            const tipoColumna = tipo as TipoColumnaMultiModal;
            if (!detectadas.has(tipoColumna)) {
              detectadas.set(tipoColumna, {
                nombreOriginal,
                tipo: tipoColumna,
                confianza: this.calcularSimilitud(nombreNormalizado, patron),
                indice: i
              });
            }
            break;
          }
        }
      }
    }
    
    return detectadas;
  }
  
  /**
   * Procesa manifiesto aéreo
   */
  private static procesarAereo(
    datos: Record<string, unknown>[],
    columnas: Map<TipoColumnaMultiModal, ColumnaDetectada>,
    columnasOriginales: string[]
  ): { mawb: MAWB | null; hawbs: HAWB[]; advertencias: string[] } {
    
    const advertencias: string[] = [];
    let mawb: MAWB | null = null;
    const hawbs: HAWB[] = [];
    
    // Buscar MAWB en datos
    const colMaster = columnas.get('documentoMaestro');
    const colIndividual = columnas.get('documentoIndividual');
    
    // Extraer MAWB del primer registro válido
    if (colMaster) {
      for (const fila of datos.slice(0, 10)) {
        const valorMaster = String(fila[colMaster.nombreOriginal] || '').trim();
        const mawbMatch = valorMaster.match(/(\d{3})-?(\d{8})/);
        if (mawbMatch) {
          const prefijo = mawbMatch[1];
          const numero = `${prefijo}-${mawbMatch[2]}`;
          const aerolineaInfo = PREFIJOS_IATA[prefijo];
          
          mawb = {
            id: crypto.randomUUID(),
            modo: 'aereo',
            numero,
            fechaEmision: new Date(),
            origen: '',
            destino: 'PTY',
            transportista: aerolineaInfo?.nombre || 'Desconocida',
            totalBultos: datos.length,
            pesoTotal: 0,
            valorDeclarado: 0,
            moneda: 'USD',
            estado: 'en_aduana',
            zonaAduanera: 'aeropuerto_tocumen',
            prefijoIATA: prefijo,
            codigoAerolinea: aerolineaInfo?.codigo || '',
            nombreAerolinea: aerolineaInfo?.nombre || 'Desconocida',
            aeropuertoOrigen: '',
            aeropuertoDestino: 'PTY'
          };
          break;
        }
      }
    }
    
    if (!mawb) {
      advertencias.push('No se detectó MAWB válido en formato IATA');
    }
    
    // Procesar cada fila como HAWB
    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      
      const hawb: HAWB = {
        id: crypto.randomUUID(),
        modo: 'aereo',
        documentoMaestroId: mawb?.id || '',
        mawbId: mawb?.id || '',
        numeroGuia: this.obtenerValor(fila, columnas.get('documentoIndividual'), columnasOriginales) || `HAWB-${i + 1}`,
        descripcion: this.obtenerValor(fila, columnas.get('descripcion'), columnasOriginales) || '',
        valorUSD: this.parseNumero(this.obtenerValor(fila, columnas.get('valor'), columnasOriginales)),
        peso: this.parseNumero(this.obtenerValor(fila, columnas.get('peso'), columnasOriginales)),
        unidadPeso: 'lb',
        cantidad: this.parseNumero(this.obtenerValor(fila, columnas.get('cantidad'), columnasOriginales)) || 1,
        destinatario: this.obtenerValor(fila, columnas.get('destinatario'), columnasOriginales) || '',
        direccion: this.obtenerValor(fila, columnas.get('direccion'), columnasOriginales) || '',
        ciudad: this.obtenerValor(fila, columnas.get('ciudad'), columnasOriginales) || '',
        provincia: '',
        telefono: this.obtenerValor(fila, columnas.get('telefono'), columnasOriginales),
        identificacion: this.obtenerValor(fila, columnas.get('identificacion'), columnasOriginales),
        requiereRevision: false,
        alertas: []
      };
      
      hawbs.push(hawb);
    }
    
    // Actualizar totales en MAWB
    if (mawb) {
      mawb.totalBultos = hawbs.length;
      mawb.pesoTotal = hawbs.reduce((sum, h) => sum + h.peso, 0);
      mawb.valorDeclarado = hawbs.reduce((sum, h) => sum + h.valorUSD, 0);
    }
    
    return { mawb, hawbs, advertencias };
  }
  
  /**
   * Procesa manifiesto marítimo
   */
  private static procesarMaritimo(
    datos: Record<string, unknown>[],
    columnas: Map<TipoColumnaMultiModal, ColumnaDetectada>,
    columnasOriginales: string[]
  ): { bl: BillOfLading | null; hbls: HBL[]; advertencias: string[] } {
    
    const advertencias: string[] = [];
    let bl: BillOfLading | null = null;
    const hbls: HBL[] = [];
    
    // Buscar B/L y naviera
    const colMaster = columnas.get('documentoMaestro');
    const colNaviera = columnas.get('naviera');
    const colBuque = columnas.get('buque');
    const colContenedor = columnas.get('contenedor');
    
    if (colMaster) {
      for (const fila of datos.slice(0, 10)) {
        const valorBL = String(fila[colMaster.nombreOriginal] || '').trim();
        if (valorBL && valorBL.length >= 6) {
          const navieraValor = colNaviera 
            ? String(fila[colNaviera.nombreOriginal] || '').trim()
            : '';
          const buqueValor = colBuque
            ? String(fila[colBuque.nombreOriginal] || '').trim()
            : '';
          
          // Detectar naviera por prefijo de contenedor
          let navieraNombre = navieraValor;
          if (!navieraNombre && colContenedor) {
            const contenedor = String(fila[colContenedor.nombreOriginal] || '').trim();
            const prefijo = contenedor.substring(0, 4).toUpperCase();
            if (NAVIERAS[prefijo]) {
              navieraNombre = NAVIERAS[prefijo].nombre;
            }
          }
          
          bl = {
            id: crypto.randomUUID(),
            modo: 'maritimo',
            numero: valorBL,
            fechaEmision: new Date(),
            origen: '',
            destino: 'Colón, Panamá',
            transportista: navieraNombre || 'Naviera Desconocida',
            totalBultos: datos.length,
            pesoTotal: 0,
            valorDeclarado: 0,
            moneda: 'USD',
            estado: 'en_aduana',
            zonaAduanera: 'puerto_cristobal',
            tipoBL: 'MBL',
            naviera: navieraNombre || '',
            nombreBuque: buqueValor || '',
            numeroViaje: '',
            puertoOrigen: '',
            puertoDestino: 'PACLP', // Colón
            contenedores: [],
            tipoServicio: 'LCL'
          };
          break;
        }
      }
    }
    
    if (!bl) {
      advertencias.push('No se detectó B/L válido');
    }
    
    // Procesar cada fila como HBL
    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      
      const hbl: HBL = {
        id: crypto.randomUUID(),
        modo: 'maritimo',
        documentoMaestroId: bl?.id || '',
        mblId: bl?.id || '',
        numeroGuia: this.obtenerValor(fila, columnas.get('documentoIndividual'), columnasOriginales) || `HBL-${i + 1}`,
        descripcion: this.obtenerValor(fila, columnas.get('descripcion'), columnasOriginales) || '',
        valorUSD: this.parseNumero(this.obtenerValor(fila, columnas.get('valor'), columnasOriginales)),
        peso: this.parseNumero(this.obtenerValor(fila, columnas.get('peso'), columnasOriginales)),
        unidadPeso: 'kg',
        cantidad: this.parseNumero(this.obtenerValor(fila, columnas.get('cantidad'), columnasOriginales)) || 1,
        destinatario: this.obtenerValor(fila, columnas.get('destinatario'), columnasOriginales) || '',
        direccion: this.obtenerValor(fila, columnas.get('direccion'), columnasOriginales) || '',
        ciudad: this.obtenerValor(fila, columnas.get('ciudad'), columnasOriginales) || '',
        provincia: '',
        telefono: this.obtenerValor(fila, columnas.get('telefono'), columnasOriginales),
        identificacion: this.obtenerValor(fila, columnas.get('identificacion'), columnasOriginales),
        requiereRevision: false,
        alertas: [],
        contenedorNumero: this.obtenerValor(fila, columnas.get('contenedor'), columnasOriginales)
      };
      
      hbls.push(hbl);
    }
    
    // Actualizar totales
    if (bl) {
      bl.totalBultos = hbls.length;
      bl.pesoTotal = hbls.reduce((sum, h) => sum + h.peso, 0);
      bl.valorDeclarado = hbls.reduce((sum, h) => sum + h.valorUSD, 0);
    }
    
    return { bl, hbls, advertencias };
  }
  
  /**
   * Procesa manifiesto terrestre
   */
  private static procesarTerrestre(
    datos: Record<string, unknown>[],
    columnas: Map<TipoColumnaMultiModal, ColumnaDetectada>,
    columnasOriginales: string[]
  ): { cartaPorte: CartaDePorte | null; guias: GuiaTerrestre[]; advertencias: string[] } {
    
    const advertencias: string[] = [];
    let cartaPorte: CartaDePorte | null = null;
    const guias: GuiaTerrestre[] = [];
    
    const colMaster = columnas.get('documentoMaestro');
    const colPlaca = columnas.get('placa');
    const colConductor = columnas.get('conductor');
    const colFrontera = columnas.get('frontera');
    
    if (colMaster) {
      for (const fila of datos.slice(0, 10)) {
        const valorCP = String(fila[colMaster.nombreOriginal] || '').trim();
        if (valorCP && valorCP.length >= 4) {
          const placaValor = colPlaca
            ? String(fila[colPlaca.nombreOriginal] || '').trim()
            : '';
          const conductorValor = colConductor
            ? String(fila[colConductor.nombreOriginal] || '').trim()
            : '';
          const fronteraValor = colFrontera
            ? String(fila[colFrontera.nombreOriginal] || '').trim().toLowerCase()
            : '';
          
          const puntoFronterizo = fronteraValor.includes('guabito') || fronteraValor.includes('sixaola') || fronteraValor.includes('bocas')
            ? 'guabito' as const
            : 'paso_canoas' as const;
          
          cartaPorte = {
            id: crypto.randomUUID(),
            modo: 'terrestre',
            numero: valorCP,
            fechaEmision: new Date(),
            origen: 'Costa Rica',
            destino: 'Panamá',
            transportista: 'Transporte Terrestre',
            totalBultos: datos.length,
            pesoTotal: 0,
            valorDeclarado: 0,
            moneda: 'USD',
            estado: 'en_aduana',
            zonaAduanera: puntoFronterizo === 'guabito' ? 'frontera_guabito' : 'frontera_paso_canoas',
            tipoTransporte: 'camion',
            placaVehiculo: placaValor || '',
            nombreConductor: conductorValor || '',
            licenciaConductor: '',
            rutaTransporte: '',
            puntoFronterizo,
            paisOrigen: 'CR',
            sellosAduaneros: []
          };
          break;
        }
      }
    }
    
    if (!cartaPorte) {
      advertencias.push('No se detectó Carta de Porte válida');
    }
    
    // Procesar cada fila como guía terrestre
    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      
      const guia: GuiaTerrestre = {
        id: crypto.randomUUID(),
        modo: 'terrestre',
        documentoMaestroId: cartaPorte?.id || '',
        cartaPorteId: cartaPorte?.id || '',
        numeroGuia: this.obtenerValor(fila, columnas.get('documentoIndividual'), columnasOriginales) || `GT-${i + 1}`,
        descripcion: this.obtenerValor(fila, columnas.get('descripcion'), columnasOriginales) || '',
        valorUSD: this.parseNumero(this.obtenerValor(fila, columnas.get('valor'), columnasOriginales)),
        peso: this.parseNumero(this.obtenerValor(fila, columnas.get('peso'), columnasOriginales)),
        unidadPeso: 'kg',
        cantidad: this.parseNumero(this.obtenerValor(fila, columnas.get('cantidad'), columnasOriginales)) || 1,
        destinatario: this.obtenerValor(fila, columnas.get('destinatario'), columnasOriginales) || '',
        direccion: this.obtenerValor(fila, columnas.get('direccion'), columnasOriginales) || '',
        ciudad: this.obtenerValor(fila, columnas.get('ciudad'), columnasOriginales) || '',
        provincia: '',
        telefono: this.obtenerValor(fila, columnas.get('telefono'), columnasOriginales),
        identificacion: this.obtenerValor(fila, columnas.get('identificacion'), columnasOriginales),
        requiereRevision: false,
        alertas: [],
        bultoNumero: i + 1
      };
      
      guias.push(guia);
    }
    
    // Actualizar totales
    if (cartaPorte) {
      cartaPorte.totalBultos = guias.length;
      cartaPorte.pesoTotal = guias.reduce((sum, g) => sum + g.peso, 0);
      cartaPorte.valorDeclarado = guias.reduce((sum, g) => sum + g.valorUSD, 0);
    }
    
    return { cartaPorte, guias, advertencias };
  }
  
  // ============================================
  // UTILIDADES
  // ============================================
  
  private static obtenerValor(
    fila: Record<string, unknown>,
    columna: ColumnaDetectada | undefined,
    todasColumnas: string[]
  ): string | undefined {
    if (!columna) return undefined;
    return String(fila[columna.nombreOriginal] || '').trim() || undefined;
  }
  
  private static parseNumero(valor: string | undefined): number {
    if (!valor) return 0;
    const limpio = valor.replace(/[^0-9.,]/g, '').replace(',', '.');
    return parseFloat(limpio) || 0;
  }
  
  private static calcularSimilitud(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private static levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}
