// Base de datos geográfica completa de Panamá

export interface Provincia {
  id: number;
  nombre: string;
  codigo: string;
  region: string;
  alias: string[];
}

export interface Ciudad {
  nombre: string;
  provincia: string;
  tipo: 'Ciudad Capital' | 'Ciudad' | 'Pueblo' | 'Urbanización' | 'Isla';
  region: string;
  caracteristicas: string[];
  altitud?: string;
  alias: string[];
}

export interface UbicacionDetectada {
  provincia: string | null;
  ciudad: string | null;
  region: string | null;
  confianza: number;
  provinciaData?: Provincia;
  ciudadData?: Ciudad;
}

// 1. PROVINCIAS DE PANAMÁ (10 Divisiones Administrativas)
export const PROVINCIAS_PANAMA: Provincia[] = [
  { id: 1, nombre: 'Bocas del Toro', codigo: 'BOC', region: 'Caribe', alias: ['Bocas', 'Bocas del Toro', 'BOC', 'Bocas-Toro', 'Bocas Toro'] },
  { id: 2, nombre: 'Coclé', codigo: 'COC', region: 'Central', alias: ['Cocle', 'Coclé', 'COC'] },
  { id: 3, nombre: 'Colón', codigo: 'COL', region: 'Caribe', alias: ['Colon', 'Colón', 'COL'] },
  { id: 4, nombre: 'Chiriquí', codigo: 'CHI', region: 'Occidental', alias: ['Chiriqui', 'Chiriquí', 'CHI'] },
  { id: 5, nombre: 'Darién', codigo: 'DAR', region: 'Oriental', alias: ['Darien', 'Darién', 'DAR'] },
  { id: 6, nombre: 'Herrera', codigo: 'HER', region: 'Azuero', alias: ['Herrera', 'HER'] },
  { id: 7, nombre: 'Los Santos', codigo: 'LST', region: 'Azuero', alias: ['Los Santos', 'Santos', 'LST', 'L.Santos', 'L Santos'] },
  { id: 8, nombre: 'Panamá', codigo: 'PAN', region: 'Metropolitana', alias: ['Panama', 'Panamá', 'PAN', 'PTY'] },
  { id: 9, nombre: 'Veraguas', codigo: 'VER', region: 'Central', alias: ['Veraguas', 'VER'] },
  { id: 10, nombre: 'Panamá Oeste', codigo: 'POE', region: 'Metropolitana', alias: ['Panama Oeste', 'Panamá Oeste', 'POE', 'Oeste', 'Pma Oeste'] }
];

// 2. CIUDADES Y PUEBLOS POR REGIÓN
export const CIUDADES_PANAMA: Ciudad[] = [
  // TIERRAS ALTAS Y MONTAÑAS
  { nombre: 'Boquete', provincia: 'Chiriquí', tipo: 'Ciudad', region: 'Montañas', caracteristicas: ['Clima fresco', 'Café', 'Turismo'], altitud: '1,200 msnm', alias: ['Boquete', 'Boquette'] },
  { nombre: 'Volcán', provincia: 'Chiriquí', tipo: 'Pueblo', region: 'Montañas', caracteristicas: ['Clima fresco', 'Agricultura', 'Volcán Barú'], altitud: '1,450 msnm', alias: ['Volcán', 'Volcan'] },
  { nombre: 'Cerro Punta', provincia: 'Chiriquí', tipo: 'Pueblo', region: 'Montañas', caracteristicas: ['Clima fresco', 'Agricultura', 'Flores'], altitud: '1,800 msnm', alias: ['Cerro Punta', 'Cerropunta'] },
  { nombre: 'El Valle de Antón', provincia: 'Coclé', tipo: 'Pueblo', region: 'Montañas', caracteristicas: ['Clima fresco', 'Cráter volcánico', 'Turismo'], altitud: '600 msnm', alias: ['El Valle', 'Valle de Antón', 'El Valle de Anton', 'Valle Anton'] },
  { nombre: 'Altos del María', provincia: 'Panamá Oeste', tipo: 'Urbanización', region: 'Montañas', caracteristicas: ['Clima fresco', 'Residencial'], altitud: '800 msnm', alias: ['Altos del María', 'Altos del Maria', 'Altos Maria'] },

  // PLAYAS DEL PACÍFICO
  { nombre: 'Coronado', provincia: 'Panamá Oeste', tipo: 'Urbanización', region: 'Playas Pacífico', caracteristicas: ['Playa', 'Resort', 'Golf'], alias: ['Coronado', 'Playa Coronado'] },
  { nombre: 'Gorgona', provincia: 'Panamá Oeste', tipo: 'Pueblo', region: 'Playas Pacífico', caracteristicas: ['Playa', 'Surf'], alias: ['Gorgona', 'Playa Gorgona'] },
  { nombre: 'Punta Barco', provincia: 'Panamá Oeste', tipo: 'Urbanización', region: 'Playas Pacífico', caracteristicas: ['Playa', 'Resort', 'Marina'], alias: ['Punta Barco', 'PuntaBarco'] },
  { nombre: 'San Carlos', provincia: 'Panamá Oeste', tipo: 'Pueblo', region: 'Playas Pacífico', caracteristicas: ['Playa', 'Surf', 'Rural'], alias: ['San Carlos', 'SanCarlos'] },
  { nombre: 'Santa Catalina', provincia: 'Veraguas', tipo: 'Pueblo', region: 'Playas Pacífico', caracteristicas: ['Surf', 'Isla Coiba', 'Buceo'], alias: ['Santa Catalina', 'Sta. Catalina', 'SantaCatalina'] },
  { nombre: 'Isla Taboga', provincia: 'Panamá', tipo: 'Isla', region: 'Playas Pacífico', caracteristicas: ['Playa', 'Isla', 'Turismo'], alias: ['Taboga', 'Isla Taboga'] },

  // CARIBE Y ARCHIPIÉLAGOS
  { nombre: 'Isla Colón', provincia: 'Bocas del Toro', tipo: 'Isla', region: 'Caribe', caracteristicas: ['Playa caribeña', 'Turismo', 'Buceo'], alias: ['Isla Colón', 'Isla Colon', 'Bocas Town'] },
  { nombre: 'Red Frog / Bastimentos', provincia: 'Bocas del Toro', tipo: 'Isla', region: 'Caribe', caracteristicas: ['Playa caribeña', 'Eco-turismo', 'Rana roja'], alias: ['Red Frog', 'Bastimentos', 'Isla Bastimentos', 'RedFrog'] },
  { nombre: 'Isla Grande', provincia: 'Colón', tipo: 'Isla', region: 'Caribe', caracteristicas: ['Playa caribeña', 'Cultura afro'], alias: ['Isla Grande', 'IslaGrande'] },
  { nombre: 'Portobelo', provincia: 'Colón', tipo: 'Pueblo', region: 'Caribe', caracteristicas: ['Historia', 'UNESCO', 'Fortalezas'], alias: ['Portobelo', 'Porto Belo', 'Portovelo'] },
  { nombre: 'Changuinola', provincia: 'Bocas del Toro', tipo: 'Ciudad', region: 'Caribe', caracteristicas: ['Banana', 'Comercio', 'Frontera'], alias: ['Changuinola', 'Changoinola'] },
  { nombre: 'Almirante', provincia: 'Bocas del Toro', tipo: 'Pueblo', region: 'Caribe', caracteristicas: ['Puerto', 'Ferry', 'Comercio'], alias: ['Almirante'] },
  { nombre: 'Ciudad de Colón', provincia: 'Colón', tipo: 'Ciudad', region: 'Caribe', caracteristicas: ['Puerto', 'Zona Libre', 'Canal'], alias: ['Colón', 'Colon', 'Ciudad Colón', 'Ciudad de Colón'] },

  // PENÍNSULA DE AZUERO
  { nombre: 'Chitré', provincia: 'Herrera', tipo: 'Ciudad', region: 'Azuero', caracteristicas: ['Capital provincial', 'Comercio', 'Folclore'], alias: ['Chitré', 'Chitre'] },
  { nombre: 'Las Tablas', provincia: 'Los Santos', tipo: 'Ciudad', region: 'Azuero', caracteristicas: ['Capital provincial', 'Carnaval', 'Pollera'], alias: ['Las Tablas', 'Tablas'] },
  { nombre: 'Pedasí', provincia: 'Los Santos', tipo: 'Pueblo', region: 'Azuero', caracteristicas: ['Playa', 'Turismo', 'Pesca'], alias: ['Pedasí', 'Pedasi'] },
  { nombre: 'La Villa de Los Santos', provincia: 'Los Santos', tipo: 'Ciudad', region: 'Azuero', caracteristicas: ['Historia', 'Grito de Independencia', 'Folclore'], alias: ['La Villa', 'Villa de Los Santos', 'Los Santos Villa'] },
  { nombre: 'Guararé', provincia: 'Los Santos', tipo: 'Pueblo', region: 'Azuero', caracteristicas: ['Mejorana', 'Folclore', 'Festival'], alias: ['Guararé', 'Guarare'] },
  { nombre: 'Parita', provincia: 'Herrera', tipo: 'Pueblo', region: 'Azuero', caracteristicas: ['Historia', 'Artesanías', 'Tradición'], alias: ['Parita'] },
  { nombre: 'Ocú', provincia: 'Herrera', tipo: 'Pueblo', region: 'Azuero', caracteristicas: ['Agricultura', 'Tradición'], alias: ['Ocú', 'Ocu'] },

  // ÁREA METROPOLITANA
  { nombre: 'Ciudad de Panamá', provincia: 'Panamá', tipo: 'Ciudad Capital', region: 'Metropolitana', caracteristicas: ['Capital', 'Centro financiero', 'Cosmopolita'], alias: ['Ciudad de Panamá', 'Ciudad Panamá', 'Panamá City', 'PTY', 'Panama City', 'Ciudad Panama'] },
  { nombre: 'San Miguelito', provincia: 'Panamá', tipo: 'Ciudad', region: 'Metropolitana', caracteristicas: ['Residencial', 'Comercio', 'Población alta'], alias: ['San Miguelito', 'SanMiguelito'] },
  { nombre: 'La Chorrera', provincia: 'Panamá Oeste', tipo: 'Ciudad', region: 'Metropolitana', caracteristicas: ['Capital provincial', 'Comercio', 'Industria'], alias: ['La Chorrera', 'Chorrera'] },
  { nombre: 'Arraiján', provincia: 'Panamá Oeste', tipo: 'Ciudad', region: 'Metropolitana', caracteristicas: ['Residencial', 'Crecimiento urbano'], alias: ['Arraiján', 'Arraijan'] },
  { nombre: 'Capira', provincia: 'Panamá Oeste', tipo: 'Pueblo', region: 'Metropolitana', caracteristicas: ['Rural', 'Agricultura'], alias: ['Capira'] },
  { nombre: 'Chepo', provincia: 'Panamá', tipo: 'Ciudad', region: 'Metropolitana', caracteristicas: ['Agricultura', 'Ganadería', 'Puerta al Darién'], alias: ['Chepo'] },

  // INTERIOR Y OCCIDENTE
  { nombre: 'David', provincia: 'Chiriquí', tipo: 'Ciudad', region: 'Occidental', caracteristicas: ['Capital provincial', 'Segunda ciudad', 'Comercio'], alias: ['David'] },
  { nombre: 'Santiago', provincia: 'Veraguas', tipo: 'Ciudad', region: 'Central', caracteristicas: ['Capital provincial', 'Comercio', 'Carnaval'], alias: ['Santiago', 'Santiago de Veraguas'] },
  { nombre: 'Penonomé', provincia: 'Coclé', tipo: 'Ciudad', region: 'Central', caracteristicas: ['Capital provincial', 'Historia', 'Comercio'], alias: ['Penonomé', 'Penonome'] },
  { nombre: 'Aguadulce', provincia: 'Coclé', tipo: 'Ciudad', region: 'Central', caracteristicas: ['Sal', 'Agricultura', 'Playa'], alias: ['Aguadulce', 'Agua Dulce'] },
  { nombre: 'Natá de los Caballeros', provincia: 'Coclé', tipo: 'Pueblo', region: 'Central', caracteristicas: ['Historia', 'Primera ciudad continental', 'Colonial'], alias: ['Natá', 'Nata', 'Natá de los Caballeros'] },
  { nombre: 'Puerto Armuelles', provincia: 'Chiriquí', tipo: 'Ciudad', region: 'Occidental', caracteristicas: ['Puerto', 'Banana', 'Playa'], alias: ['Puerto Armuelles', 'Pto. Armuelles', 'Armuelles'] },
  { nombre: 'Soná', provincia: 'Veraguas', tipo: 'Pueblo', region: 'Central', caracteristicas: ['Agricultura', 'Rural'], alias: ['Soná', 'Sona'] },

  // DARIÉN
  { nombre: 'La Palma', provincia: 'Darién', tipo: 'Ciudad', region: 'Oriental', caracteristicas: ['Capital provincial', 'Selva', 'Frontera'], alias: ['La Palma', 'Palma'] },
  { nombre: 'Metetí', provincia: 'Darién', tipo: 'Pueblo', region: 'Oriental', caracteristicas: ['Frontera', 'Fin de carretera', 'Comercio'], alias: ['Metetí', 'Meteti'] }
];

// Correcciones comunes de errores de escritura
const CORRECCIONES_COMUNES: Record<string, string> = {
  'bocas toro': 'Bocas del Toro',
  'panama city': 'Ciudad de Panamá',
  'los santo': 'Los Santos',
  'chitre': 'Chitré',
  'pedasi': 'Pedasí',
  'chiriqui': 'Chiriquí',
  'colon': 'Colón',
  'cocle': 'Coclé',
  'darien': 'Darién',
  'penonome': 'Penonomé',
  'guarare': 'Guararé',
  'ocu': 'Ocú',
  'sona': 'Soná',
  'volcan': 'Volcán',
  'meteti': 'Metetí'
};

// Función para normalizar texto (eliminar acentos y caracteres especiales)
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Detectar provincia desde texto
export function detectarProvincia(texto: string): { provincia: Provincia | null; matchExacto: boolean } {
  const textoNormalizado = normalizarTexto(texto);
  
  for (const provincia of PROVINCIAS_PANAMA) {
    // Buscar match exacto con nombre
    if (normalizarTexto(provincia.nombre) === textoNormalizado || 
        textoNormalizado.includes(normalizarTexto(provincia.nombre))) {
      return { provincia, matchExacto: true };
    }
    
    // Buscar en alias
    for (const alias of provincia.alias) {
      const aliasNorm = normalizarTexto(alias);
      if (textoNormalizado.includes(aliasNorm) || aliasNorm === textoNormalizado) {
        return { provincia, matchExacto: alias.toLowerCase() === provincia.nombre.toLowerCase() };
      }
    }
  }
  
  return { provincia: null, matchExacto: false };
}

// Detectar ciudad desde texto
export function detectarCiudad(texto: string, provinciaHint?: string): { ciudad: Ciudad | null; matchExacto: boolean } {
  const textoNormalizado = normalizarTexto(texto);
  
  // Filtrar ciudades por provincia si se proporciona hint
  const ciudadesABuscar = provinciaHint 
    ? CIUDADES_PANAMA.filter(c => normalizarTexto(c.provincia).includes(normalizarTexto(provinciaHint)))
    : CIUDADES_PANAMA;
  
  // Primero buscar en ciudades filtradas, luego en todas
  const listasABuscar = provinciaHint ? [ciudadesABuscar, CIUDADES_PANAMA] : [CIUDADES_PANAMA];
  
  for (const lista of listasABuscar) {
    for (const ciudad of lista) {
      // Buscar match exacto con nombre
      if (textoNormalizado.includes(normalizarTexto(ciudad.nombre))) {
        return { ciudad, matchExacto: true };
      }
      
      // Buscar en alias
      for (const alias of ciudad.alias) {
        const aliasNorm = normalizarTexto(alias);
        if (textoNormalizado.includes(aliasNorm)) {
          return { ciudad, matchExacto: alias.toLowerCase() === ciudad.nombre.toLowerCase() };
        }
      }
    }
  }
  
  return { ciudad: null, matchExacto: false };
}

// Calcular confianza de detección
function calcularConfianza(
  provinciaResult: { provincia: Provincia | null; matchExacto: boolean },
  ciudadResult: { ciudad: Ciudad | null; matchExacto: boolean }
): number {
  let score = 0;
  
  if (provinciaResult.provincia) {
    score += provinciaResult.matchExacto ? 50 : 30;
  }
  
  if (ciudadResult.ciudad) {
    score += ciudadResult.matchExacto ? 40 : 20;
  }
  
  // Bonus por coherencia (ciudad pertenece a provincia detectada)
  if (provinciaResult.provincia && ciudadResult.ciudad) {
    if (ciudadResult.ciudad.provincia === provinciaResult.provincia.nombre) {
      score += 10;
    }
  }
  
  return Math.min(score, 100);
}

// Función principal de detección de ubicación
export function detectarUbicacion(direccionCompleta: string): UbicacionDetectada {
  if (!direccionCompleta || direccionCompleta.trim() === '') {
    return {
      provincia: null,
      ciudad: null,
      region: null,
      confianza: 0
    };
  }

  // Aplicar correcciones comunes primero
  let textoCorregido = direccionCompleta;
  for (const [error, correccion] of Object.entries(CORRECCIONES_COMUNES)) {
    const regex = new RegExp(error, 'gi');
    textoCorregido = textoCorregido.replace(regex, correccion);
  }

  // Detectar provincia
  const provinciaResult = detectarProvincia(textoCorregido);
  
  // Detectar ciudad (con hint de provincia si existe)
  const ciudadResult = detectarCiudad(
    textoCorregido, 
    provinciaResult.provincia?.nombre
  );
  
  // Si encontramos ciudad pero no provincia, inferir provincia de la ciudad
  let provinciaFinal = provinciaResult.provincia;
  if (!provinciaFinal && ciudadResult.ciudad) {
    provinciaFinal = PROVINCIAS_PANAMA.find(p => p.nombre === ciudadResult.ciudad?.provincia) || null;
  }
  
  // Determinar región
  let region: string | null = null;
  if (ciudadResult.ciudad) {
    region = ciudadResult.ciudad.region;
  } else if (provinciaFinal) {
    region = provinciaFinal.region;
  }
  
  const confianza = calcularConfianza(provinciaResult, ciudadResult);
  
  return {
    provincia: provinciaFinal?.nombre || null,
    ciudad: ciudadResult.ciudad?.nombre || null,
    region,
    confianza,
    provinciaData: provinciaFinal || undefined,
    ciudadData: ciudadResult.ciudad || undefined
  };
}

// Validar coherencia entre provincia y ciudad
export function validarCoherencia(provincia: string, ciudad: string): { valido: boolean; mensaje?: string; sugerencia?: string } {
  const ciudadData = CIUDADES_PANAMA.find(c => 
    normalizarTexto(c.nombre) === normalizarTexto(ciudad) ||
    c.alias.some(a => normalizarTexto(a) === normalizarTexto(ciudad))
  );
  
  if (ciudadData && normalizarTexto(ciudadData.provincia) !== normalizarTexto(provincia)) {
    return {
      valido: false,
      mensaje: `${ciudad} no pertenece a ${provincia}. Pertenece a ${ciudadData.provincia}`,
      sugerencia: ciudadData.provincia
    };
  }
  
  return { valido: true };
}

// Obtener ciudades de una provincia
export function getCiudadesPorProvincia(provincia: string): Ciudad[] {
  return CIUDADES_PANAMA.filter(c => 
    normalizarTexto(c.provincia) === normalizarTexto(provincia)
  );
}

// Obtener provincias por región
export function getProvinciasPorRegion(region: string): Provincia[] {
  return PROVINCIAS_PANAMA.filter(p => 
    normalizarTexto(p.region) === normalizarTexto(region)
  );
}

// Obtener todas las regiones únicas
export function getRegiones(): string[] {
  return [...new Set(PROVINCIAS_PANAMA.map(p => p.region))];
}

// Iconos para tipos de región
export const ICONOS_REGION: Record<string, string> = {
  'Metropolitana': '🏙️',
  'Montañas': '🏔️',
  'Playas Pacífico': '🏖️',
  'Caribe': '🌴',
  'Azuero': '🎭',
  'Central': '🌾',
  'Occidental': '🌄',
  'Oriental': '🌳'
};

// Colores para provincias (para gráficos)
export const COLORES_PROVINCIA: Record<string, string> = {
  'Panamá': 'hsl(0, 70%, 50%)',
  'Chiriquí': 'hsl(30, 70%, 50%)',
  'Colón': 'hsl(60, 70%, 50%)',
  'Panamá Oeste': 'hsl(120, 70%, 50%)',
  'Coclé': 'hsl(180, 70%, 50%)',
  'Veraguas': 'hsl(210, 70%, 50%)',
  'Los Santos': 'hsl(240, 70%, 50%)',
  'Herrera': 'hsl(270, 70%, 50%)',
  'Bocas del Toro': 'hsl(300, 70%, 50%)',
  'Darién': 'hsl(330, 70%, 50%)'
};
