/**
 * Procesador de códigos GTIN (Global Trade Item Number) - Estándar GS1
 * Soporta: GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN-13), GTIN-14
 * Compatible con: Amazon, Walmart, Alibaba, y otros vendors globales
 */

export type GTINType = 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14' | 'ISBN-10' | 'ISBN-13' | 'UNKNOWN';

export interface GTINInfo {
  codigo: string;
  codigoNormalizado: string; // Siempre 14 dígitos
  tipo: GTINType;
  valido: boolean;
  digitoVerificacion: string;
  digitoVerificacionCalculado: string;
  prefijoPais?: string;
  paisOrigen?: string;
  prefijoCodificador?: string;
  codigoProducto?: string;
  indicadorEmpaque?: string; // Solo para GTIN-14
  errores: string[];
}

export interface GTINValidationResult {
  esValido: boolean;
  tipo: GTINType;
  errores: string[];
  sugerencias: string[];
}

// Prefijos GS1 por país/región
const PREFIJOS_GS1: Record<string, string> = {
  '000-019': 'Estados Unidos y Canadá',
  '020-029': 'Uso interno (tienda)',
  '030-039': 'Estados Unidos - Medicamentos',
  '040-049': 'Uso interno (tienda)',
  '050-059': 'Cupones',
  '060-099': 'Estados Unidos y Canadá',
  '100-139': 'Estados Unidos',
  '200-299': 'Uso interno (tienda)',
  '300-379': 'Francia y Mónaco',
  '380': 'Bulgaria',
  '383': 'Eslovenia',
  '385': 'Croacia',
  '387': 'Bosnia Herzegovina',
  '389': 'Montenegro',
  '400-440': 'Alemania',
  '450-459': 'Japón',
  '460-469': 'Rusia',
  '470': 'Kirguistán',
  '471': 'Taiwán',
  '474': 'Estonia',
  '475': 'Letonia',
  '476': 'Azerbaiyán',
  '477': 'Lituania',
  '478': 'Uzbekistán',
  '479': 'Sri Lanka',
  '480': 'Filipinas',
  '481': 'Bielorrusia',
  '482': 'Ucrania',
  '484': 'Moldavia',
  '485': 'Armenia',
  '486': 'Georgia',
  '487': 'Kazajistán',
  '488': 'Tayikistán',
  '489': 'Hong Kong',
  '490-499': 'Japón',
  '500-509': 'Reino Unido',
  '520-521': 'Grecia',
  '528': 'Líbano',
  '529': 'Chipre',
  '530': 'Albania',
  '531': 'Macedonia del Norte',
  '535': 'Malta',
  '539': 'Irlanda',
  '540-549': 'Bélgica y Luxemburgo',
  '560': 'Portugal',
  '569': 'Islandia',
  '570-579': 'Dinamarca, Islas Feroe, Groenlandia',
  '590': 'Polonia',
  '594': 'Rumanía',
  '599': 'Hungría',
  '600-601': 'Sudáfrica',
  '603': 'Ghana',
  '604': 'Senegal',
  '608': 'Baréin',
  '609': 'Mauricio',
  '611': 'Marruecos',
  '613': 'Argelia',
  '615': 'Nigeria',
  '616': 'Kenia',
  '618': 'Costa de Marfil',
  '619': 'Túnez',
  '620': 'Tanzania',
  '621': 'Siria',
  '622': 'Egipto',
  '623': 'Brunéi',
  '624': 'Libia',
  '625': 'Jordania',
  '626': 'Irán',
  '627': 'Kuwait',
  '628': 'Arabia Saudita',
  '629': 'Emiratos Árabes Unidos',
  '630': 'Catar',
  '631': 'Namibia',
  '640-649': 'Finlandia',
  '690-699': 'China',
  '700-709': 'Noruega',
  '729': 'Israel',
  '730-739': 'Suecia',
  '740': 'Guatemala',
  '741': 'El Salvador',
  '742': 'Honduras',
  '743': 'Nicaragua',
  '744': 'Costa Rica',
  '745': 'Panamá',
  '746': 'República Dominicana',
  '750': 'México',
  '754-755': 'Canadá',
  '759': 'Venezuela',
  '760-769': 'Suiza y Liechtenstein',
  '770-771': 'Colombia',
  '773': 'Uruguay',
  '775': 'Perú',
  '777': 'Bolivia',
  '778-779': 'Argentina',
  '780': 'Chile',
  '784': 'Paraguay',
  '786': 'Ecuador',
  '789-790': 'Brasil',
  '800-839': 'Italia, San Marino, Ciudad del Vaticano',
  '840-849': 'España y Andorra',
  '850': 'Cuba',
  '858': 'Eslovaquia',
  '859': 'República Checa',
  '860': 'Serbia',
  '865': 'Mongolia',
  '867': 'Corea del Norte',
  '868-869': 'Turquía',
  '870-879': 'Países Bajos',
  '880': 'Corea del Sur',
  '883': 'Birmania',
  '884': 'Camboya',
  '885': 'Tailandia',
  '888': 'Singapur',
  '890': 'India',
  '893': 'Vietnam',
  '896': 'Pakistán',
  '899': 'Indonesia',
  '900-919': 'Austria',
  '930-939': 'Australia',
  '940-949': 'Nueva Zelanda',
  '950': 'GS1 Global Office',
  '951': 'GS1 Global Office (numeración especial)',
  '955': 'Malasia',
  '958': 'Macao',
  '960-969': 'GS1 Global Office (GTIN-8)',
  '977': 'Publicaciones seriadas (ISSN)',
  '978-979': 'Libros (ISBN)',
  '980': 'Recibos de reembolso',
  '981-984': 'Cupones con código monetario común',
  '990-999': 'Cupones'
};

/**
 * Calcula el dígito de verificación usando el algoritmo GS1
 */
export function calcularDigitoVerificacion(codigo: string): string {
  // Asegurar que tenemos 13 dígitos (sin el dígito de verificación)
  const digitos = codigo.replace(/\D/g, '').padStart(13, '0').slice(0, 13);
  
  let suma = 0;
  for (let i = 0; i < 13; i++) {
    const digito = parseInt(digitos[i], 10);
    // Posiciones impares (1, 3, 5...) se multiplican por 1, pares por 3
    suma += digito * (i % 2 === 0 ? 1 : 3);
  }
  
  const resto = suma % 10;
  return resto === 0 ? '0' : String(10 - resto);
}

/**
 * Detecta el tipo de código GTIN
 */
export function detectarTipoGTIN(codigo: string): GTINType {
  const limpio = codigo.replace(/\D/g, '');
  const longitud = limpio.length;
  
  // ISBN-10 tiene 10 dígitos y puede tener X al final
  if (longitud === 10) {
    // Verificar si podría ser ISBN-10
    if (codigo.match(/^\d{9}[\dX]$/i)) {
      return 'ISBN-10';
    }
  }
  
  switch (longitud) {
    case 8:
      return 'GTIN-8';
    case 12:
      return 'GTIN-12'; // UPC-A
    case 13:
      // Verificar si es ISBN-13
      if (limpio.startsWith('978') || limpio.startsWith('979')) {
        return 'ISBN-13';
      }
      return 'GTIN-13'; // EAN-13
    case 14:
      return 'GTIN-14';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Normaliza un código GTIN a 14 dígitos
 */
export function normalizarGTIN(codigo: string): string {
  const limpio = codigo.replace(/\D/g, '');
  return limpio.padStart(14, '0');
}

/**
 * Obtiene el país de origen basado en el prefijo GS1
 */
export function obtenerPaisOrigen(codigo: string): { prefijo: string; pais: string } | null {
  const normalizado = normalizarGTIN(codigo);
  // Los primeros 3 dígitos después del indicador de empaque (posición 1-3 en GTIN-14)
  const prefijo3 = normalizado.substring(1, 4);
  const prefijo2 = normalizado.substring(1, 3);
  
  for (const [rango, pais] of Object.entries(PREFIJOS_GS1)) {
    if (rango.includes('-')) {
      const [inicio, fin] = rango.split('-');
      const prefijoNum = parseInt(prefijo3.substring(0, inicio.length), 10);
      if (prefijoNum >= parseInt(inicio, 10) && prefijoNum <= parseInt(fin, 10)) {
        return { prefijo: prefijo3.substring(0, inicio.length), pais };
      }
    } else if (prefijo3.startsWith(rango) || prefijo2.startsWith(rango)) {
      return { prefijo: rango, pais };
    }
  }
  
  return null;
}

/**
 * Valida un código GTIN completo
 */
export function validarGTIN(codigo: string): GTINValidationResult {
  const errores: string[] = [];
  const sugerencias: string[] = [];
  
  if (!codigo || codigo.trim() === '') {
    return {
      esValido: false,
      tipo: 'UNKNOWN',
      errores: ['El código está vacío'],
      sugerencias: ['Ingrese un código GTIN válido']
    };
  }
  
  const limpio = codigo.replace(/\D/g, '');
  const tipo = detectarTipoGTIN(codigo);
  
  if (tipo === 'UNKNOWN') {
    errores.push(`Longitud inválida: ${limpio.length} dígitos`);
    sugerencias.push('Los códigos GTIN válidos tienen 8, 12, 13 o 14 dígitos');
    return { esValido: false, tipo, errores, sugerencias };
  }
  
  // Verificar que solo contenga dígitos
  if (!/^\d+$/.test(limpio)) {
    errores.push('El código contiene caracteres no numéricos');
    sugerencias.push('Use solo dígitos numéricos');
  }
  
  // Validar dígito de verificación
  const sinDigitoVerif = limpio.slice(0, -1);
  const digitoVerifActual = limpio.slice(-1);
  const digitoVerifCalculado = calcularDigitoVerificacion(sinDigitoVerif.padStart(13, '0'));
  
  if (digitoVerifActual !== digitoVerifCalculado) {
    errores.push(`Dígito de verificación inválido: esperado ${digitoVerifCalculado}, recibido ${digitoVerifActual}`);
    sugerencias.push(`Verifique el código o use ${sinDigitoVerif}${digitoVerifCalculado}`);
  }
  
  return {
    esValido: errores.length === 0,
    tipo,
    errores,
    sugerencias
  };
}

/**
 * Procesa y extrae toda la información de un código GTIN
 */
export function procesarGTIN(codigo: string): GTINInfo {
  const limpio = codigo.replace(/\D/g, '');
  const tipo = detectarTipoGTIN(codigo);
  const normalizado = normalizarGTIN(codigo);
  const validacion = validarGTIN(codigo);
  const paisInfo = obtenerPaisOrigen(codigo);
  
  const sinDigitoVerif = limpio.slice(0, -1);
  const digitoVerifActual = limpio.slice(-1);
  const digitoVerifCalculado = calcularDigitoVerificacion(sinDigitoVerif.padStart(13, '0'));
  
  const info: GTINInfo = {
    codigo: codigo,
    codigoNormalizado: normalizado,
    tipo,
    valido: validacion.esValido,
    digitoVerificacion: digitoVerifActual,
    digitoVerificacionCalculado: digitoVerifCalculado,
    errores: validacion.errores
  };
  
  if (paisInfo) {
    info.prefijoPais = paisInfo.prefijo;
    info.paisOrigen = paisInfo.pais;
  }
  
  // Extraer componentes según el tipo
  if (tipo === 'GTIN-14') {
    info.indicadorEmpaque = normalizado[0];
    info.prefijoCodificador = normalizado.substring(1, 8);
    info.codigoProducto = normalizado.substring(8, 13);
  } else if (tipo === 'GTIN-13' || tipo === 'ISBN-13') {
    info.prefijoCodificador = normalizado.substring(1, 8);
    info.codigoProducto = normalizado.substring(8, 13);
  } else if (tipo === 'GTIN-12') {
    info.prefijoCodificador = normalizado.substring(2, 8);
    info.codigoProducto = normalizado.substring(8, 13);
  } else if (tipo === 'GTIN-8') {
    info.prefijoCodificador = normalizado.substring(6, 10);
    info.codigoProducto = normalizado.substring(10, 13);
  }
  
  return info;
}

/**
 * Extrae códigos GTIN de un texto (descripción de producto)
 */
export function extraerGTINsDeTexto(texto: string): GTINInfo[] {
  if (!texto) return [];
  
  // Patrones para detectar códigos GTIN
  const patrones = [
    /\b\d{14}\b/g,  // GTIN-14
    /\b\d{13}\b/g,  // GTIN-13/EAN
    /\b\d{12}\b/g,  // GTIN-12/UPC
    /\b\d{8}\b/g,   // GTIN-8
    /\bGTIN[:\s]*(\d{8,14})\b/gi,
    /\bEAN[:\s]*(\d{13})\b/gi,
    /\bUPC[:\s]*(\d{12})\b/gi,
    /\bASIN[:\s]*([A-Z0-9]{10})\b/gi, // Amazon ASIN (no es GTIN pero lo detectamos)
  ];
  
  const codigosEncontrados = new Set<string>();
  
  for (const patron of patrones) {
    const matches = texto.matchAll(patron);
    for (const match of matches) {
      // Tomar el grupo capturado si existe, sino el match completo
      const codigo = match[1] || match[0];
      if (/^\d{8,14}$/.test(codigo)) {
        codigosEncontrados.add(codigo);
      }
    }
  }
  
  return Array.from(codigosEncontrados)
    .map(codigo => procesarGTIN(codigo))
    .filter(info => info.tipo !== 'UNKNOWN');
}

/**
 * Convierte entre formatos de GTIN
 */
export function convertirGTIN(codigo: string, formatoDestino: 'GTIN-14' | 'GTIN-13' | 'GTIN-12'): string | null {
  const info = procesarGTIN(codigo);
  
  if (!info.valido) return null;
  
  const normalizado = info.codigoNormalizado;
  
  switch (formatoDestino) {
    case 'GTIN-14':
      return normalizado;
    case 'GTIN-13':
      // Solo si el indicador de empaque es 0
      if (normalizado[0] === '0') {
        return normalizado.substring(1);
      }
      return null;
    case 'GTIN-12':
      // Solo si empieza con 00
      if (normalizado.substring(0, 2) === '00') {
        return normalizado.substring(2);
      }
      return null;
    default:
      return null;
  }
}

/**
 * Genera un reporte de análisis GTIN para un conjunto de productos
 */
export interface GTINAnalysisReport {
  totalCodigos: number;
  codigosValidos: number;
  codigosInvalidos: number;
  porTipo: Record<GTINType, number>;
  porPais: Record<string, number>;
  erroresComunes: Record<string, number>;
  codigosConErrores: GTINInfo[];
}

export function analizarCodigosGTIN(codigos: string[]): GTINAnalysisReport {
  const infos = codigos.map(c => procesarGTIN(c));
  
  const porTipo: Record<GTINType, number> = {
    'GTIN-8': 0,
    'GTIN-12': 0,
    'GTIN-13': 0,
    'GTIN-14': 0,
    'ISBN-10': 0,
    'ISBN-13': 0,
    'UNKNOWN': 0
  };
  
  const porPais: Record<string, number> = {};
  const erroresComunes: Record<string, number> = {};
  const codigosConErrores: GTINInfo[] = [];
  
  for (const info of infos) {
    porTipo[info.tipo]++;
    
    if (info.paisOrigen) {
      porPais[info.paisOrigen] = (porPais[info.paisOrigen] || 0) + 1;
    }
    
    if (!info.valido) {
      codigosConErrores.push(info);
      for (const error of info.errores) {
        erroresComunes[error] = (erroresComunes[error] || 0) + 1;
      }
    }
  }
  
  return {
    totalCodigos: codigos.length,
    codigosValidos: infos.filter(i => i.valido).length,
    codigosInvalidos: infos.filter(i => !i.valido).length,
    porTipo,
    porPais,
    erroresComunes,
    codigosConErrores
  };
}
