/**
 * CLASIFICADOR INTELIGENTE DE PRODUCTOS
 * 
 * Usa 500+ patrones para clasificar productos automáticamente.
 * Detecta categorías, subcategorías y requisitos de permisos.
 * 
 * @author Sistema de Gestión de Manifiestos
 * @version 2.0.0
 */

import { CategoriaAduanera } from '@/types/aduanas';
import { ConfigService } from '@/lib/config/ConfigService';

// ═══════════════════════════════════════════════════════════════
// TIPOS Y ENUMS
// ═══════════════════════════════════════════════════════════════

export type CategoriaProducto = 
  | 'medicamentos'
  | 'suplementos'
  | 'productos_medicos'
  | 'veterinarios'
  | 'electronica'
  | 'computacion'
  | 'telefonia'
  | 'ropa'
  | 'calzado'
  | 'accesorios'
  | 'alimentos'
  | 'bebidas'
  | 'cosmeticos'
  | 'perfumeria'
  | 'libros'
  | 'juguetes'
  | 'deportes'
  | 'hogar'
  | 'herramientas'
  | 'automotriz'
  | 'joyeria'
  | 'instrumentos'
  | 'arte'
  | 'mascotas'
  | 'bebes'
  | 'oficina'
  | 'jardineria'
  | 'seguridad'
  | 'documentos'
  | 'general';

export type Autoridad = 
  | 'MINSA'      // Ministerio de Salud
  | 'AUPSA'      // Autoridad Panameña de Seguridad de Alimentos
  | 'MIDA'       // Ministerio de Desarrollo Agropecuario
  | 'ASEP'       // Autoridad de Servicios Públicos
  | 'ACODECO'    // Autoridad de Protección al Consumidor
  | 'MiAmbiente' // Ministerio de Ambiente
  | 'ATTT'       // Autoridad de Tránsito
  | 'SINAPROC'   // Sistema Nacional de Protección Civil
  | 'MINGOB';    // Ministerio de Gobierno (armas, seguridad)

export interface ClasificacionInteligente {
  categoriaProducto: CategoriaProducto;
  subcategoria: string;
  categoriaAduanera: CategoriaAduanera;
  confianza: number; // 0-100
  requierePermiso: boolean;
  autoridades: Autoridad[];
  restricciones: string[];
  advertencias: string[];
  esDocumento: boolean;
  esProhibido: boolean;
  palabrasClaveDetectadas: string[];
}

// ═══════════════════════════════════════════════════════════════
// BASE DE DATOS DE PATRONES (500+ VARIACIONES)
// ═══════════════════════════════════════════════════════════════

interface PatronCategoria {
  categoria: CategoriaProducto;
  subcategoria: string;
  palabras: string[];
  requierePermiso: boolean;
  autoridades: Autoridad[];
  restricciones?: string[];
}

const PATRONES_CATEGORIA: PatronCategoria[] = [
  // ═══════════════════════════════════════════════════════════
  // MEDICAMENTOS (Requiere MINSA)
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'medicamentos',
    subcategoria: 'antibioticos',
    palabras: [
      'antibiotic', 'antibiotico', 'amoxicillin', 'amoxicilina', 'azithromycin',
      'azitromicina', 'ciprofloxacin', 'ciprofloxacino', 'penicillin', 'penicilina',
      'cephalexin', 'cefalexina', 'doxycycline', 'doxiciclina', 'metronidazole',
      'metronidazol', 'clindamycin', 'clindamicina', 'erythromycin', 'eritromicina',
      'tetracycline', 'tetraciclina', 'ampicillin', 'ampicilina', 'ceftriaxone',
      'ceftriaxona', 'vancomycin', 'vancomicina', 'gentamicin', 'gentamicina'
    ],
    requierePermiso: true,
    autoridades: ['MINSA'],
    restricciones: ['Requiere receta médica', 'Verificar registro sanitario']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'analgesicos',
    palabras: [
      'painkiller', 'analgesic', 'analgesico', 'ibuprofen', 'ibuprofeno',
      'acetaminophen', 'acetaminofen', 'paracetamol', 'naproxen', 'naproxeno',
      'aspirin', 'aspirina', 'diclofenac', 'diclofenaco', 'ketorolac',
      'ketorolaco', 'tramadol', 'codeine', 'codeina', 'morphine', 'morfina',
      'oxycodone', 'oxicodona', 'hydrocodone', 'hidrocodona', 'fentanyl',
      'fentanilo', 'pain relief', 'alivio dolor', 'dolores', 'headache',
      'cefalea', 'migraine', 'migraña'
    ],
    requierePermiso: true,
    autoridades: ['MINSA'],
    restricciones: ['Verificar si es controlado', 'Requiere receta para opioides']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'cardiovascular',
    palabras: [
      'blood pressure', 'presion arterial', 'hipertension', 'hypertension',
      'lisinopril', 'enalapril', 'losartan', 'amlodipine', 'amlodipino',
      'metoprolol', 'atenolol', 'carvedilol', 'valsartan', 'olmesartan',
      'hydrochlorothiazide', 'hidroclorotiazida', 'furosemide', 'furosemida',
      'spironolactone', 'espironolactona', 'digoxin', 'digoxina', 'warfarin',
      'warfarina', 'clopidogrel', 'statin', 'estatina', 'atorvastatin',
      'atorvastatina', 'simvastatin', 'simvastatina', 'rosuvastatin',
      'rosuvastatina', 'cholesterol', 'colesterol'
    ],
    requierePermiso: true,
    autoridades: ['MINSA'],
    restricciones: ['Requiere receta médica']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'diabetes',
    palabras: [
      'diabetes', 'diabetic', 'diabetico', 'insulin', 'insulina', 'metformin',
      'metformina', 'glipizide', 'glipizida', 'glimepiride', 'glimepirida',
      'sitagliptin', 'sitagliptina', 'empagliflozin', 'empagliflozina',
      'semaglutide', 'semaglutida', 'ozempic', 'wegovy', 'trulicity',
      'jardiance', 'januvia', 'glucose', 'glucosa', 'blood sugar',
      'azucar sangre', 'a1c', 'hemoglobina'
    ],
    requierePermiso: true,
    autoridades: ['MINSA'],
    restricciones: ['Insulina requiere cadena de frío', 'Verificar registro sanitario']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'oftalmicos',
    palabras: [
      'eye drops', 'gotas ojos', 'gotas oftalmicas', 'ophthalmic', 'oftalmico',
      'latanoprost', 'timolol', 'brimonidine', 'brimonidina', 'glaucoma',
      'artificial tears', 'lagrimas artificiales', 'lubricante ocular',
      'conjuntivitis', 'antihistamine eye', 'antihistaminico ocular'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'dermatologicos',
    palabras: [
      'topical', 'topico', 'cream', 'crema', 'ointment', 'unguento', 'lotion',
      'locion', 'hydrocortisone', 'hidrocortisona', 'betamethasone',
      'betametasona', 'clotrimazole', 'clotrimazol', 'ketoconazole',
      'ketoconazol', 'antifungal', 'antifungico', 'antihongos', 'acne',
      'retinol', 'tretinoin', 'tretinoina', 'adapalene', 'adapaleno',
      'benzoyl peroxide', 'peroxido benzoilo', 'psoriasis', 'eczema',
      'dermatitis', 'rash', 'sarpullido'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'respiratorios',
    palabras: [
      'inhaler', 'inhalador', 'asthma', 'asma', 'bronchitis', 'bronquitis',
      'albuterol', 'salbutamol', 'fluticasone', 'fluticasona', 'budesonide',
      'budesonida', 'montelukast', 'singulair', 'nebulizer', 'nebulizador',
      'cough syrup', 'jarabe tos', 'expectorant', 'expectorante',
      'dextromethorphan', 'dextrometorfano', 'guaifenesin', 'guaifenesina',
      'bronchodilator', 'broncodilatador', 'copd', 'epoc'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'psiquiatricos',
    palabras: [
      'antidepressant', 'antidepresivo', 'anxiety', 'ansiedad', 'depression',
      'depresion', 'sertraline', 'sertralina', 'fluoxetine', 'fluoxetina',
      'escitalopram', 'citalopram', 'venlafaxine', 'venlafaxina', 'duloxetine',
      'duloxetina', 'bupropion', 'wellbutrin', 'prozac', 'zoloft', 'lexapro',
      'alprazolam', 'xanax', 'lorazepam', 'ativan', 'diazepam', 'valium',
      'clonazepam', 'klonopin', 'benzodiazepine', 'benzodiazepina', 'sleep aid',
      'ayuda dormir', 'zolpidem', 'ambien', 'trazodone', 'trazodona',
      'quetiapine', 'quetiapina', 'risperidone', 'risperidona', 'aripiprazole',
      'aripiprazol', 'lithium', 'litio', 'bipolar', 'schizophrenia',
      'esquizofrenia', 'adhd', 'tdah', 'adderall', 'ritalin', 'methylphenidate',
      'metilfenidato', 'amphetamine', 'anfetamina'
    ],
    requierePermiso: true,
    autoridades: ['MINSA'],
    restricciones: ['Medicamentos controlados', 'Requiere receta especial', 'Verificar lista de sustancias controladas']
  },
  {
    categoria: 'medicamentos',
    subcategoria: 'hormonales',
    palabras: [
      'hormone', 'hormona', 'thyroid', 'tiroides', 'levothyroxine',
      'levotiroxina', 'synthroid', 'testosterone', 'testosterona', 'estrogen',
      'estrogeno', 'progesterone', 'progesterona', 'birth control',
      'anticonceptivo', 'contraceptive', 'contraceptivo', 'pill', 'pastilla',
      'patch', 'parche', 'iud', 'diu', 'nuvaring', 'depo-provera',
      'prednisone', 'prednisona', 'dexamethasone', 'dexametasona',
      'hydrocortisone', 'hidrocortisona', 'cortisol', 'steroid', 'esteroide',
      'hrt', 'trt', 'hormone replacement', 'reemplazo hormonal'
    ],
    requierePermiso: true,
    autoridades: ['MINSA'],
    restricciones: ['Esteroides requieren verificación especial']
  },

  // ═══════════════════════════════════════════════════════════
  // SUPLEMENTOS (Requiere AUPSA)
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'suplementos',
    subcategoria: 'vitaminas',
    palabras: [
      'vitamin', 'vitamina', 'multivitamin', 'multivitaminico', 'vitamin a',
      'vitamin b', 'vitamin b12', 'vitamin c', 'vitamin d', 'vitamin d3',
      'vitamin e', 'vitamin k', 'b complex', 'complejo b', 'folic acid',
      'acido folico', 'biotin', 'biotina', 'niacin', 'niacina', 'riboflavin',
      'riboflavina', 'thiamine', 'tiamina', 'pyridoxine', 'piridoxina',
      'cobalamin', 'cobalamina', 'ascorbic acid', 'acido ascorbico',
      'retinol', 'tocopherol', 'tocoferol', 'prenatal', 'postnatal',
      'children vitamin', 'vitamina niños', 'gummy vitamin', 'vitamina gomita'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'suplementos',
    subcategoria: 'minerales',
    palabras: [
      'mineral', 'calcium', 'calcio', 'magnesium', 'magnesio', 'iron', 'hierro',
      'zinc', 'potassium', 'potasio', 'selenium', 'selenio', 'copper', 'cobre',
      'manganese', 'manganeso', 'chromium', 'cromo', 'iodine', 'yodo',
      'phosphorus', 'fosforo', 'multimineral', 'electrolyte', 'electrolito',
      'bone health', 'salud osea', 'osteoporosis'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'suplementos',
    subcategoria: 'proteinas',
    palabras: [
      'protein', 'proteina', 'whey', 'suero', 'casein', 'caseina', 'isolate',
      'aislado', 'concentrate', 'concentrado', 'mass gainer', 'ganador masa',
      'weight gainer', 'muscle', 'musculo', 'bodybuilding', 'culturismo',
      'amino acid', 'aminoacido', 'bcaa', 'eaa', 'glutamine', 'glutamina',
      'creatine', 'creatina', 'pre workout', 'pre entreno', 'post workout',
      'post entreno', 'recovery', 'recuperacion', 'plant protein',
      'proteina vegetal', 'pea protein', 'proteina arveja', 'hemp protein',
      'proteina cañamo', 'soy protein', 'proteina soya', 'collagen',
      'colageno', 'peptide', 'peptido', 'hydrolyzed', 'hidrolizado'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'suplementos',
    subcategoria: 'omega_y_aceites',
    palabras: [
      'omega', 'omega 3', 'omega 6', 'omega 9', 'fish oil', 'aceite pescado',
      'krill oil', 'aceite krill', 'cod liver oil', 'aceite higado bacalao',
      'flaxseed', 'linaza', 'chia', 'evening primrose', 'primula', 'borage',
      'borraja', 'mct oil', 'aceite mct', 'coconut oil', 'aceite coco',
      'dha', 'epa', 'fatty acid', 'acido graso'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'suplementos',
    subcategoria: 'probioticos',
    palabras: [
      'probiotic', 'probiotico', 'prebiotic', 'prebiotico', 'synbiotic',
      'sinbiotico', 'lactobacillus', 'bifidobacterium', 'saccharomyces',
      'gut health', 'salud intestinal', 'digestive', 'digestivo', 'flora',
      'microbiome', 'microbioma', 'fermented', 'fermentado', 'kefir',
      'kombucha', 'enzyme', 'enzima', 'digestive enzyme', 'enzima digestiva'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'suplementos',
    subcategoria: 'hierbas_naturales',
    palabras: [
      'herbal', 'herbal supplement', 'suplemento herbal', 'natural', 'organic',
      'organico', 'turmeric', 'curcuma', 'curcumin', 'curcumina', 'ginger',
      'jengibre', 'garlic', 'ajo', 'echinacea', 'equinacea', 'ginseng',
      'ashwagandha', 'rhodiola', 'maca', 'tribulus', 'saw palmetto',
      'milk thistle', 'cardo mariano', 'valerian', 'valeriana', 'chamomile',
      'manzanilla', 'lavender', 'lavanda', 'ginkgo', 'st john wort',
      'hierba san juan', 'elderberry', 'sauco', 'astragalus', 'adaptogen',
      'adaptogeno', 'ayurvedic', 'ayurvedico', 'traditional', 'tradicional',
      'botanical', 'botanico', 'plant extract', 'extracto planta', 'root',
      'raiz', 'leaf', 'hoja', 'flower', 'flor', 'bark', 'corteza'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'suplementos',
    subcategoria: 'deportivos',
    palabras: [
      'sports nutrition', 'nutricion deportiva', 'performance', 'rendimiento',
      'endurance', 'resistencia', 'energy', 'energia', 'caffeine', 'cafeina',
      'beta alanine', 'beta alanina', 'citrulline', 'citrulina', 'nitric oxide',
      'oxido nitrico', 'l-arginine', 'l-arginina', 'l-carnitine', 'l-carnitina',
      'fat burner', 'quemador grasa', 'thermogenic', 'termogenico', 'cla',
      'hca', 'garcinia', 'green tea extract', 'extracto te verde', 'yohimbine',
      'yohimbina', 'testosterone booster', 'potenciador testosterona',
      'strength', 'fuerza', 'power', 'potencia', 'lean', 'definicion'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA'],
    restricciones: ['Verificar ingredientes prohibidos WADA']
  },

  // ═══════════════════════════════════════════════════════════
  // PRODUCTOS MÉDICOS (Requiere MINSA)
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'productos_medicos',
    subcategoria: 'diagnostico',
    palabras: [
      'medical device', 'dispositivo medico', 'thermometer', 'termometro',
      'blood pressure monitor', 'tensiometro', 'glucometer', 'glucometro',
      'oximeter', 'oximetro', 'pulse oximeter', 'oximetro pulso', 'stethoscope',
      'estetoscopio', 'otoscope', 'otoscopio', 'ophthalmoscope', 'oftalmoscopio',
      'test strip', 'tira reactiva', 'lancet', 'lanceta', 'pregnancy test',
      'prueba embarazo', 'ovulation test', 'prueba ovulacion', 'covid test',
      'prueba covid', 'rapid test', 'prueba rapida', 'antigen test',
      'prueba antigeno', 'pcr', 'diagnostic kit', 'kit diagnostico'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },
  {
    categoria: 'productos_medicos',
    subcategoria: 'consumibles',
    palabras: [
      'syringe', 'jeringa', 'needle', 'aguja', 'catheter', 'cateter', 'cannula',
      'canula', 'iv set', 'set intravenoso', 'bandage', 'vendaje', 'gauze',
      'gasa', 'cotton', 'algodon', 'alcohol swab', 'torunda alcohol', 'glove',
      'guante', 'latex', 'nitrile', 'nitrilo', 'surgical mask', 'mascarilla',
      'n95', 'kn95', 'face shield', 'careta', 'gown', 'bata', 'cap', 'gorro',
      'shoe cover', 'cubre zapato', 'suture', 'sutura', 'staple', 'grapa',
      'adhesive strip', 'tira adhesiva', 'band aid', 'curita', 'dressing',
      'aposito', 'wound care', 'cuidado herida'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },
  {
    categoria: 'productos_medicos',
    subcategoria: 'ortopedia',
    palabras: [
      'orthopedic', 'ortopedico', 'brace', 'ferula', 'splint', 'tablilla',
      'cast', 'yeso', 'crutch', 'muleta', 'walker', 'andador', 'wheelchair',
      'silla ruedas', 'cane', 'baston', 'knee brace', 'rodillera', 'ankle brace',
      'tobillera', 'wrist brace', 'muñequera', 'back brace', 'faja lumbar',
      'neck brace', 'collarin', 'compression', 'compresion', 'elastic bandage',
      'venda elastica', 'support', 'soporte', 'posture corrector',
      'corrector postura', 'insole', 'plantilla', 'arch support', 'soporte arco'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },
  {
    categoria: 'productos_medicos',
    subcategoria: 'rehabilitacion',
    palabras: [
      'rehabilitation', 'rehabilitacion', 'physical therapy', 'fisioterapia',
      'tens unit', 'electroestimulador', 'massage', 'masaje', 'heat pad',
      'almohadilla termica', 'ice pack', 'bolsa hielo', 'foam roller',
      'rodillo espuma', 'resistance band', 'banda resistencia', 'exercise ball',
      'pelota ejercicio', 'balance board', 'tabla equilibrio', 'grip strength',
      'fuerza agarre', 'hand exerciser', 'ejercitador mano'
    ],
    requierePermiso: true,
    autoridades: ['MINSA']
  },

  // ═══════════════════════════════════════════════════════════
  // VETERINARIOS (Requiere MIDA)
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'veterinarios',
    subcategoria: 'medicamentos_animales',
    palabras: [
      'pet medicine', 'medicina mascota', 'veterinary', 'veterinario', 'vet',
      'animal health', 'salud animal', 'flea', 'pulga', 'tick', 'garrapata',
      'heartworm', 'gusano corazon', 'dewormer', 'desparasitante', 'antiparasitic',
      'antiparasitario', 'frontline', 'nexgard', 'bravecto', 'simparica',
      'heartgard', 'interceptor', 'revolution', 'advantage', 'seresto',
      'flea collar', 'collar antipulgas', 'pet shampoo', 'champu mascota',
      'ear cleaner', 'limpiador oidos', 'eye drops pet', 'gotas ojos mascota',
      'joint supplement pet', 'suplemento articular mascota', 'glucosamine dog',
      'glucosamina perro', 'fish oil pet', 'aceite pescado mascota'
    ],
    requierePermiso: true,
    autoridades: ['MIDA']
  },
  {
    categoria: 'veterinarios',
    subcategoria: 'alimentos_animales',
    palabras: [
      'pet food', 'alimento mascota', 'dog food', 'comida perro', 'cat food',
      'comida gato', 'kibble', 'croquetas', 'wet food', 'alimento humedo',
      'dry food', 'alimento seco', 'raw diet', 'dieta cruda', 'barf',
      'grain free', 'libre granos', 'puppy food', 'comida cachorro',
      'kitten food', 'comida gatito', 'senior dog', 'perro senior',
      'prescription diet', 'dieta prescrita', 'hypoallergenic', 'hipoalergenico',
      'digestive care', 'cuidado digestivo', 'weight management', 'control peso',
      'treat', 'premio', 'snack pet', 'dental treat', 'premio dental',
      'bird food', 'comida ave', 'fish food', 'comida pez', 'hamster food',
      'comida hamster', 'rabbit food', 'comida conejo'
    ],
    requierePermiso: true,
    autoridades: ['MIDA', 'AUPSA']
  },
  {
    categoria: 'veterinarios',
    subcategoria: 'accesorios_mascotas',
    palabras: [
      'pet accessory', 'accesorio mascota', 'collar', 'leash', 'correa',
      'harness', 'arnes', 'pet bed', 'cama mascota', 'pet carrier',
      'transportadora', 'crate', 'jaula', 'kennel', 'bowl', 'plato', 'feeder',
      'comedero', 'water fountain', 'fuente agua', 'litter box', 'arenero',
      'litter', 'arena', 'scratching post', 'rascador', 'pet toy', 'juguete mascota',
      'chew toy', 'juguete masticar', 'ball', 'pelota', 'rope toy', 'juguete cuerda',
      'pet clothes', 'ropa mascota', 'dog sweater', 'sueter perro', 'raincoat dog',
      'impermeable perro', 'grooming', 'aseo', 'brush', 'cepillo', 'nail clipper',
      'cortauñas', 'pet dryer', 'secador mascota'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // ELECTRÓNICA
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'electronica',
    subcategoria: 'audio_video',
    palabras: [
      'electronics', 'electronica', 'tv', 'television', 'televisor', 'smart tv',
      'monitor', 'projector', 'proyector', 'speaker', 'parlante', 'bocina',
      'soundbar', 'barra sonido', 'headphone', 'audifonos', 'earphone',
      'auriculares', 'earbuds', 'airpods', 'bluetooth speaker', 'parlante bluetooth',
      'home theater', 'teatro casa', 'receiver', 'receptor', 'amplifier',
      'amplificador', 'subwoofer', 'microphone', 'microfono', 'camera', 'camara',
      'webcam', 'action camera', 'gopro', 'drone', 'gimbal', 'stabilizer',
      'estabilizador', 'tripod', 'tripode', 'lighting', 'iluminacion', 'ring light',
      'aro luz', 'streaming', 'vlog', 'podcast'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'telefonia',
    subcategoria: 'smartphones',
    palabras: [
      'phone', 'telefono', 'smartphone', 'celular', 'mobile', 'movil', 'iphone',
      'samsung', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 'huawei', 'oppo',
      'vivo', 'motorola', 'nokia', 'lg phone', 'android phone', 'ios',
      'refurbished phone', 'telefono reacondicionado', 'unlocked', 'liberado',
      'dual sim', 'doble sim', '5g phone', 'telefono 5g', 'foldable',
      'plegable', 'flip phone', 'telefono tapa'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'telefonia',
    subcategoria: 'accesorios_telefono',
    palabras: [
      'phone case', 'funda telefono', 'screen protector', 'protector pantalla',
      'tempered glass', 'vidrio templado', 'charger', 'cargador', 'cable',
      'usb cable', 'lightning cable', 'type c', 'wireless charger',
      'cargador inalambrico', 'power bank', 'bateria portatil', 'car charger',
      'cargador auto', 'phone holder', 'soporte telefono', 'car mount',
      'soporte auto', 'pop socket', 'selfie stick', 'palo selfie', 'gimbal phone',
      'estabilizador telefono', 'ring holder', 'anillo soporte', 'lanyard',
      'cordon', 'phone strap', 'correa telefono'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'computacion',
    subcategoria: 'computadoras',
    palabras: [
      'computer', 'computadora', 'laptop', 'portatil', 'notebook', 'desktop',
      'escritorio', 'pc', 'macbook', 'chromebook', 'gaming laptop',
      'laptop gaming', 'workstation', 'all in one', 'todo en uno', 'mini pc',
      'server', 'servidor', 'tower', 'torre', 'barebone', 'nuc', 'intel nuc',
      'mac mini', 'mac studio', 'mac pro', 'imac', 'surface', 'thinkpad',
      'dell xps', 'hp spectre', 'asus zenbook', 'lenovo yoga'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'computacion',
    subcategoria: 'componentes',
    palabras: [
      'cpu', 'processor', 'procesador', 'intel', 'amd', 'ryzen', 'core',
      'motherboard', 'placa madre', 'tarjeta madre', 'ram', 'memory', 'memoria',
      'ddr4', 'ddr5', 'ssd', 'solid state', 'estado solido', 'hdd', 'hard drive',
      'disco duro', 'nvme', 'm.2', 'sata', 'graphics card', 'tarjeta grafica',
      'gpu', 'nvidia', 'geforce', 'rtx', 'radeon', 'rx', 'power supply',
      'fuente poder', 'psu', 'case', 'gabinete', 'cooling', 'enfriamiento',
      'fan', 'ventilador', 'heatsink', 'disipador', 'aio', 'water cooling',
      'refrigeracion liquida', 'thermal paste', 'pasta termica'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'computacion',
    subcategoria: 'perifericos',
    palabras: [
      'keyboard', 'teclado', 'mouse', 'raton', 'mechanical keyboard',
      'teclado mecanico', 'gaming mouse', 'mouse gaming', 'mousepad',
      'alfombrilla', 'webcam', 'camara web', 'usb hub', 'hub usb', 'docking station',
      'estacion acoplamiento', 'external drive', 'disco externo', 'flash drive',
      'memoria usb', 'pendrive', 'sd card', 'tarjeta sd', 'microsd', 'card reader',
      'lector tarjetas', 'printer', 'impresora', 'scanner', 'escaner',
      'drawing tablet', 'tableta dibujo', 'wacom', 'graphics tablet',
      'tableta grafica', 'monitor arm', 'brazo monitor', 'laptop stand',
      'soporte laptop', 'ergonomic', 'ergonomico'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'electronica',
    subcategoria: 'wearables',
    palabras: [
      'smartwatch', 'reloj inteligente', 'apple watch', 'galaxy watch',
      'fitbit', 'garmin', 'amazfit', 'fitness tracker', 'monitor actividad',
      'smart band', 'pulsera inteligente', 'heart rate monitor',
      'monitor ritmo cardiaco', 'gps watch', 'reloj gps', 'sports watch',
      'reloj deportivo', 'smart ring', 'anillo inteligente', 'vr headset',
      'visor vr', 'oculus', 'quest', 'ar glasses', 'lentes ar', 'smart glasses',
      'lentes inteligentes'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'electronica',
    subcategoria: 'gaming',
    palabras: [
      'game console', 'consola', 'playstation', 'ps5', 'ps4', 'xbox',
      'nintendo', 'switch', 'gaming', 'video game', 'videojuego', 'controller',
      'control', 'joystick', 'gamepad', 'gaming headset', 'audifonos gaming',
      'gaming chair', 'silla gaming', 'gaming desk', 'escritorio gaming',
      'streaming deck', 'capture card', 'capturadora', 'gaming monitor',
      'monitor gaming', '144hz', '240hz', 'curved monitor', 'monitor curvo',
      'ultrawide', 'rgb', 'led strip', 'tira led'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // ROPA Y CALZADO
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'ropa',
    subcategoria: 'tops',
    palabras: [
      'shirt', 'camisa', 'blouse', 'blusa', 't-shirt', 'camiseta', 'polo',
      'tank top', 'top', 'sweater', 'sueter', 'hoodie', 'sudadera', 'cardigan',
      'jacket', 'chaqueta', 'coat', 'abrigo', 'blazer', 'vest', 'chaleco',
      'sweatshirt', 'jersey', 'pullover', 'turtleneck', 'cuello tortuga',
      'crop top', 'button up', 'button down', 'henley', 'thermal', 'termica',
      'fleece', 'polar', 'windbreaker', 'rompevientos', 'parka', 'trench',
      'gabardina', 'bomber', 'denim jacket', 'chaqueta mezclilla', 'leather jacket',
      'chaqueta cuero'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'ropa',
    subcategoria: 'bottoms',
    palabras: [
      'pants', 'pantalon', 'jeans', 'mezclilla', 'denim', 'shorts', 'short',
      'skirt', 'falda', 'dress', 'vestido', 'jumpsuit', 'mono', 'romper',
      'overalls', 'overol', 'leggings', 'mallas', 'joggers', 'sweatpants',
      'pantalon deportivo', 'chinos', 'khakis', 'cargo pants', 'pantalon cargo',
      'culottes', 'palazzo', 'capri', 'bermuda', 'boardshorts', 'swim trunks',
      'traje baño', 'bikini', 'swimsuit', 'traje natacion'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'ropa',
    subcategoria: 'interiores',
    palabras: [
      'underwear', 'ropa interior', 'boxer', 'brief', 'calzon', 'panty',
      'panties', 'bragas', 'bra', 'brasier', 'sosten', 'sports bra',
      'sujetador deportivo', 'lingerie', 'lenceria', 'shapewear', 'faja',
      'bodysuit', 'camisole', 'camisola', 'slip', 'undershirt', 'camiseta interior',
      'thermal underwear', 'ropa termica', 'sock', 'calcetin', 'calceta',
      'ankle sock', 'no show sock', 'compression sock', 'media compresion',
      'stocking', 'media', 'pantyhose', 'medias pantalon', 'tights', 'mallas'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'ropa',
    subcategoria: 'deportiva',
    palabras: [
      'sportswear', 'ropa deportiva', 'activewear', 'athletic wear', 'gym clothes',
      'ropa gym', 'workout', 'training', 'entrenamiento', 'running', 'yoga',
      'pilates', 'cycling', 'ciclismo', 'tennis', 'tenis', 'golf', 'basketball',
      'basketball shorts', 'football', 'soccer', 'futbol', 'jersey deportivo',
      'compression', 'moisture wicking', 'dry fit', 'performance', 'track suit',
      'conjunto deportivo', 'warm up', 'windbreaker', 'rain jacket', 'impermeable'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'calzado',
    subcategoria: 'zapatos_casual',
    palabras: [
      'shoe', 'zapato', 'sneaker', 'tenis', 'zapatilla', 'loafer', 'mocasin',
      'slip on', 'oxford', 'derby', 'brogue', 'monk strap', 'boat shoe',
      'zapato nautico', 'espadrille', 'alpargata', 'mule', 'clog', 'zueco',
      'flat', 'ballet flat', 'ballerina', 'driving shoe', 'zapato conducir'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'calzado',
    subcategoria: 'botas',
    palabras: [
      'boot', 'bota', 'ankle boot', 'botin', 'chelsea boot', 'combat boot',
      'bota militar', 'hiking boot', 'bota senderismo', 'work boot',
      'bota trabajo', 'cowboy boot', 'bota vaquera', 'rain boot', 'bota lluvia',
      'winter boot', 'bota invierno', 'snow boot', 'bota nieve', 'ugg',
      'knee high boot', 'bota rodilla', 'thigh high', 'bota muslo', 'riding boot',
      'bota equitacion', 'motorcycle boot', 'bota moto', 'steel toe',
      'punta acero'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'calzado',
    subcategoria: 'deportivo',
    palabras: [
      'running shoe', 'zapato correr', 'training shoe', 'zapato entrenamiento',
      'basketball shoe', 'zapato basketball', 'tennis shoe', 'zapato tenis',
      'soccer cleat', 'taco futbol', 'football cleat', 'golf shoe', 'zapato golf',
      'hiking shoe', 'zapato senderismo', 'trail running', 'cross training',
      'weightlifting shoe', 'zapato pesas', 'nike', 'adidas', 'puma', 'reebok',
      'new balance', 'asics', 'under armour', 'saucony', 'brooks', 'hoka',
      'on running', 'converse', 'vans', 'jordan', 'yeezy'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'calzado',
    subcategoria: 'sandalias',
    palabras: [
      'sandal', 'sandalia', 'flip flop', 'chancla', 'chancleta', 'slide',
      'slipper', 'pantufla', 'house shoe', 'zapato casa', 'thong sandal',
      'gladiator sandal', 'sandalia gladiador', 'wedge sandal', 'sandalia cuña',
      'platform sandal', 'sandalia plataforma', 'sport sandal', 'sandalia deportiva',
      'birkenstock', 'crocs', 'teva', 'chaco', 'reef', 'havaianas', 'ipanema'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // ACCESORIOS
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'accesorios',
    subcategoria: 'bolsos',
    palabras: [
      'bag', 'bolso', 'purse', 'cartera', 'handbag', 'bolsa mano', 'backpack',
      'mochila', 'tote', 'bolsa tote', 'crossbody', 'bandolera', 'shoulder bag',
      'bolso hombro', 'clutch', 'sobre', 'wallet', 'billetera', 'card holder',
      'tarjetero', 'coin purse', 'monedero', 'fanny pack', 'canguro', 'belt bag',
      'riñonera', 'duffel bag', 'bolsa deportiva', 'weekender', 'travel bag',
      'bolsa viaje', 'laptop bag', 'bolsa laptop', 'briefcase', 'maletin',
      'messenger bag', 'satchel', 'bucket bag'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'accesorios',
    subcategoria: 'sombreros',
    palabras: [
      'hat', 'sombrero', 'cap', 'gorra', 'beanie', 'gorro', 'beret', 'boina',
      'fedora', 'panama hat', 'sombrero panama', 'bucket hat', 'sombrero pescador',
      'sun hat', 'sombrero sol', 'visor', 'visera', 'snapback', 'trucker hat',
      'baseball cap', 'gorra beisbol', 'straw hat', 'sombrero paja', 'cowboy hat',
      'sombrero vaquero', 'winter hat', 'gorro invierno', 'headband', 'diadema',
      'bandana', 'pañuelo', 'scarf', 'bufanda'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'accesorios',
    subcategoria: 'lentes',
    palabras: [
      'sunglasses', 'lentes sol', 'gafas sol', 'eyeglasses', 'lentes', 'gafas',
      'frames', 'armazones', 'reading glasses', 'lentes lectura', 'blue light',
      'luz azul', 'polarized', 'polarizado', 'aviator', 'wayfarer', 'round',
      'cat eye', 'ojo gato', 'sports glasses', 'lentes deportivos', 'ski goggles',
      'goggles ski', 'swimming goggles', 'goggles natacion', 'safety glasses',
      'lentes seguridad', 'ray ban', 'oakley', 'prada', 'gucci', 'versace'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'accesorios',
    subcategoria: 'cinturones',
    palabras: [
      'belt', 'cinturon', 'leather belt', 'cinturon cuero', 'canvas belt',
      'cinturon lona', 'dress belt', 'cinturon vestir', 'casual belt',
      'cinturon casual', 'reversible belt', 'cinturon reversible', 'braided belt',
      'cinturon trenzado', 'western belt', 'cinturon vaquero', 'suspenders',
      'tirantes', 'buckle', 'hebilla'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // ALIMENTOS Y BEBIDAS (Requiere AUPSA)
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'alimentos',
    subcategoria: 'snacks',
    palabras: [
      'snack', 'botana', 'chips', 'papas', 'crackers', 'galletas', 'cookies',
      'pretzels', 'popcorn', 'palomitas', 'nuts', 'nueces', 'almonds', 'almendras',
      'cashews', 'anacardos', 'peanuts', 'mani', 'dried fruit', 'fruta seca',
      'trail mix', 'granola bar', 'barra granola', 'protein bar', 'barra proteina',
      'energy bar', 'barra energia', 'rice cake', 'tortita arroz', 'beef jerky',
      'carne seca', 'cheese snack', 'snack queso'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'alimentos',
    subcategoria: 'dulces',
    palabras: [
      'candy', 'dulce', 'chocolate', 'gummy', 'gomita', 'lollipop', 'paleta',
      'caramel', 'caramelo', 'hard candy', 'dulce duro', 'chewy candy',
      'dulce masticable', 'licorice', 'regaliz', 'marshmallow', 'malvavisco',
      'jelly bean', 'fudge', 'toffee', 'nougat', 'turron', 'praline',
      'truffle', 'trufa', 'bonbon', 'mints', 'mentas'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'alimentos',
    subcategoria: 'enlatados',
    palabras: [
      'canned food', 'comida enlatada', 'canned vegetables', 'vegetales enlatados',
      'canned fruit', 'fruta enlatada', 'canned meat', 'carne enlatada',
      'canned fish', 'pescado enlatado', 'tuna', 'atun', 'salmon', 'sardines',
      'sardinas', 'spam', 'corned beef', 'canned soup', 'sopa enlatada',
      'canned beans', 'frijoles enlatados', 'tomato sauce', 'salsa tomate',
      'pasta sauce', 'salsa pasta', 'coconut milk', 'leche coco'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'alimentos',
    subcategoria: 'condimentos',
    palabras: [
      'sauce', 'salsa', 'ketchup', 'mustard', 'mostaza', 'mayonnaise', 'mayonesa',
      'hot sauce', 'salsa picante', 'soy sauce', 'salsa soya', 'vinegar', 'vinagre',
      'olive oil', 'aceite oliva', 'cooking oil', 'aceite cocina', 'spice', 'especia',
      'seasoning', 'sazonador', 'salt', 'sal', 'pepper', 'pimienta', 'herbs',
      'hierbas', 'curry', 'paprika', 'pimenton', 'cinnamon', 'canela', 'cumin',
      'comino', 'oregano', 'basil', 'albahaca', 'garlic powder', 'ajo en polvo',
      'onion powder', 'cebolla en polvo', 'chili powder', 'chile en polvo'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'bebidas',
    subcategoria: 'no_alcoholicas',
    palabras: [
      'drink', 'bebida', 'beverage', 'soda', 'refresco', 'juice', 'jugo',
      'water', 'agua', 'sparkling water', 'agua mineral', 'tea', 'te',
      'coffee', 'cafe', 'energy drink', 'bebida energetica', 'sports drink',
      'bebida deportiva', 'coconut water', 'agua coco', 'almond milk',
      'leche almendra', 'oat milk', 'leche avena', 'soy milk', 'leche soya',
      'protein shake', 'batido proteina', 'smoothie', 'milkshake', 'malteada'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },

  // ═══════════════════════════════════════════════════════════
  // COSMÉTICOS Y PERFUMERÍA
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'cosmeticos',
    subcategoria: 'maquillaje',
    palabras: [
      'makeup', 'maquillaje', 'foundation', 'base', 'concealer', 'corrector',
      'powder', 'polvo', 'blush', 'rubor', 'bronzer', 'bronceador', 'highlighter',
      'iluminador', 'contour', 'eyeshadow', 'sombra ojos', 'eyeliner', 'delineador',
      'mascara', 'rimel', 'eyebrow', 'ceja', 'lipstick', 'labial', 'lip gloss',
      'brillo labios', 'lip liner', 'delineador labios', 'setting spray',
      'fijador', 'primer', 'prebase', 'makeup brush', 'brocha maquillaje',
      'sponge', 'esponja', 'beauty blender', 'makeup remover', 'desmaquillante'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'cosmeticos',
    subcategoria: 'cuidado_piel',
    palabras: [
      'skincare', 'cuidado piel', 'cleanser', 'limpiador', 'face wash',
      'jabon facial', 'toner', 'tonico', 'serum', 'moisturizer', 'hidratante',
      'cream', 'crema', 'lotion', 'locion', 'sunscreen', 'protector solar',
      'spf', 'anti aging', 'antienvejecimiento', 'wrinkle', 'arrugas',
      'retinol', 'vitamin c serum', 'hyaluronic acid', 'acido hialuronico',
      'niacinamide', 'niacinamida', 'salicylic acid', 'acido salicilico',
      'glycolic acid', 'acido glicolico', 'exfoliant', 'exfoliante', 'mask',
      'mascarilla', 'face mask', 'mascarilla facial', 'eye cream', 'crema ojos',
      'lip balm', 'balsamo labios', 'acne', 'pimple patch', 'parche granitos'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'cosmeticos',
    subcategoria: 'cabello',
    palabras: [
      'hair care', 'cuidado cabello', 'shampoo', 'champu', 'conditioner',
      'acondicionador', 'hair mask', 'mascarilla cabello', 'hair oil',
      'aceite cabello', 'leave in', 'sin enjuague', 'hair serum', 'serum cabello',
      'hair spray', 'laca', 'gel', 'mousse', 'pomade', 'pomada', 'wax', 'cera',
      'hair dye', 'tinte cabello', 'color', 'bleach', 'decolorante', 'developer',
      'revelador', 'hair treatment', 'tratamiento cabello', 'keratin', 'keratina',
      'argan oil', 'aceite argan', 'coconut oil hair', 'aceite coco cabello',
      'anti frizz', 'anti encrespamiento', 'volumizing', 'voluminizador',
      'dry shampoo', 'champu seco', 'scalp treatment', 'tratamiento cuero cabelludo'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'perfumeria',
    subcategoria: 'fragancias',
    palabras: [
      'perfume', 'parfum', 'eau de toilette', 'cologne', 'colonia', 'fragrance',
      'fragancia', 'body mist', 'spray corporal', 'eau de parfum', 'edp', 'edt',
      'aftershave', 'locion after shave', 'scent', 'aroma', 'notes', 'notas',
      'top notes', 'heart notes', 'base notes', 'woody', 'amaderado', 'floral',
      'citrus', 'citrico', 'oriental', 'fresh', 'fresco', 'musky', 'almizcle',
      'chanel', 'dior', 'versace', 'gucci', 'armani', 'ysl', 'tom ford',
      'hugo boss', 'dolce gabbana', 'prada', 'burberry'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // HOGAR
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'hogar',
    subcategoria: 'cocina',
    palabras: [
      'kitchen', 'cocina', 'cookware', 'utensilios cocina', 'pot', 'olla',
      'pan', 'sarten', 'skillet', 'wok', 'baking', 'hornear', 'bakeware',
      'moldes', 'mixing bowl', 'tazon', 'cutting board', 'tabla cortar',
      'knife', 'cuchillo', 'knife set', 'set cuchillos', 'utensil', 'utensilio',
      'spatula', 'espatula', 'ladle', 'cucharon', 'whisk', 'batidor', 'tongs',
      'pinzas', 'peeler', 'pelador', 'grater', 'rallador', 'can opener',
      'abrelatas', 'corkscrew', 'sacacorchos', 'measuring cup', 'taza medidora',
      'food storage', 'contenedor comida', 'tupperware', 'glass container',
      'contenedor vidrio', 'water bottle', 'botella agua', 'thermos', 'termo'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'hogar',
    subcategoria: 'electrodomesticos',
    palabras: [
      'appliance', 'electrodomestico', 'blender', 'licuadora', 'mixer', 'batidora',
      'food processor', 'procesador alimentos', 'juicer', 'extractor jugo',
      'coffee maker', 'cafetera', 'espresso', 'toaster', 'tostadora', 'microwave',
      'microondas', 'air fryer', 'freidora aire', 'instant pot', 'pressure cooker',
      'olla presion', 'slow cooker', 'olla lenta', 'rice cooker', 'arrocera',
      'electric kettle', 'hervidor', 'vacuum', 'aspiradora', 'robot vacuum',
      'robot aspiradora', 'iron', 'plancha', 'steamer', 'vaporizador', 'fan',
      'ventilador', 'heater', 'calentador', 'air conditioner', 'aire acondicionado',
      'humidifier', 'humidificador', 'dehumidifier', 'deshumidificador',
      'air purifier', 'purificador aire'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'hogar',
    subcategoria: 'decoracion',
    palabras: [
      'home decor', 'decoracion hogar', 'wall art', 'arte pared', 'painting',
      'pintura', 'picture frame', 'marco', 'mirror', 'espejo', 'vase', 'florero',
      'candle', 'vela', 'candle holder', 'portavelas', 'cushion', 'cojin',
      'throw pillow', 'almohada decorativa', 'blanket', 'manta', 'throw blanket',
      'rug', 'alfombra', 'carpet', 'tapete', 'curtain', 'cortina', 'drape',
      'blind', 'persiana', 'lamp', 'lampara', 'light fixture', 'luminaria',
      'chandelier', 'candelabro', 'string lights', 'luces decorativas', 'clock',
      'reloj', 'wall clock', 'reloj pared', 'plant pot', 'maceta', 'planter',
      'jardinera', 'sculpture', 'escultura', 'figurine', 'figura'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'hogar',
    subcategoria: 'cama_bano',
    palabras: [
      'bedding', 'ropa cama', 'sheet', 'sabana', 'pillowcase', 'funda almohada',
      'duvet', 'edredon', 'comforter', 'cobertor', 'quilt', 'colcha', 'mattress',
      'colchon', 'mattress protector', 'protector colchon', 'pillow', 'almohada',
      'memory foam', 'espuma memoria', 'towel', 'toalla', 'bath towel',
      'toalla baño', 'hand towel', 'toalla mano', 'washcloth', 'toalla facial',
      'bathrobe', 'bata baño', 'bath mat', 'tapete baño', 'shower curtain',
      'cortina ducha', 'soap dispenser', 'dispensador jabon', 'toothbrush holder',
      'porta cepillo', 'bathroom organizer', 'organizador baño'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // LIBROS Y OFICINA
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'libros',
    subcategoria: 'libros_general',
    palabras: [
      'book', 'libro', 'novel', 'novela', 'fiction', 'ficcion', 'non fiction',
      'no ficcion', 'textbook', 'libro texto', 'workbook', 'cuaderno trabajo',
      'cookbook', 'libro cocina', 'self help', 'autoayuda', 'biography', 'biografia',
      'autobiography', 'autobiografia', 'history book', 'libro historia',
      'science book', 'libro ciencia', 'art book', 'libro arte', 'photography book',
      'libro fotografia', 'travel book', 'libro viaje', 'guide book', 'guia',
      'dictionary', 'diccionario', 'encyclopedia', 'enciclopedia', 'magazine',
      'revista', 'comic', 'comic book', 'manga', 'graphic novel', 'novela grafica',
      'children book', 'libro niños', 'coloring book', 'libro colorear'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'oficina',
    subcategoria: 'papeleria',
    palabras: [
      'office supplies', 'articulos oficina', 'paper', 'papel', 'notebook',
      'cuaderno', 'journal', 'diario', 'planner', 'agenda', 'calendar', 'calendario',
      'pen', 'pluma', 'boligrafo', 'pencil', 'lapiz', 'marker', 'marcador',
      'highlighter', 'resaltador', 'eraser', 'borrador', 'sharpener', 'sacapuntas',
      'scissors', 'tijeras', 'tape', 'cinta', 'glue', 'pegamento', 'stapler',
      'engrapadora', 'staples', 'grapas', 'paper clip', 'clip', 'binder', 'carpeta',
      'folder', 'funda', 'envelope', 'sobre', 'label', 'etiqueta', 'post it',
      'nota adhesiva', 'sticky note', 'rubber band', 'liga', 'ruler', 'regla'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // JUGUETES Y BEBES
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'juguetes',
    subcategoria: 'juguetes_general',
    palabras: [
      'toy', 'juguete', 'game', 'juego', 'puzzle', 'rompecabezas', 'board game',
      'juego mesa', 'card game', 'juego cartas', 'lego', 'building blocks',
      'bloques', 'action figure', 'figura accion', 'doll', 'muñeca', 'barbie',
      'stuffed animal', 'peluche', 'plush', 'teddy bear', 'oso peluche',
      'remote control', 'control remoto', 'rc car', 'carro control remoto',
      'drone toy', 'nerf', 'water gun', 'pistola agua', 'toy car', 'carrito',
      'train set', 'set tren', 'playset', 'educational toy', 'juguete educativo',
      'stem toy', 'sensory toy', 'juguete sensorial', 'fidget', 'spinner'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'bebes',
    subcategoria: 'cuidado_bebe',
    palabras: [
      'baby', 'bebe', 'infant', 'infante', 'newborn', 'recien nacido', 'diaper',
      'pañal', 'wipes', 'toallitas', 'baby powder', 'talco bebe', 'baby lotion',
      'locion bebe', 'baby oil', 'aceite bebe', 'baby shampoo', 'champu bebe',
      'baby wash', 'jabon bebe', 'diaper cream', 'crema pañal', 'baby formula',
      'formula bebe', 'bottle', 'biberon', 'nipple', 'tetina', 'pacifier', 'chupon',
      'teether', 'mordedor', 'baby food', 'comida bebe', 'baby cereal',
      'cereal bebe', 'sippy cup', 'vaso entrenador', 'baby spoon', 'cuchara bebe'
    ],
    requierePermiso: true,
    autoridades: ['AUPSA']
  },
  {
    categoria: 'bebes',
    subcategoria: 'equipos_bebe',
    palabras: [
      'stroller', 'coche bebe', 'car seat', 'silla auto', 'baby carrier',
      'portabebe', 'baby wrap', 'fular', 'crib', 'cuna', 'bassinet', 'moises',
      'changing table', 'cambiador', 'baby monitor', 'monitor bebe', 'baby swing',
      'columpio bebe', 'bouncer', 'mecedora bebe', 'high chair', 'silla alta',
      'baby gate', 'puerta seguridad', 'playpen', 'corral', 'baby walker',
      'andadera', 'baby gym', 'gimnasio bebe', 'activity mat', 'tapete actividad'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // DEPORTES
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'deportes',
    subcategoria: 'fitness',
    palabras: [
      'fitness', 'exercise', 'ejercicio', 'workout', 'gym equipment',
      'equipo gimnasio', 'dumbbell', 'mancuerna', 'barbell', 'barra', 'weight',
      'pesa', 'kettlebell', 'resistance band', 'banda resistencia', 'jump rope',
      'cuerda saltar', 'yoga mat', 'tapete yoga', 'foam roller', 'rodillo espuma',
      'exercise ball', 'pelota ejercicio', 'pull up bar', 'barra dominadas',
      'push up', 'flexiones', 'ab roller', 'rueda abdominales', 'bench', 'banco',
      'squat rack', 'rack sentadillas', 'treadmill', 'caminadora', 'elliptical',
      'eliptica', 'stationary bike', 'bicicleta estacionaria', 'rowing machine',
      'maquina remo'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'deportes',
    subcategoria: 'equipos_deportivos',
    palabras: [
      'sports equipment', 'equipo deportivo', 'ball', 'balon', 'pelota',
      'basketball', 'balon basketball', 'football', 'balon futbol americano',
      'soccer ball', 'balon futbol', 'volleyball', 'balon voleibol', 'baseball',
      'pelota beisbol', 'glove', 'guante', 'bat', 'bate', 'racket', 'raqueta',
      'tennis racket', 'raqueta tenis', 'badminton', 'ping pong', 'paddle',
      'pala', 'golf club', 'palo golf', 'golf ball', 'pelota golf', 'hockey stick',
      'stick hockey', 'skateboard', 'patineta', 'roller skates', 'patines',
      'helmet', 'casco', 'protective gear', 'proteccion', 'knee pad', 'rodillera',
      'elbow pad', 'codera'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'deportes',
    subcategoria: 'outdoor',
    palabras: [
      'outdoor', 'exteriores', 'camping', 'tent', 'tienda campaña', 'sleeping bag',
      'saco dormir', 'backpack hiking', 'mochila senderismo', 'hiking', 'senderismo',
      'trekking', 'climbing', 'escalada', 'fishing', 'pesca', 'fishing rod',
      'caña pesca', 'tackle', 'aparejos', 'cooler', 'hielera', 'thermos', 'termo',
      'lantern', 'linterna', 'flashlight', 'compass', 'brujula', 'binoculars',
      'binoculares', 'hammock', 'hamaca', 'portable chair', 'silla portatil',
      'canopy', 'toldo', 'grill', 'parrilla', 'bbq', 'charcoal', 'carbon'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // HERRAMIENTAS Y AUTOMOTRIZ
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'herramientas',
    subcategoria: 'manuales',
    palabras: [
      'tool', 'herramienta', 'hand tool', 'herramienta manual', 'hammer', 'martillo',
      'screwdriver', 'destornillador', 'wrench', 'llave', 'pliers', 'pinzas',
      'alicates', 'socket', 'dado', 'ratchet', 'trinquete', 'allen key', 'llave allen',
      'hex key', 'tape measure', 'cinta metrica', 'level', 'nivel', 'saw', 'sierra',
      'handsaw', 'serrucho', 'utility knife', 'cutter', 'chisel', 'cincel',
      'file', 'lima', 'sandpaper', 'lija', 'clamp', 'prensa', 'toolbox',
      'caja herramientas', 'tool set', 'set herramientas'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'herramientas',
    subcategoria: 'electricas',
    palabras: [
      'power tool', 'herramienta electrica', 'drill', 'taladro', 'impact driver',
      'atornillador impacto', 'circular saw', 'sierra circular', 'jigsaw',
      'sierra caladora', 'reciprocating saw', 'sierra sable', 'miter saw',
      'sierra inglete', 'table saw', 'sierra mesa', 'sander', 'lijadora',
      'orbital sander', 'belt sander', 'grinder', 'esmeril', 'angle grinder',
      'amoladora', 'router', 'fresadora', 'heat gun', 'pistola calor', 'soldering iron',
      'cautin', 'welder', 'soldadora', 'compressor', 'compresor', 'nail gun',
      'pistola clavos', 'staple gun', 'engrapadora industrial'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'automotriz',
    subcategoria: 'partes',
    palabras: [
      'car parts', 'partes auto', 'auto parts', 'refacciones', 'oil filter',
      'filtro aceite', 'air filter', 'filtro aire', 'spark plug', 'bujia',
      'brake pad', 'pastilla freno', 'brake disc', 'disco freno', 'battery',
      'bateria', 'alternator', 'alternador', 'starter', 'arranque', 'radiator',
      'radiador', 'thermostat', 'termostato', 'water pump', 'bomba agua',
      'fuel pump', 'bomba combustible', 'timing belt', 'correa tiempo',
      'serpentine belt', 'correa serpentin', 'shock absorber', 'amortiguador',
      'strut', 'muelle', 'control arm', 'brazo control', 'ball joint',
      'rotula', 'tie rod', 'barra direccion', 'cv joint', 'junta homocinetica',
      'wheel bearing', 'rodamiento rueda', 'hub', 'maza', 'axle', 'eje'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'automotriz',
    subcategoria: 'accesorios_auto',
    palabras: [
      'car accessories', 'accesorios auto', 'floor mat', 'tapete', 'seat cover',
      'funda asiento', 'steering wheel cover', 'funda volante', 'sun shade',
      'parasol', 'dash cam', 'camara tablero', 'gps', 'navigation', 'navegacion',
      'bluetooth adapter', 'car charger', 'cargador auto', 'phone mount',
      'soporte celular', 'air freshener', 'aromatizante', 'car wash', 'lavado auto',
      'wax', 'cera auto', 'polish', 'pulidor', 'tire shine', 'brillo llantas',
      'jump starter', 'arrancador', 'tire inflator', 'inflador', 'car cover',
      'funda auto', 'license plate frame', 'marco placa'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // JOYERÍA
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'joyeria',
    subcategoria: 'joyas',
    palabras: [
      'jewelry', 'joyeria', 'jewellery', 'necklace', 'collar', 'chain', 'cadena',
      'pendant', 'dije', 'bracelet', 'pulsera', 'bangle', 'brazalete', 'ring',
      'anillo', 'earring', 'arete', 'hoop earring', 'argolla', 'stud', 'stud earring',
      'brooch', 'broche', 'anklet', 'tobillera', 'body jewelry', 'piercing',
      'nose ring', 'aro nariz', 'belly button ring', 'aro ombligo', 'charm',
      'dije', 'locket', 'relicario', 'engagement ring', 'anillo compromiso',
      'wedding band', 'argolla matrimonio', 'diamond', 'diamante', 'gold', 'oro',
      'silver', 'plata', 'platinum', 'platino', 'rose gold', 'oro rosa',
      'sterling silver', 'plata esterlina', 'cubic zirconia', 'pearl', 'perla',
      'gemstone', 'piedra preciosa', 'ruby', 'rubi', 'emerald', 'esmeralda',
      'sapphire', 'zafiro', 'amethyst', 'amatista', 'topaz', 'topacio'
    ],
    requierePermiso: false,
    autoridades: []
  },
  {
    categoria: 'joyeria',
    subcategoria: 'relojes',
    palabras: [
      'watch', 'reloj', 'wristwatch', 'reloj pulsera', 'analog watch',
      'reloj analogo', 'digital watch', 'reloj digital', 'luxury watch',
      'reloj lujo', 'dress watch', 'reloj vestir', 'dive watch', 'reloj buceo',
      'chronograph', 'cronografo', 'automatic', 'automatico', 'mechanical',
      'mecanico', 'quartz', 'cuarzo', 'watch band', 'correa reloj', 'watch strap',
      'leather strap', 'correa cuero', 'metal band', 'correa metal', 'silicone band',
      'correa silicona', 'rolex', 'omega', 'tag heuer', 'seiko', 'citizen',
      'casio', 'fossil', 'michael kors', 'tissot', 'movado'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTOS
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'documentos',
    subcategoria: 'documentos',
    palabras: [
      'document', 'documento', 'paper', 'papel', 'letter', 'carta', 'contract',
      'contrato', 'legal document', 'documento legal', 'certificate', 'certificado',
      'diploma', 'degree', 'titulo', 'transcript', 'expediente', 'invoice', 'factura',
      'receipt', 'recibo', 'bill', 'cuenta', 'statement', 'estado cuenta',
      'tax document', 'documento fiscal', 'passport copy', 'copia pasaporte',
      'id copy', 'copia identificacion', 'birth certificate', 'acta nacimiento',
      'marriage certificate', 'acta matrimonio', 'medical record', 'expediente medico',
      'correspondence', 'correspondencia', 'mail', 'correo', 'parcel', 'paquete'
    ],
    requierePermiso: false,
    autoridades: []
  },

  // ═══════════════════════════════════════════════════════════
  // PRODUCTOS PROHIBIDOS O RESTRINGIDOS
  // ═══════════════════════════════════════════════════════════
  {
    categoria: 'seguridad',
    subcategoria: 'armas',
    palabras: [
      'weapon', 'arma', 'gun', 'pistola', 'firearm', 'arma fuego', 'rifle',
      'shotgun', 'escopeta', 'ammunition', 'municion', 'bullet', 'bala',
      'cartridge', 'cartucho', 'handgun', 'revolver', 'holster', 'funda pistola',
      'magazine', 'cargador', 'scope', 'mira', 'suppressor', 'silenciador',
      'stun gun', 'taser', 'pepper spray', 'gas pimienta', 'knife tactical',
      'cuchillo tactico', 'switchblade', 'navaja automatica', 'brass knuckles',
      'nudilleras', 'baton', 'baston policia', 'handcuffs', 'esposas',
      'crossbow', 'ballesta', 'bb gun', 'airsoft', 'paintball'
    ],
    requierePermiso: true,
    autoridades: ['MINGOB', 'SINAPROC'],
    restricciones: ['Requiere permiso especial', 'Verificar legalidad', 'Posible producto prohibido']
  }
];

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS PROHIBIDOS
// ═══════════════════════════════════════════════════════════════

const PRODUCTOS_PROHIBIDOS: string[] = [
  // Drogas y estupefacientes
  'cocaine', 'cocaina', 'heroin', 'heroina', 'marijuana', 'marihuana', 'cannabis',
  'meth', 'methamphetamine', 'metanfetamina', 'ecstasy', 'lsd', 'psilocybin',
  'ketamine', 'ketamina', 'fentanyl', 'fentanilo', 'opium', 'opio',
  
  // Explosivos
  'explosive', 'explosivo', 'dynamite', 'dinamita', 'grenade', 'granada',
  'bomb', 'bomba', 'detonator', 'detonador', 'fireworks illegal', 'c4', 'tnt',
  
  // Material peligroso
  'radioactive', 'radiactivo', 'toxic waste', 'desecho toxico', 'biohazard',
  'biopeligroso', 'chemical weapon', 'arma quimica',
  
  // Fauna y flora protegida
  'ivory', 'marfil', 'endangered species', 'especie peligro', 'exotic animal',
  'animal exotico', 'protected plant', 'planta protegida', 'coral',
  
  // Falsificaciones
  'counterfeit', 'falsificado', 'fake currency', 'moneda falsa', 'pirated',
  'pirateado', 'bootleg', 'replica weapon', 'replica arma'
];

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL: CLASIFICADOR INTELIGENTE
// ═══════════════════════════════════════════════════════════════

export class ClasificadorInteligente {
  
  /**
   * Clasifica un producto de forma inteligente
   */
  static clasificar(
    descripcion: string,
    valor: number
  ): ClasificacionInteligente {
    
    if (!descripcion || descripcion.trim() === '') {
      return this.clasificacionPorDefecto(valor);
    }
    
    const descNormalizada = this.normalizarTexto(descripcion);
    
    // Verificar si es producto prohibido
    const esProhibido = this.verificarProhibido(descNormalizada);
    
    // Verificar si es documento
    const esDocumento = this.verificarDocumento(descNormalizada);
    
    // Buscar mejor coincidencia de categoría
    const { patron, confianza, palabrasDetectadas } = this.buscarMejorCoincidencia(descNormalizada);
    
    // Determinar categoría aduanera
    const categoriaAduanera = this.determinarCategoriaAduanera(valor, esDocumento);
    
    // Construir resultado
    const resultado: ClasificacionInteligente = {
      categoriaProducto: patron?.categoria || 'general',
      subcategoria: patron?.subcategoria || 'sin_clasificar',
      categoriaAduanera,
      confianza,
      requierePermiso: patron?.requierePermiso || false,
      autoridades: patron?.autoridades || [],
      restricciones: patron?.restricciones || [],
      advertencias: this.generarAdvertencias(patron, valor, esProhibido),
      esDocumento,
      esProhibido,
      palabrasClaveDetectadas: palabrasDetectadas
    };
    
    return resultado;
  }
  
  /**
   * Normaliza texto para búsqueda
   */
  private static normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Verifica si es un producto prohibido
   */
  private static verificarProhibido(descripcion: string): boolean {
    return PRODUCTOS_PROHIBIDOS.some(palabra => 
      descripcion.includes(palabra)
    );
  }
  
  /**
   * Verifica si es un documento
   */
  private static verificarDocumento(descripcion: string): boolean {
    const palabrasDocumento = [
      'document', 'documento', 'paper', 'papel', 'letter', 'carta',
      'contract', 'contrato', 'certificate', 'certificado', 'invoice',
      'factura', 'receipt', 'recibo', 'correspondence', 'correspondencia'
    ];
    
    return palabrasDocumento.some(palabra => descripcion.includes(palabra));
  }
  
  /**
   * Busca la mejor coincidencia en los patrones
   */
  private static buscarMejorCoincidencia(descripcion: string): {
    patron: PatronCategoria | null;
    confianza: number;
    palabrasDetectadas: string[];
  } {
    let mejorPatron: PatronCategoria | null = null;
    let mejorScore = 0;
    let palabrasDetectadas: string[] = [];
    
    for (const patron of PATRONES_CATEGORIA) {
      const palabrasEncontradas = patron.palabras.filter(palabra =>
        descripcion.includes(palabra)
      );
      
      if (palabrasEncontradas.length > 0) {
        // Score basado en cantidad de coincidencias y longitud de palabras
        const score = palabrasEncontradas.reduce((acc, p) => acc + p.length, 0);
        
        if (score > mejorScore) {
          mejorScore = score;
          mejorPatron = patron;
          palabrasDetectadas = palabrasEncontradas;
        }
      }
    }
    
    // Calcular confianza (0-100)
    const confianza = mejorPatron 
      ? Math.min(100, Math.round((mejorScore / 20) * 100))
      : 0;
    
    return { patron: mejorPatron, confianza, palabrasDetectadas };
  }
  
  /**
   * Determina la categoría aduanera basada en valor
   * H01 FIX: Usa ConfigService en lugar de hardcode
   */
  private static determinarCategoriaAduanera(
    valor: number,
    esDocumento: boolean
  ): CategoriaAduanera {
    if (esDocumento) return 'A';
    // H01: Usar configuración centralizada
    return ConfigService.clasificarPorValor(valor);
  }
  
  /**
   * Genera advertencias basadas en la clasificación
   */
  private static generarAdvertencias(
    patron: PatronCategoria | null,
    valor: number,
    esProhibido: boolean
  ): string[] {
    const advertencias: string[] = [];
    
    if (esProhibido) {
      advertencias.push('⚠️ PRODUCTO POSIBLEMENTE PROHIBIDO - Requiere revisión manual');
    }
    
    if (patron?.requierePermiso) {
      advertencias.push(`Requiere permiso de: ${patron.autoridades.join(', ')}`);
    }
    
    if (valor >= 2000) {
      advertencias.push('Valor alto - Requiere corredor de aduanas');
    }
    
    if (patron?.restricciones) {
      advertencias.push(...patron.restricciones);
    }
    
    return advertencias;
  }
  
  /**
   * Clasificación por defecto cuando no hay descripción
   */
  private static clasificacionPorDefecto(valor: number): ClasificacionInteligente {
    return {
      categoriaProducto: 'general',
      subcategoria: 'sin_clasificar',
      categoriaAduanera: this.determinarCategoriaAduanera(valor, false),
      confianza: 0,
      requierePermiso: false,
      autoridades: [],
      restricciones: [],
      advertencias: ['Sin descripción - Clasificación manual requerida'],
      esDocumento: false,
      esProhibido: false,
      palabrasClaveDetectadas: []
    };
  }
  
  /**
   * Obtiene el nombre legible de una categoría
   */
  static getNombreCategoria(categoria: CategoriaProducto): string {
    const nombres: Record<CategoriaProducto, string> = {
      medicamentos: 'Medicamentos',
      suplementos: 'Suplementos y Vitaminas',
      productos_medicos: 'Productos Médicos',
      veterinarios: 'Productos Veterinarios',
      electronica: 'Electrónica',
      computacion: 'Computación',
      telefonia: 'Telefonía',
      ropa: 'Ropa y Vestimenta',
      calzado: 'Calzado',
      accesorios: 'Accesorios',
      alimentos: 'Alimentos',
      bebidas: 'Bebidas',
      cosmeticos: 'Cosméticos',
      perfumeria: 'Perfumería',
      libros: 'Libros y Publicaciones',
      juguetes: 'Juguetes',
      deportes: 'Deportes',
      hogar: 'Hogar',
      herramientas: 'Herramientas',
      automotriz: 'Automotriz',
      joyeria: 'Joyería y Relojes',
      instrumentos: 'Instrumentos Musicales',
      arte: 'Arte y Artesanías',
      mascotas: 'Mascotas',
      bebes: 'Bebés',
      oficina: 'Oficina',
      jardineria: 'Jardinería',
      seguridad: 'Seguridad (Restringido)',
      documentos: 'Documentos',
      general: 'Mercancía General'
    };
    
    return nombres[categoria] || 'Sin Clasificar';
  }
  
  /**
   * Obtiene el nombre legible de la categoría aduanera
   */
  static getNombreCategoriaAduanera(categoria: CategoriaAduanera): string {
    const nombres: Record<CategoriaAduanera, string> = {
      A: 'Categoría A - Documentos',
      B: 'Categoría B - De Minimis (≤$100)',
      C: 'Categoría C - Bajo Valor ($100-$2,000)',
      D: 'Categoría D - Alto Valor (≥$2,000)'
    };
    
    return nombres[categoria];
  }
  
  /**
   * Obtiene estadísticas de los patrones
   */
  static obtenerEstadisticas(): {
    totalPatrones: number;
    totalPalabras: number;
    categorias: number;
    categoriasConPermiso: number;
  } {
    const palabrasUnicas = new Set<string>();
    let categoriasConPermiso = 0;
    
    for (const patron of PATRONES_CATEGORIA) {
      patron.palabras.forEach(p => palabrasUnicas.add(p));
      if (patron.requierePermiso) categoriasConPermiso++;
    }
    
    return {
      totalPatrones: PATRONES_CATEGORIA.length,
      totalPalabras: palabrasUnicas.size,
      categorias: new Set(PATRONES_CATEGORIA.map(p => p.categoria)).size,
      categoriasConPermiso
    };
  }
}
