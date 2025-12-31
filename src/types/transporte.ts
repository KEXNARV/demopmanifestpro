/**
 * TIPOS BASE MULTI-MODAL DE TRANSPORTE
 * IPL Group - Zona Libre de Colón
 * Soporta: Aéreo, Marítimo, Terrestre
 */

// ============================================
// MODOS DE TRANSPORTE
// ============================================

export type ModoTransporte = 'aereo' | 'maritimo' | 'terrestre';

export interface ConfiguracionModo {
  id: ModoTransporte;
  nombre: string;
  nombreCompleto: string;
  icono: string;
  documentoMaestro: string;       // MAWB, B/L, Carta de Porte
  documentoIndividual: string;    // HAWB, HBL, Guía Terrestre
  unidadCarga: string;            // Paquete, Contenedor, Camión
  tiempoTransitoPromedio: number; // días
  zonaAduanera: ZonaAduanera;
}

export type ZonaAduanera = 
  | 'aeropuerto_tocumen'           // Aeropuerto Internacional de Tocumen
  | 'aeropuerto_howard'            // Aeropuerto Howard
  | 'puerto_colon'                 // Puerto de Colón (Manzanillo, CCT, Evergreen)
  | 'puerto_balboa'                // Puerto de Balboa (Pacífico)
  | 'puerto_cristobal'             // Puerto Cristóbal
  | 'frontera_paso_canoas'         // Frontera Costa Rica
  | 'frontera_darien'              // Frontera Colombia
  | 'zona_libre_colon'             // Zona Libre de Colón (ZLC)
  | 'paso_canoas'                  // Alias: Paso Canoas (Chiriquí)
  | 'guabito'                      // Frontera Guabito/Sixaola (Bocas del Toro)
  | 'darien'                       // Alias: Darién
  | 'panama_pacifico';             // Área Panamá Pacífico

// ============================================
// DOCUMENTOS MAESTROS POR MODO
// ============================================

export interface DocumentoMaestroBase {
  id: string;
  modo: ModoTransporte;
  numero: string;                  // Número del documento
  fechaEmision: Date;
  origen: string;
  destino: string;
  transportista: string;
  totalBultos: number;
  pesoTotal: number;
  valorDeclarado: number;
  moneda: 'USD' | 'PAB' | 'EUR';
  estado: EstadoDocumento;
  zonaAduanera: ZonaAduanera;
}

export type EstadoDocumento = 
  | 'en_transito'
  | 'arribado'
  | 'en_aduana'
  | 'liberado'
  | 'entregado';

// MAWB - Master Air Waybill (Aéreo)
export interface MAWB extends DocumentoMaestroBase {
  modo: 'aereo';
  prefijoIATA: string;             // 3 dígitos (ej: 230 = Avianca)
  codigoAerolinea: string;         // 2 caracteres (ej: AV)
  nombreAerolinea: string;
  numeroVuelo?: string;
  aeropuertoOrigen: string;        // IATA code (ej: MIA)
  aeropuertoDestino: string;       // IATA code (ej: PTY)
  fechaVuelo?: Date;
}

// B/L - Bill of Lading (Marítimo)
export interface BillOfLading extends DocumentoMaestroBase {
  modo: 'maritimo';
  tipoBL: 'MBL' | 'HBL';           // Master o House
  naviera: string;
  nombreBuque: string;
  numeroViaje: string;
  puertoOrigen: string;
  puertoDestino: string;
  fechaZarpe?: Date;
  fechaETA?: Date;
  contenedores: ContenedorInfo[];
  tipoServicio: 'FCL' | 'LCL';     // Full Container Load / Less than Container Load
}

export interface ContenedorInfo {
  numero: string;                  // Número de contenedor (ej: MSCU1234567)
  tipo: TipoContenedor;
  sello: string;
  pesoNeto: number;
  pesoBruto: number;
  teus: number;
}

export type TipoContenedor = 
  | '20ST'    // 20' Standard
  | '40ST'    // 40' Standard
  | '40HC'    // 40' High Cube
  | '20RF'    // 20' Refrigerado
  | '40RF'    // 40' Refrigerado
  | '20OT'    // 20' Open Top
  | '40OT'    // 40' Open Top
  | '20FR'    // 20' Flat Rack
  | '40FR';   // 40' Flat Rack

// Carta de Porte (Terrestre)
export interface CartaDePorte extends DocumentoMaestroBase {
  modo: 'terrestre';
  tipoTransporte: 'camion' | 'trailer' | 'furgon' | 'cisterna';
  placaVehiculo: string;
  placaRemolque?: string;
  nombreConductor: string;
  licenciaConductor: string;
  rutaTransporte: string;          // Descripción de la ruta
  puntoFronterizo: 'paso_canoas' | 'darien';
  paisOrigen: 'CR' | 'CO';         // Costa Rica o Colombia
  horaEstimadaLlegada?: Date;
  sellosAduaneros: string[];
}

// ============================================
// DOCUMENTO INDIVIDUAL (PAQUETE/BULTO)
// ============================================

export interface DocumentoIndividualBase {
  id: string;
  modo: ModoTransporte;
  documentoMaestroId: string;      // Referencia al documento maestro
  numeroGuia: string;              // Tracking individual
  descripcion: string;
  valorUSD: number;
  peso: number;
  unidadPeso: 'kg' | 'lb';
  cantidad: number;
  destinatario: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono?: string;
  email?: string;
  identificacion?: string;
  // Clasificación
  categoriaProducto?: string;
  categoriaAduanera?: 'A' | 'B' | 'C' | 'D';
  hsCode?: string;
  // Estado
  requiereRevision: boolean;
  alertas: string[];
}

// HAWB - House Air Waybill
export interface HAWB extends DocumentoIndividualBase {
  modo: 'aereo';
  mawbId: string;
  amazonTracking?: string;
  courierLocal?: string;
}

// HBL - House Bill of Lading
export interface HBL extends DocumentoIndividualBase {
  modo: 'maritimo';
  mblId: string;
  contenedorNumero?: string;
  marcas?: string;
  sellos?: string;
}

// Guía Terrestre Individual
export interface GuiaTerrestre extends DocumentoIndividualBase {
  modo: 'terrestre';
  cartaPorteId: string;
  bultoNumero: number;
  marcasIdentificacion?: string;
}

// ============================================
// TIPOS UNIFICADOS
// ============================================

export type DocumentoMaestro = MAWB | BillOfLading | CartaDePorte;
export type DocumentoIndividual = HAWB | HBL | GuiaTerrestre;

// ============================================
// RESULTADO DE ANÁLISIS MULTI-MODAL
// ============================================

export interface ResultadoAnalisisMultiModal {
  modoDetectado: ModoTransporte;
  confianzaDeteccion: number;
  documentoMaestro: DocumentoMaestro | null;
  documentosIndividuales: DocumentoIndividual[];
  totalBultos: number;
  valorTotalUSD: number;
  pesoTotal: number;
  zonaAduanera: ZonaAduanera;
  advertencias: string[];
  errores: string[];
}

// ============================================
// CONFIGURACIONES POR MODO
// ============================================

export const CONFIGURACIONES_MODO: Record<ModoTransporte, ConfiguracionModo> = {
  aereo: {
    id: 'aereo',
    nombre: 'Aéreo',
    nombreCompleto: 'Transporte Aéreo',
    icono: 'Plane',
    documentoMaestro: 'MAWB (Master Air Waybill)',
    documentoIndividual: 'HAWB (House Air Waybill)',
    unidadCarga: 'Paquete',
    tiempoTransitoPromedio: 3,
    zonaAduanera: 'aeropuerto_tocumen'
  },
  maritimo: {
    id: 'maritimo',
    nombre: 'Marítimo',
    nombreCompleto: 'Transporte Marítimo',
    icono: 'Ship',
    documentoMaestro: 'B/L (Bill of Lading)',
    documentoIndividual: 'HBL (House Bill of Lading)',
    unidadCarga: 'Contenedor',
    tiempoTransitoPromedio: 21,
    zonaAduanera: 'puerto_colon'
  },
  terrestre: {
    id: 'terrestre',
    nombre: 'Terrestre',
    nombreCompleto: 'Transporte Terrestre',
    icono: 'Truck',
    documentoMaestro: 'Carta de Porte',
    documentoIndividual: 'Guía Terrestre',
    unidadCarga: 'Bulto',
    tiempoTransitoPromedio: 2,
    zonaAduanera: 'frontera_paso_canoas'
  }
};

// ============================================
// ZONAS ADUANERAS DE PANAMÁ
// ============================================

export interface InfoZonaAduanera {
  id: ZonaAduanera;
  nombre: string;
  tipo: 'aeropuerto' | 'puerto' | 'frontera' | 'zona_libre';
  ciudad: string;
  provincia: string;
  codigoAduana: string;
  modosPermitidos: ModoTransporte[];
}

export const ZONAS_ADUANERAS: Record<ZonaAduanera, InfoZonaAduanera> = {
  aeropuerto_tocumen: {
    id: 'aeropuerto_tocumen',
    nombre: 'Aeropuerto Internacional de Tocumen',
    tipo: 'aeropuerto',
    ciudad: 'Ciudad de Panamá',
    provincia: 'Panamá',
    codigoAduana: 'PTYA',
    modosPermitidos: ['aereo']
  },
  aeropuerto_howard: {
    id: 'aeropuerto_howard',
    nombre: 'Aeropuerto Howard',
    tipo: 'aeropuerto',
    ciudad: 'Ciudad de Panamá',
    provincia: 'Panamá',
    codigoAduana: 'PTYH',
    modosPermitidos: ['aereo']
  },
  puerto_colon: {
    id: 'puerto_colon',
    nombre: 'Puertos de Colón (Manzanillo, CCT, Evergreen)',
    tipo: 'puerto',
    ciudad: 'Colón',
    provincia: 'Colón',
    codigoAduana: 'CLNP',
    modosPermitidos: ['maritimo']
  },
  puerto_balboa: {
    id: 'puerto_balboa',
    nombre: 'Puerto de Balboa',
    tipo: 'puerto',
    ciudad: 'Ciudad de Panamá',
    provincia: 'Panamá',
    codigoAduana: 'PTYB',
    modosPermitidos: ['maritimo']
  },
  puerto_cristobal: {
    id: 'puerto_cristobal',
    nombre: 'Puerto Cristóbal',
    tipo: 'puerto',
    ciudad: 'Colón',
    provincia: 'Colón',
    codigoAduana: 'CLNC',
    modosPermitidos: ['maritimo']
  },
  frontera_paso_canoas: {
    id: 'frontera_paso_canoas',
    nombre: 'Frontera Paso Canoas (Costa Rica)',
    tipo: 'frontera',
    ciudad: 'Paso Canoas',
    provincia: 'Chiriquí',
    codigoAduana: 'PCFR',
    modosPermitidos: ['terrestre']
  },
  frontera_darien: {
    id: 'frontera_darien',
    nombre: 'Frontera Darién (Colombia)',
    tipo: 'frontera',
    ciudad: 'Yaviza',
    provincia: 'Darién',
    codigoAduana: 'DRFR',
    modosPermitidos: ['terrestre']
  },
  zona_libre_colon: {
    id: 'zona_libre_colon',
    nombre: 'Zona Libre de Colón',
    tipo: 'zona_libre',
    ciudad: 'Colón',
    provincia: 'Colón',
    codigoAduana: 'ZLCN',
    modosPermitidos: ['aereo', 'maritimo', 'terrestre']
  },
  paso_canoas: {
    id: 'paso_canoas',
    nombre: 'Paso Canoas (Frontera CR)',
    tipo: 'frontera',
    ciudad: 'Paso Canoas',
    provincia: 'Chiriquí',
    codigoAduana: 'PCFR',
    modosPermitidos: ['terrestre']
  },
  guabito: {
    id: 'guabito',
    nombre: 'Guabito / Sixaola (Frontera CR)',
    tipo: 'frontera',
    ciudad: 'Guabito',
    provincia: 'Bocas del Toro',
    codigoAduana: 'GBFR',
    modosPermitidos: ['terrestre']
  },
  darien: {
    id: 'darien',
    nombre: 'Darién (Frontera CO)',
    tipo: 'frontera',
    ciudad: 'Yaviza',
    provincia: 'Darién',
    codigoAduana: 'DRFR',
    modosPermitidos: ['terrestre']
  },
  panama_pacifico: {
    id: 'panama_pacifico',
    nombre: 'Área Económica Especial Panamá Pacífico',
    tipo: 'zona_libre',
    ciudad: 'Ciudad de Panamá',
    provincia: 'Panamá Oeste',
    codigoAduana: 'PPAC',
    modosPermitidos: ['aereo', 'maritimo', 'terrestre']
  }
};

// ============================================
// NAVIERAS PRINCIPALES (MARÍTIMO)
// ============================================

export const NAVIERAS: Record<string, { nombre: string; codigo: string }> = {
  'MAEU': { nombre: 'Maersk', codigo: 'MAEU' },
  'MSCU': { nombre: 'MSC - Mediterranean Shipping Company', codigo: 'MSCU' },
  'CMDU': { nombre: 'CMA CGM', codigo: 'CMDU' },
  'COSU': { nombre: 'COSCO Shipping', codigo: 'COSU' },
  'EGLV': { nombre: 'Evergreen Line', codigo: 'EGLV' },
  'HLCU': { nombre: 'Hapag-Lloyd', codigo: 'HLCU' },
  'ONEY': { nombre: 'ONE - Ocean Network Express', codigo: 'ONEY' },
  'YMLU': { nombre: 'Yang Ming', codigo: 'YMLU' },
  'ZIMU': { nombre: 'ZIM', codigo: 'ZIMU' },
  'HDMU': { nombre: 'Hyundai Merchant Marine', codigo: 'HDMU' }
};

// ============================================
// TRANSPORTISTAS TERRESTRES (CENTROAMÉRICA)
// ============================================

export const TRANSPORTISTAS_TERRESTRES: Record<string, { nombre: string; pais: string }> = {
  'TRCA': { nombre: 'Transportes Centroamericanos', pais: 'PA' },
  'TMEX': { nombre: 'Transportes México-Panamá', pais: 'MX' },
  'TRCR': { nombre: 'Tica Cargo', pais: 'CR' },
  'TPAN': { nombre: 'Trans Panama Logistics', pais: 'PA' },
  'TRCO': { nombre: 'Colombia Freight', pais: 'CO' }
};
