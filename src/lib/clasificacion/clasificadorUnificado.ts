// ============================================
// CLASIFICADOR UNIFICADO
// Aplica AMBAS clasificaciones de forma coordinada:
// - Clasificación de Producto (para organización y permisos)
// - Clasificación Aduanera (para liquidación fiscal)
// ============================================

export type CategoriaProducto = 
  | 'medicamentos'
  | 'suplementos'
  | 'productos_medicos'
  | 'veterinarios'
  | 'electronica'
  | 'ropa'
  | 'calzado'
  | 'alimentos'
  | 'cosmeticos'
  | 'libros'
  | 'juguetes'
  | 'general';

export type CategoriaAduanera = 'A' | 'B' | 'C' | 'D';

export interface ClasificacionResult {
  categoriaProducto: CategoriaProducto;
  categoriaAduanera: CategoriaAduanera;
  requierePermiso: boolean;
  autoridad?: string;
  descripcionCategoria: string;
}

// Base de datos de palabras clave por categoría de producto
const CATEGORIAS_PRODUCTO: Record<CategoriaProducto, string[]> = {
  medicamentos: [
    'medicine', 'medication', 'drug', 'medicamento', 'farmaco',
    'antibiotic', 'antibiotico', 'ibuprofen', 'paracetamol',
    'amoxicillin', 'acetaminophen', 'aspirin', 'pharmaceutical',
    'prescription', 'receta', 'pill', 'tablet', 'capsule'
  ],
  suplementos: [
    'supplement', 'vitamin', 'protein', 'suplemento', 'vitamina',
    'omega', 'collagen', 'colageno', 'probiotic', 'probiotico',
    'amino', 'dietary', 'herbal', 'mineral', 'calcium'
  ],
  productos_medicos: [
    'medical device', 'thermometer', 'glucometer', 'oximeter',
    'syringe', 'catheter', 'mask', 'glove', 'termometro',
    'surgical', 'diagnostic', 'bandage', 'healthcare'
  ],
  veterinarios: [
    'pet', 'dog', 'cat', 'veterinary', 'mascota', 'perro', 'gato',
    'animal', 'canine', 'feline', 'pet food', 'pet medicine'
  ],
  electronica: [
    'phone', 'laptop', 'tablet', 'camera', 'smartwatch', 'drone',
    'headphone', 'speaker', 'telefono', 'computadora', 'computer',
    'electronic', 'cable', 'charger', 'battery', 'iphone', 'samsung',
    'airpods', 'macbook', 'ipad'
  ],
  ropa: [
    'shirt', 'pants', 'dress', 'jacket', 'clothing', 'apparel',
    'camisa', 'pantalon', 'vestido', 'ropa', 'sweater', 'blouse',
    'coat', 'jeans', 'shorts', 't-shirt', 'hoodie'
  ],
  calzado: [
    'shoe', 'sneaker', 'boot', 'sandal', 'zapato', 'calzado',
    'nike', 'adidas', 'jordan', 'footwear', 'slipper', 'heel'
  ],
  alimentos: [
    'food', 'snack', 'candy', 'chocolate', 'alimento', 'comida',
    'cookie', 'coffee', 'tea', 'spice', 'condiment', 'sauce'
  ],
  cosmeticos: [
    'cosmetic', 'makeup', 'perfume', 'lotion', 'shampoo',
    'cosmetico', 'maquillaje', 'cream', 'skincare', 'lipstick',
    'mascara', 'foundation', 'serum', 'moisturizer'
  ],
  libros: [
    'book', 'novel', 'textbook', 'magazine', 'libro', 'manual',
    'publication', 'comic', 'journal'
  ],
  juguetes: [
    'toy', 'game', 'puzzle', 'juguete', 'juego', 'lego', 'doll',
    'action figure', 'board game', 'plush'
  ],
  general: []
};

// Autoridades reguladoras por categoría de producto
const AUTORIDADES_REGULADORAS: Partial<Record<CategoriaProducto, string>> = {
  medicamentos: 'MINSA',
  suplementos: 'AUPSA',
  productos_medicos: 'MINSA',
  veterinarios: 'MIDA',
  alimentos: 'AUPSA'
};

// Palabras que indican documento
const PALABRAS_DOCUMENTO = [
  'document', 'documento', 'paper', 'papel',
  'letter', 'carta', 'invoice only', 'correspondence',
  'contract', 'contrato', 'certificate', 'certificado',
  'courier document', 'paperwork', 'legal document'
];

/**
 * CLASIFICADOR UNIFICADO
 * Aplica AMBAS clasificaciones de forma coordinada
 */
export class ClasificadorUnificado {
  
  /**
   * Clasifica un paquete aplicando AMBOS sistemas
   */
  static clasificar(
    descripcion: string,
    valor: number
  ): ClasificacionResult {
    
    const descLower = descripcion.toLowerCase();
    const esDocumento = this.esDocumento(descLower);
    
    // PASO 1: Clasificación de Producto
    const categoriaProducto = this.clasificarPorProducto(descLower);
    
    // PASO 2: Clasificación Aduanera (INDEPENDIENTE)
    const { categoriaAduanera, descripcionCategoria } = this.clasificarPorAduanas(valor, esDocumento);
    
    // PASO 3: Determinar si requiere permiso
    const { requierePermiso, autoridad } = this.determinarPermisos(categoriaProducto);
    
    return {
      categoriaProducto,
      categoriaAduanera,
      requierePermiso,
      autoridad,
      descripcionCategoria
    };
  }
  
  /**
   * Detecta si es un documento
   */
  private static esDocumento(descripcion: string): boolean {
    return PALABRAS_DOCUMENTO.some(palabra => descripcion.includes(palabra));
  }
  
  /**
   * Clasificación por tipo de producto (para organización)
   */
  private static clasificarPorProducto(descripcion: string): CategoriaProducto {
    // Prioridad: categorías más específicas primero
    const prioridad: CategoriaProducto[] = [
      'medicamentos',
      'productos_medicos',
      'veterinarios',
      'suplementos',
      'electronica',
      'ropa',
      'calzado',
      'alimentos',
      'cosmeticos',
      'libros',
      'juguetes'
    ];
    
    for (const categoria of prioridad) {
      const palabras = CATEGORIAS_PRODUCTO[categoria];
      if (palabras.some(palabra => descripcion.includes(palabra))) {
        return categoria;
      }
    }
    
    return 'general';
  }
  
  /**
   * Clasificación aduanera (para liquidación)
   */
  private static clasificarPorAduanas(
    valor: number,
    esDocumento: boolean
  ): { categoriaAduanera: CategoriaAduanera; descripcionCategoria: string } {
    
    // CATEGORÍA A: Documentos (sin valor comercial)
    if (esDocumento) {
      return { 
        categoriaAduanera: 'A', 
        descripcionCategoria: 'Documentos - Exento' 
      };
    }
    
    // CATEGORÍA B: De Minimis (≤ $100)
    if (valor <= 100.00) {
      return { 
        categoriaAduanera: 'B', 
        descripcionCategoria: 'De Minimis (≤ $100) - Exento' 
      };
    }
    
    // CATEGORÍA D: Alto Valor (≥ $2,000) - Requiere corredor
    if (valor >= 2000.00) {
      return { 
        categoriaAduanera: 'D', 
        descripcionCategoria: 'Alto Valor (≥ $2,000) - Requiere Corredor' 
      };
    }
    
    // CATEGORÍA C: Bajo Valor ($100 < valor < $2,000)
    return { 
      categoriaAduanera: 'C', 
      descripcionCategoria: 'Bajo Valor - Liquidación Simplificada' 
    };
  }
  
  /**
   * Determina si requiere permisos especiales
   */
  private static determinarPermisos(categoriaProducto: CategoriaProducto): {
    requierePermiso: boolean;
    autoridad?: string;
  } {
    const autoridad = AUTORIDADES_REGULADORAS[categoriaProducto];
    
    return {
      requierePermiso: !!autoridad,
      autoridad
    };
  }
  
  /**
   * Obtiene la descripción legible de una categoría de producto
   */
  static getNombreCategoria(categoria: CategoriaProducto): string {
    const nombres: Record<CategoriaProducto, string> = {
      medicamentos: 'Medicamentos',
      suplementos: 'Suplementos Alimenticios',
      productos_medicos: 'Productos Médicos',
      veterinarios: 'Productos Veterinarios',
      electronica: 'Electrónica',
      ropa: 'Ropa y Vestimenta',
      calzado: 'Calzado',
      alimentos: 'Alimentos',
      cosmeticos: 'Cosméticos',
      libros: 'Libros y Publicaciones',
      juguetes: 'Juguetes',
      general: 'General/Otros'
    };
    return nombres[categoria];
  }
  
  /**
   * Obtiene la descripción legible de una categoría aduanera
   */
  static getNombreCategoriaAduanera(categoria: CategoriaAduanera): string {
    const nombres: Record<CategoriaAduanera, string> = {
      'A': 'Documentos (Exento)',
      'B': 'De Minimis ≤ $100 (Exento)',
      'C': 'Bajo Valor $100-$2,000',
      'D': 'Alto Valor ≥ $2,000'
    };
    return nombres[categoria];
  }
}

export default ClasificadorUnificado;
