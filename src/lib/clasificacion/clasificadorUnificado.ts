// ============================================
// CLASIFICADOR UNIFICADO
// Aplica AMBAS clasificaciones de forma coordinada:
// - Clasificación de Producto (para organización y permisos)
// - Clasificación Aduanera (para liquidación fiscal)
// CORRECCIÓN H01: Umbrales centralizados desde configuración
// ============================================

import { 
  ConfiguracionLiquidacion, 
  DEFAULT_CONFIG_LIQUIDACION 
} from '@/types/aduanas';

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
  // NUEVO: Trazabilidad de la clasificación
  reglasAplicadas: string[];
  umbralAplicado?: number;
}

// Base de datos de palabras clave por categoría de producto
const CATEGORIAS_PRODUCTO: Record<CategoriaProducto, string[]> = {
  medicamentos: [
    // Términos generales
    'medicine', 'medication', 'drug', 'medicamento', 'medicamentos', 'farmaco', 'fármaco',
    'pharmaceutical', 'pharma', 'farma', 'rx', 'prescription', 'receta',
    // Formas farmacéuticas
    'pill', 'pills', 'tablet', 'tablets', 'capsule', 'capsules', 'capsula', 'cápsula',
    'pastilla', 'pastillas', 'tableta', 'tabletas', 'gragea', 'grageas',
    'syrup', 'jarabe', 'suspension', 'suspensión', 'injection', 'inyeccion', 'inyección',
    'cream', 'crema', 'ointment', 'pomada', 'ungüento', 'gel', 'drops', 'gotas',
    'inhaler', 'inhalador', 'patch', 'parche', 'suppository', 'supositorio',
    // Antibióticos
    'antibiotic', 'antibiotico', 'antibiótico', 'amoxicillin', 'amoxicilina',
    'azithromycin', 'azitromicina', 'ciprofloxacin', 'ciprofloxacino',
    'metronidazole', 'metronidazol', 'penicillin', 'penicilina', 'cephalexin', 'cefalexina',
    // Analgésicos y antiinflamatorios
    'ibuprofen', 'ibuprofeno', 'paracetamol', 'acetaminophen', 'acetaminofen',
    'aspirin', 'aspirina', 'naproxen', 'naproxeno', 'diclofenac', 'diclofenaco',
    'ketorolac', 'ketorolaco', 'tramadol', 'morphine', 'morfina', 'codeine', 'codeina', 'codeína',
    // Antihipertensivos y cardiovasculares
    'losartan', 'enalapril', 'lisinopril', 'amlodipine', 'amlodipino',
    'metoprolol', 'atenolol', 'carvedilol', 'hydrochlorothiazide', 'hidroclorotiazida',
    'furosemide', 'furosemida', 'spironolactone', 'espironolactona',
    // Diabetes
    'metformin', 'metformina', 'insulin', 'insulina', 'glibenclamide', 'glibenclamida',
    'glimepiride', 'glimepirida', 'sitagliptin', 'sitagliptina',
    // Gastrointestinales
    'omeprazole', 'omeprazol', 'pantoprazole', 'pantoprazol', 'ranitidine', 'ranitidina',
    'metoclopramide', 'metoclopramida', 'loperamide', 'loperamida',
    // Antihistamínicos y antialérgicos
    'loratadine', 'loratadina', 'cetirizine', 'cetirizina', 'diphenhydramine', 'difenhidramina',
    'chlorpheniramine', 'clorfenamina', 'fexofenadine', 'fexofenadina',
    // Psicotrópicos
    'alprazolam', 'diazepam', 'clonazepam', 'lorazepam', 'sertraline', 'sertralina',
    'fluoxetine', 'fluoxetina', 'escitalopram', 'quetiapine', 'quetiapina',
    // Hormonales
    'levothyroxine', 'levotiroxina', 'prednisone', 'prednisona', 'prednisolone', 'prednisolona',
    'dexamethasone', 'dexametasona', 'hydrocortisone', 'hidrocortisona',
    // Anticoagulantes
    'warfarin', 'warfarina', 'heparin', 'heparina', 'rivaroxaban', 'apixaban',
    // Otros comunes
    'sildenafil', 'tadalafil', 'finasteride', 'minoxidil', 'clotrimazole', 'clotrimazol',
    'fluconazole', 'fluconazol', 'acyclovir', 'aciclovir', 'oseltamivir'
  ],
  suplementos: [
    'supplement', 'supplements', 'suplemento', 'suplementos', 'suplemento alimenticio',
    'vitamin', 'vitamins', 'vitamina', 'vitaminas', 'multivitamin', 'multivitaminico', 'multivitamínico',
    'vitamin a', 'vitamin b', 'vitamin b12', 'vitamin c', 'vitamin d', 'vitamin e', 'vitamin k',
    'protein', 'proteina', 'proteína', 'whey protein', 'protein powder',
    'omega', 'omega 3', 'omega-3', 'fish oil', 'aceite pescado',
    'collagen', 'colageno', 'colágeno', 'probiotic', 'probiotico', 'probiótico',
    'prebiotic', 'prebiotico', 'prebiótico', 'amino', 'amino acid', 'aminoacido', 'aminoácido',
    'dietary', 'herbal', 'mineral', 'minerals', 'minerales',
    'calcium', 'calcio', 'magnesium', 'magnesio', 'zinc', 'iron', 'hierro',
    'potassium', 'potasio', 'selenium', 'selenio', 'biotin', 'biotina',
    'folic acid', 'acido folico', 'ácido fólico', 'melatonin', 'melatonina',
    'creatine', 'creatina', 'bcaa', 'glutamine', 'glutamina',
    'ginseng', 'echinacea', 'equinacea', 'garcinia', 'turmeric', 'curcuma', 'cúrcuma',
    'spirulina', 'chlorella', 'ashwagandha', 'maca', 'glucosamine', 'glucosamina',
    'chondroitin', 'condroitina', 'msm', 'coq10', 'coenzyme q10'
  ],
  productos_medicos: [
    'medical device', 'medical equipment', 'dispositivo medico', 'dispositivo médico',
    'thermometer', 'termometro', 'termómetro', 'glucometer', 'glucometro', 'glucómetro',
    'oximeter', 'oximetro', 'oxímetro', 'pulse oximeter',
    'syringe', 'jeringa', 'jeringas', 'needle', 'needles', 'aguja', 'agujas',
    'catheter', 'cateter', 'catéter', 'cannula', 'canula', 'cánula',
    'mask', 'masks', 'mascarilla', 'mascarillas', 'n95', 'kn95', 'surgical mask',
    'glove', 'gloves', 'guante', 'guantes', 'latex gloves', 'nitrile gloves',
    'bandage', 'bandages', 'vendaje', 'vendajes', 'venda', 'vendas',
    'gauze', 'gasa', 'gasas', 'cotton', 'algodon', 'algodón',
    'surgical', 'quirurgico', 'quirúrgico', 'diagnostic', 'diagnostico', 'diagnóstico',
    'healthcare', 'blood pressure', 'presion arterial', 'presión arterial',
    'stethoscope', 'estetoscopio', 'nebulizer', 'nebulizador',
    'wheelchair', 'silla de ruedas', 'crutches', 'muletas', 'walker', 'andador',
    'test strips', 'tiras reactivas', 'lancet', 'lanceta', 'lancetas',
    'first aid', 'primeros auxilios', 'antiseptic', 'antiseptico', 'antiséptico'
  ],
  veterinarios: [
    'pet', 'pets', 'mascota', 'mascotas', 'dog', 'dogs', 'perro', 'perros',
    'cat', 'cats', 'gato', 'gatos', 'veterinary', 'veterinario', 'vet',
    'animal', 'animals', 'canine', 'feline', 'felino',
    'pet food', 'dog food', 'cat food', 'comida mascota', 'alimento mascota',
    'pet medicine', 'pet medication', 'medicamento mascota',
    'flea', 'pulga', 'pulgas', 'tick', 'garrapata', 'garrapatas',
    'dewormer', 'desparasitante', 'heartworm', 'gusano corazon',
    'pet vitamin', 'pet supplement', 'collar antipulgas', 'flea collar',
    'bird', 'pajaro', 'pájaro', 'fish', 'pez', 'hamster', 'rabbit', 'conejo'
  ],
  electronica: [
    'phone', 'phones', 'telefono', 'teléfono', 'smartphone', 'celular', 'cellular',
    'laptop', 'laptops', 'notebook', 'computer', 'computadora', 'computador', 'pc',
    'tablet', 'tablets', 'ipad', 'kindle',
    'camera', 'cameras', 'camara', 'cámara', 'gopro', 'webcam',
    'smartwatch', 'smart watch', 'reloj inteligente', 'watch', 'reloj',
    'drone', 'drones', 'dron',
    'headphone', 'headphones', 'audifonos', 'audífonos', 'earbuds', 'earphones',
    'speaker', 'speakers', 'parlante', 'parlantes', 'bocina', 'bocinas',
    'electronic', 'electronics', 'electronico', 'electrónico', 'electronica', 'electrónica',
    'cable', 'cables', 'charger', 'chargers', 'cargador', 'cargadores',
    'battery', 'batteries', 'bateria', 'batería', 'pila', 'pilas',
    'iphone', 'samsung', 'galaxy', 'xiaomi', 'huawei', 'oppo', 'motorola',
    'airpods', 'macbook', 'imac', 'apple watch', 'pixel', 'oneplus',
    'monitor', 'monitores', 'keyboard', 'teclado', 'mouse', 'raton', 'ratón',
    'printer', 'impresora', 'router', 'modem', 'usb', 'hdmi', 'adapter', 'adaptador',
    'tv', 'television', 'televisor', 'smart tv', 'streaming', 'roku', 'fire stick',
    'console', 'consola', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch',
    'gpu', 'graphics card', 'tarjeta grafica', 'tarjeta gráfica', 'processor', 'procesador',
    'ssd', 'hard drive', 'disco duro', 'memory', 'memoria', 'ram'
  ],
  ropa: [
    'shirt', 'shirts', 'camisa', 'camisas', 't-shirt', 't-shirts', 'camiseta', 'camisetas',
    'pants', 'pantalon', 'pantalón', 'pantalones', 'trousers',
    'dress', 'dresses', 'vestido', 'vestidos',
    'jacket', 'jackets', 'chaqueta', 'chaquetas', 'blazer',
    'clothing', 'clothes', 'ropa', 'apparel', 'garment', 'garments', 'prenda', 'prendas',
    'sweater', 'sweaters', 'sueter', 'suéter', 'jersey',
    'blouse', 'blouses', 'blusa', 'blusas',
    'coat', 'coats', 'abrigo', 'abrigos',
    'jeans', 'denim', 'mezclilla',
    'shorts', 'short', 'bermuda', 'bermudas',
    'hoodie', 'hoodies', 'sudadera', 'sudaderas',
    'underwear', 'ropa interior', 'boxer', 'boxers', 'bra', 'bras', 'brasier',
    'socks', 'sock', 'calcetines', 'calcetin', 'calcetín', 'medias',
    'skirt', 'skirts', 'falda', 'faldas',
    'suit', 'suits', 'traje', 'trajes',
    'tie', 'ties', 'corbata', 'corbatas',
    'scarf', 'scarves', 'bufanda', 'bufandas', 'pañuelo',
    'gloves', 'guantes', 'hat', 'hats', 'sombrero', 'gorra', 'beanie',
    'belt', 'belts', 'cinturon', 'cinturón', 'cinturones',
    'pajamas', 'pijama', 'pijamas', 'sleepwear'
  ],
  calzado: [
    'shoe', 'shoes', 'zapato', 'zapatos',
    'sneaker', 'sneakers', 'tennis', 'tenis', 'zapatilla', 'zapatillas',
    'boot', 'boots', 'bota', 'botas',
    'sandal', 'sandals', 'sandalia', 'sandalias',
    'footwear', 'calzado',
    'nike', 'adidas', 'jordan', 'puma', 'reebok', 'new balance', 'converse', 'vans',
    'slipper', 'slippers', 'pantufla', 'pantuflas', 'chancleta', 'chancletas',
    'heel', 'heels', 'tacon', 'tacón', 'tacones',
    'flat', 'flats', 'ballerina', 'mocasin', 'mocasín', 'loafer', 'loafers',
    'flip flop', 'flip flops', 'chancla', 'chanclas',
    'running shoes', 'athletic shoes', 'sports shoes'
  ],
  alimentos: [
    'food', 'foods', 'alimento', 'alimentos', 'comida',
    'snack', 'snacks', 'botana', 'botanas', 'merienda',
    'candy', 'candies', 'dulce', 'dulces', 'caramelo', 'caramelos',
    'chocolate', 'chocolates', 'cacao',
    'cookie', 'cookies', 'galleta', 'galletas', 'biscuit', 'biscuits',
    'coffee', 'cafe', 'café', 'tea', 'te', 'té',
    'spice', 'spices', 'especia', 'especias', 'condiment', 'condimento',
    'sauce', 'sauces', 'salsa', 'salsas',
    'cereal', 'cereales', 'oatmeal', 'avena',
    'nuts', 'nueces', 'almonds', 'almendras', 'peanuts', 'mani', 'maní',
    'dried fruit', 'fruta seca', 'raisins', 'pasas',
    'honey', 'miel', 'jam', 'mermelada', 'jelly',
    'oil', 'aceite', 'olive oil', 'aceite oliva',
    'pasta', 'noodles', 'fideos', 'rice', 'arroz',
    'protein bar', 'energy bar', 'barra proteina', 'barra proteína'
  ],
  cosmeticos: [
    'cosmetic', 'cosmetics', 'cosmetico', 'cosmético', 'cosmeticos', 'cosméticos',
    'makeup', 'make up', 'maquillaje',
    'perfume', 'perfumes', 'fragrance', 'fragrances', 'fragancia', 'fragancias', 'cologne',
    'lotion', 'lotions', 'locion', 'loción', 'lociones',
    'shampoo', 'champu', 'champú', 'conditioner', 'acondicionador',
    'cream', 'crema', 'cremas', 'body cream', 'crema corporal',
    'skincare', 'skin care', 'cuidado piel',
    'lipstick', 'labial', 'lip gloss', 'brillo labial',
    'mascara', 'rimel', 'eyeshadow', 'sombra ojos',
    'foundation', 'base', 'concealer', 'corrector',
    'serum', 'suero', 'moisturizer', 'hidratante', 'humectante',
    'sunscreen', 'protector solar', 'sunblock', 'bloqueador',
    'nail polish', 'esmalte', 'esmalte uñas',
    'deodorant', 'desodorante', 'antiperspirant', 'antitranspirante',
    'soap', 'jabon', 'jabón', 'body wash', 'gel baño',
    'hair dye', 'tinte cabello', 'hair color', 'tinte pelo'
  ],
  libros: [
    'book', 'books', 'libro', 'libros',
    'novel', 'novels', 'novela', 'novelas',
    'textbook', 'textbooks', 'texto escolar', 'libro texto',
    'magazine', 'magazines', 'revista', 'revistas',
    'manual', 'manuales',
    'publication', 'publicacion', 'publicación',
    'comic', 'comics', 'historieta', 'historietas', 'manga',
    'journal', 'journals', 'diario', 'cuaderno',
    'dictionary', 'diccionario', 'encyclopedia', 'enciclopedia',
    'ebook', 'e-book', 'kindle book'
  ],
  juguetes: [
    'toy', 'toys', 'juguete', 'juguetes',
    'game', 'games', 'juego', 'juegos',
    'puzzle', 'puzzles', 'rompecabezas',
    'lego', 'legos', 'building blocks', 'bloques',
    'doll', 'dolls', 'muñeca', 'muñecas', 'muñeco', 'muñecos',
    'action figure', 'action figures', 'figura accion', 'figura acción',
    'board game', 'juego mesa', 'juego de mesa',
    'plush', 'peluche', 'peluches', 'stuffed animal', 'stuffed toy',
    'remote control', 'control remoto', 'rc car', 'carro control',
    'barbie', 'hot wheels', 'nerf', 'playmobil', 'funko', 'funko pop',
    'baby toy', 'juguete bebe', 'juguete bebé',
    'educational toy', 'juguete educativo', 'learning toy'
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
   * CORRECCIÓN H01: Recibe configuración parametrizable
   */
  static clasificar(
    descripcion: string,
    valor: number,
    config: ConfiguracionLiquidacion = DEFAULT_CONFIG_LIQUIDACION
  ): ClasificacionResult {
    
    const descLower = descripcion.toLowerCase();
    const esDocumento = this.esDocumento(descLower);
    const reglasAplicadas: string[] = [];
    
    // PASO 1: Clasificación de Producto
    const categoriaProducto = this.clasificarPorProducto(descLower);
    reglasAplicadas.push(`Producto: ${categoriaProducto}`);
    
    // PASO 2: Clasificación Aduanera (usando config centralizada)
    const { categoriaAduanera, descripcionCategoria, umbralAplicado, regla } = 
      this.clasificarPorAduanas(valor, esDocumento, config);
    reglasAplicadas.push(regla);
    
    // PASO 3: Determinar si requiere permiso
    const { requierePermiso, autoridad } = this.determinarPermisos(categoriaProducto);
    if (requierePermiso) {
      reglasAplicadas.push(`Permiso requerido: ${autoridad}`);
    }
    
    return {
      categoriaProducto,
      categoriaAduanera,
      requierePermiso,
      autoridad,
      descripcionCategoria,
      reglasAplicadas,
      umbralAplicado
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
   * CORRECCIÓN H01: Usa umbrales desde configuración centralizada
   */
  private static clasificarPorAduanas(
    valor: number,
    esDocumento: boolean,
    config: ConfiguracionLiquidacion
  ): { 
    categoriaAduanera: CategoriaAduanera; 
    descripcionCategoria: string;
    umbralAplicado?: number;
    regla: string;
  } {
    
    const { umbralDeMinimis, umbralCorredorObligatorio } = config;
    
    // CATEGORÍA A: Documentos (sin valor comercial)
    if (esDocumento) {
      return { 
        categoriaAduanera: 'A', 
        descripcionCategoria: 'Documentos - Exento',
        regla: 'Regla: Documento detectado → Categoría A'
      };
    }
    
    // CATEGORÍA B: De Minimis (≤ umbral configurable)
    if (valor <= umbralDeMinimis) {
      return { 
        categoriaAduanera: 'B', 
        descripcionCategoria: `De Minimis (≤ $${umbralDeMinimis}) - Exento`,
        umbralAplicado: umbralDeMinimis,
        regla: `Regla: Valor $${valor.toFixed(2)} ≤ umbral $${umbralDeMinimis} → Categoría B`
      };
    }
    
    // CATEGORÍA D: Alto Valor (≥ umbral configurable)
    if (valor >= umbralCorredorObligatorio) {
      return { 
        categoriaAduanera: 'D', 
        descripcionCategoria: `Alto Valor (≥ $${umbralCorredorObligatorio}) - Requiere Corredor`,
        umbralAplicado: umbralCorredorObligatorio,
        regla: `Regla: Valor $${valor.toFixed(2)} ≥ umbral $${umbralCorredorObligatorio} → Categoría D`
      };
    }
    
    // CATEGORÍA C: Bajo Valor (entre umbrales)
    return { 
      categoriaAduanera: 'C', 
      descripcionCategoria: `Bajo Valor ($${umbralDeMinimis} < valor < $${umbralCorredorObligatorio})`,
      regla: `Regla: Valor $${valor.toFixed(2)} entre umbrales → Categoría C`
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
