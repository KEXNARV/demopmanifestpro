// Base de datos de Corregimientos de Panamá por Provincia
// Estructura jerárquica: Provincia -> Distrito -> Corregimientos

export interface Corregimiento {
  nombre: string;
  distrito: string;
  alias: string[];
}

export interface DistritoPanama {
  nombre: string;
  provincia: string;
  corregimientos: string[];
}

// Distritos y corregimientos principales de Panamá
export const DISTRITOS_PANAMA: DistritoPanama[] = [
  // PANAMÁ
  {
    nombre: 'Panamá',
    provincia: 'Panamá',
    corregimientos: [
      'Ancón', 'Bella Vista', 'Bethania', 'Calidonia', 'Curundú', 
      'El Chorrillo', 'Juan Díaz', 'Parque Lefevre', 'Pedregal', 
      'Pueblo Nuevo', 'Río Abajo', 'San Felipe', 'San Francisco', 
      'Santa Ana', '24 de Diciembre', 'Don Bosco', 'Las Cumbres', 
      'Las Mañanitas', 'Pacora', 'San Martín', 'Tocumen'
    ]
  },
  {
    nombre: 'San Miguelito',
    provincia: 'Panamá',
    corregimientos: [
      'Amelia Denis de Icaza', 'Belisario Porras', 'José Domingo Espinar',
      'Mateo Iturralde', 'Omar Torrijos', 'Rufina Alfaro', 'Victoriano Lorenzo',
      'Arnulfo Arias', 'Belisario Frías'
    ]
  },
  {
    nombre: 'Chepo',
    provincia: 'Panamá',
    corregimientos: [
      'Chepo', 'Cañita', 'El Llano', 'Las Margaritas', 'Santa Cruz de Chinina',
      'Tortí'
    ]
  },
  {
    nombre: 'Chimán',
    provincia: 'Panamá',
    corregimientos: ['Chimán', 'Brujas', 'Gonzalo Vásquez']
  },
  {
    nombre: 'Taboga',
    provincia: 'Panamá',
    corregimientos: ['Taboga', 'Otoque Occidente', 'Otoque Oriente']
  },

  // PANAMÁ OESTE
  {
    nombre: 'Arraiján',
    provincia: 'Panamá Oeste',
    corregimientos: [
      'Arraiján', 'Burunga', 'Cerro Silvestre', 'Juan Demóstenes Arosemena',
      'Nuevo Emperador', 'Santa Clara', 'Veracruz', 'Vista Alegre'
    ]
  },
  {
    nombre: 'La Chorrera',
    provincia: 'Panamá Oeste',
    corregimientos: [
      'Barrio Balboa', 'Barrio Colón', 'El Arado', 'El Coco', 'Feuillet',
      'Guadalupe', 'Herrera', 'Hurtado', 'Iturralde', 'La Represa',
      'Los Díaz', 'Mendoza', 'Obaldía', 'Playa Leona', 'Puerto Caimito',
      'Santa Rita'
    ]
  },
  {
    nombre: 'Capira',
    provincia: 'Panamá Oeste',
    corregimientos: [
      'Capira', 'Campana', 'Cermeño', 'Cirí de Los Sotos', 'Cirí Grande',
      'El Cacao', 'La Trinidad', 'Las Ollas Arriba', 'Lidice', 'Santa Rosa',
      'Villa Carmen', 'Villa Rosario'
    ]
  },
  {
    nombre: 'Chame',
    provincia: 'Panamá Oeste',
    corregimientos: [
      'Chame', 'Bejuco', 'Buenos Aires', 'Camarón', 'Chicá', 
      'El Líbano', 'Las Lajas', 'Nueva Gorgona', 'Punta Chame', 'Sajalices',
      'Sorá'
    ]
  },
  {
    nombre: 'San Carlos',
    provincia: 'Panamá Oeste',
    corregimientos: [
      'San Carlos', 'El Espino', 'El Higo', 'Guayabito', 'La Ermita',
      'Las Uvas', 'San José'
    ]
  },

  // COLÓN
  {
    nombre: 'Colón',
    provincia: 'Colón',
    corregimientos: [
      'Barrio Norte', 'Barrio Sur', 'Buena Vista', 'Cativá', 'Ciricito',
      'Cristóbal', 'Limón', 'Nueva Providencia', 'Puerto Pilón', 
      'Sabanitas', 'Salamanca', 'San Juan', 'Santa Rosa'
    ]
  },
  {
    nombre: 'Portobelo',
    provincia: 'Colón',
    corregimientos: [
      'Portobelo', 'Cacique', 'Garrote', 'Isla Grande', 'María Chiquita'
    ]
  },

  // CHIRIQUÍ
  {
    nombre: 'David',
    provincia: 'Chiriquí',
    corregimientos: [
      'David', 'Bijagual', 'Chiriquí', 'Cochea', 'Guacá', 'Las Lomas',
      'Pedregal', 'San Carlos', 'San Cristóbal', 'San Pablo Nuevo', 
      'San Pablo Viejo'
    ]
  },
  {
    nombre: 'Boquete',
    provincia: 'Chiriquí',
    corregimientos: [
      'Bajo Boquete', 'Alto Boquete', 'Caldera', 'Jaramillo', 
      'Los Naranjos', 'Palmira'
    ]
  },
  {
    nombre: 'Bugaba',
    provincia: 'Chiriquí',
    corregimientos: [
      'La Concepción', 'Aserrío de Gariché', 'Bugaba', 'Cerro Punta',
      'El Bongo', 'Gómez', 'La Estrella', 'San Andrés', 'Santa Marta',
      'Santa Rosa', 'Santo Domingo', 'Sortová', 'Volcán'
    ]
  },

  // COCLÉ
  {
    nombre: 'Penonomé',
    provincia: 'Coclé',
    corregimientos: [
      'Penonomé', 'Cañaveral', 'Coclé', 'El Cristo', 'El Coco', 
      'Las Minas', 'Pajonal', 'Río Grande', 'Río Indio', 'Toabré',
      'Tucué'
    ]
  },
  {
    nombre: 'Antón',
    provincia: 'Coclé',
    corregimientos: [
      'Antón', 'Caballero', 'Cabuya', 'El Chirú', 'El Retiro', 
      'El Valle', 'Juan Díaz', 'Río Hato', 'San Juan de Dios', 
      'Santa Rita'
    ]
  },
  {
    nombre: 'Aguadulce',
    provincia: 'Coclé',
    corregimientos: [
      'Aguadulce', 'El Cristo', 'El Roble', 'Pocrí'
    ]
  },

  // HERRERA
  {
    nombre: 'Chitré',
    provincia: 'Herrera',
    corregimientos: [
      'Chitré', 'La Arena', 'Llano Bonito', 'Monagrillo', 'San Juan Bautista'
    ]
  },
  {
    nombre: 'Los Pozos',
    provincia: 'Herrera',
    corregimientos: [
      'Los Pozos', 'Cerro Largo', 'El Barrero', 'El Capurí', 'La Pitaloza',
      'Las Minas', 'Sabana Grande'
    ]
  },

  // LOS SANTOS
  {
    nombre: 'Las Tablas',
    provincia: 'Los Santos',
    corregimientos: [
      'Las Tablas', 'Bajo Corral', 'Bayano', 'El Carate', 'El Cocal',
      'El Manantial', 'El Muñoz', 'El Pedregoso', 'La Laja', 'La Palma',
      'La Tiza', 'Las Palmitas', 'Las Tablas Abajo', 'Nuario', 
      'Peña Blanca', 'Río Hondo', 'San José', 'San Miguel', 'Santo Domingo',
      'Sesteadero', 'Valle Rico', 'Valleriquito'
    ]
  },
  {
    nombre: 'Pedasí',
    provincia: 'Los Santos',
    corregimientos: [
      'Pedasí', 'Los Asientos', 'Mariabé', 'Oria Arriba', 'Purio'
    ]
  },

  // VERAGUAS
  {
    nombre: 'Santiago',
    provincia: 'Veraguas',
    corregimientos: [
      'Santiago', 'Canto del Llano', 'Carlos Santana Ávila', 'Edwin Fábrega',
      'La Colorada', 'La Peña', 'La Raya de Santa María', 'Los Algarrobos',
      'Ponuga', 'San Martín de Porres', 'Urracá'
    ]
  },

  // BOCAS DEL TORO
  {
    nombre: 'Bocas del Toro',
    provincia: 'Bocas del Toro',
    corregimientos: [
      'Bocas del Toro', 'Bastimentos', 'Cauchero', 'Punta Laurel'
    ]
  },
  {
    nombre: 'Changuinola',
    provincia: 'Bocas del Toro',
    corregimientos: [
      'Changuinola', 'El Empalme', 'El Teribe', 'Guabito', 'Las Delicias',
      'Las Tablas', 'La Gloria'
    ]
  },

  // DARIÉN
  {
    nombre: 'Chepigana',
    provincia: 'Darién',
    corregimientos: [
      'La Palma', 'Camogantí', 'Garachiné', 'Jaqué', 'Puerto Piña',
      'Río Congo', 'Río Congo Arriba', 'Río Iglesias', 'Sambú',
      'Setegantí', 'Taimatí', 'Tucutí'
    ]
  }
];

// Obtener corregimientos por provincia
export function getCorregimientosPorProvincia(provincia: string): string[] {
  const provinciaLower = provincia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const distritos = DISTRITOS_PANAMA.filter(d => {
    const provNorm = d.provincia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return provNorm === provinciaLower || provNorm.includes(provinciaLower);
  });
  
  const corregimientos = new Set<string>();
  distritos.forEach(d => {
    d.corregimientos.forEach(c => corregimientos.add(c));
  });
  
  return Array.from(corregimientos).sort();
}

// Obtener distritos por provincia
export function getDistritosPorProvincia(provincia: string): string[] {
  const provinciaLower = provincia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return DISTRITOS_PANAMA
    .filter(d => {
      const provNorm = d.provincia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return provNorm === provinciaLower || provNorm.includes(provinciaLower);
    })
    .map(d => d.nombre)
    .sort();
}

// Obtener corregimientos por distrito
export function getCorregimientosPorDistrito(distrito: string): string[] {
  const distritoLower = distrito.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const distritoData = DISTRITOS_PANAMA.find(d => {
    const dNorm = d.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return dNorm === distritoLower || dNorm.includes(distritoLower);
  });
  
  return distritoData?.corregimientos.sort() || [];
}

// Validar que un corregimiento pertenece a una provincia
export function validarCorregimientoEnProvincia(corregimiento: string, provincia: string): boolean {
  const corregimientos = getCorregimientosPorProvincia(provincia);
  const corregNorm = corregimiento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return corregimientos.some(c => 
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === corregNorm
  );
}
