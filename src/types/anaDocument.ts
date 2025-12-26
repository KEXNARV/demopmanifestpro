// Tipos para documentos de la Autoridad Nacional de Aduanas (ANA) de Panamá

export type TipoDocumentoANA = 'declaracion' | 'boleta' | 'manifiesto' | 'factura_comercial' | 'desconocido';

export interface IdentificadoresLogisticos {
  numeroDeclaracion: string | null;        // DE2025121838660-10
  numeroControlBoleta: string | null;      // 25127661338D
  rucImportador: string | null;            // 8-814-52
  nombreConsignatario: string | null;
  fechaDocumento: string | null;
  aduanaDestino: string | null;
  regimenAduanero: string | null;
  tipoDespacho: string | null;
}

export interface LineaArticulo {
  secuencia: number;
  fraccionArancelaria: string;             // 950300990090 (12 dígitos)
  descripcion: string;
  codigoReferencia: string | null;         // AMZPSR019357825
  cantidad: number;
  unidadMedida: string;
  pesoKg: number | null;
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  paisOrigen: string | null;
  impuestoArancel: number | null;
  impuestoITBMS: number | null;
  otrosImpuestos: number | null;
}

export interface TotalesBoleta {
  montoTotal: number;
  subtotalArancel: number;
  subtotalITBMS: number;
  subtotalOtros: number;
  moneda: string;
}

export interface TotalesDeclaracion {
  valorFOBTotal: number;
  valorFleteTotal: number;
  valorSeguroTotal: number;
  valorCIFTotal: number;
  totalImpuestos: number;
}

export interface VerificacionCruzada {
  coincide: boolean;
  montoBoleta: number;
  montoDeclaracion: number;
  diferencia: number;
  porcentajeDiferencia: number;
  alertaDiscrepancia: boolean;
}

export interface MetadatosExtraccion {
  fechaProcesamiento: string;
  confianzaExtraccion: number;  // 0-100
  camposEncontrados: number;
  camposEsperados: number;
}

export interface DatosExtraidosANA {
  tipoDocumento: TipoDocumentoANA;
  identificadores: IdentificadoresLogisticos;
  lineasArticulo: LineaArticulo[];
  totalesBoleta: TotalesBoleta | null;
  totalesDeclaracion: TotalesDeclaracion | null;
  verificacionCruzada: VerificacionCruzada | null;
  alertas: string[];
  metadatos: MetadatosExtraccion;
}

export interface DocumentoANAProcesado {
  id: string;
  nombreArchivo: string;
  archivo: File;
  fechaCarga: Date;
  estado: 'pendiente' | 'procesando' | 'completado' | 'error';
  datosExtraidos: DatosExtraidosANA | null;
  errorMensaje: string | null;
}

// Helpers para validación
export function validarFraccionArancelaria(fraccion: string): boolean {
  return /^\d{12}$/.test(fraccion?.replace(/\D/g, '') || '');
}

export function validarNumeroDeclaracion(numero: string): boolean {
  return /^DE\d{4}\d{8,12}-\d{1,3}$/.test(numero || '');
}

export function validarRUC(ruc: string): boolean {
  return /^[\d-]+$/.test(ruc || '') && ruc.length >= 5;
}

export function formatearMoneda(valor: number, moneda: string = 'B/.'): string {
  return `${moneda} ${valor.toFixed(2)}`;
}
