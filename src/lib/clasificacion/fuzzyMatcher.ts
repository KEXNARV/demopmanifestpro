// ============================================
// FUZZY MATCHER - Sistema de Matching Inteligente
// Score mínimo de confianza: 85%
// ============================================

import { ARANCELES_COMPLETOS, expandirBusqueda } from '@/lib/aduanas/arancelesCompletos';
import type { Arancel } from '@/types/aduanas';

export interface MatchResult {
  arancel: Arancel;
  score: number; // 0-100
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'partial';
  confidence: 'high' | 'medium' | 'low';
  matchedTerms: string[];
}

export interface ClassificationResult {
  matches: MatchResult[];
  bestMatch: MatchResult | null;
  needsManualReview: boolean;
  ambiguous: boolean;
  suggestions: string[];
}

// Normalizar texto para comparación
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Solo alfanuméricos
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokenizar texto en palabras
function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(t => t.length >= 2);
}

// Algoritmo de distancia Levenshtein
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Calcular similitud entre 0 y 1
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.95;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - distance / maxLen);
}

// Calcular score de coincidencia por tokens
function calculateTokenScore(searchTokens: string[], targetTokens: string[]): number {
  if (searchTokens.length === 0 || targetTokens.length === 0) return 0;
  
  let totalScore = 0;
  let matchedTokens = 0;
  
  for (const searchToken of searchTokens) {
    let bestTokenScore = 0;
    
    for (const targetToken of targetTokens) {
      // Coincidencia exacta
      if (searchToken === targetToken) {
        bestTokenScore = Math.max(bestTokenScore, 1);
      }
      // Contiene
      else if (targetToken.includes(searchToken) || searchToken.includes(targetToken)) {
        bestTokenScore = Math.max(bestTokenScore, 0.9);
      }
      // Similitud fuzzy
      else {
        const sim = calculateSimilarity(searchToken, targetToken);
        if (sim > 0.7) {
          bestTokenScore = Math.max(bestTokenScore, sim * 0.8);
        }
      }
    }
    
    if (bestTokenScore > 0.5) {
      matchedTokens++;
      totalScore += bestTokenScore;
    }
  }
  
  // Score basado en proporción de tokens matcheados
  const coverage = matchedTokens / searchTokens.length;
  return coverage * (totalScore / searchTokens.length);
}

// Encontrar matches para un producto
export function findMatches(
  productDescription: string,
  minScore: number = 85
): ClassificationResult {
  const searchTokens = tokenize(productDescription);
  const expandedTerms = expandirBusqueda(productDescription);
  const matches: MatchResult[] = [];
  const matchedTermsSet = new Set<string>();
  
  for (const arancel of ARANCELES_COMPLETOS) {
    const targetText = `${arancel.descripcion} ${arancel.categoria || ''}`;
    const targetTokens = tokenize(targetText);
    
    // Score base por tokens
    let score = calculateTokenScore(searchTokens, targetTokens) * 100;
    let matchType: MatchResult['matchType'] = 'partial';
    
    // Boost por código arancelario
    const hsCodeNorm = normalizeText(arancel.hsCode);
    const productNorm = normalizeText(productDescription);
    if (productNorm.includes(hsCodeNorm.replace(/\./g, '').slice(0, 4))) {
      score = Math.max(score, 95);
      matchType = 'exact';
    }
    
    // Boost por sinónimos expandidos
    for (const term of expandedTerms) {
      const termNorm = normalizeText(term);
      if (targetTokens.some(t => t.includes(termNorm) || termNorm.includes(t))) {
        score = Math.min(100, score + 10);
        matchType = matchType === 'partial' ? 'synonym' : matchType;
        matchedTermsSet.add(term);
      }
    }
    
    // Boost por coincidencia exacta de descripción
    const descSimilarity = calculateSimilarity(productDescription, arancel.descripcion);
    if (descSimilarity > 0.8) {
      score = Math.max(score, descSimilarity * 100);
      matchType = 'exact';
    }
    
    // Solo incluir si supera umbral mínimo
    if (score >= minScore * 0.5) { // Umbral más bajo para sugerencias
      const confidence: MatchResult['confidence'] = 
        score >= 90 ? 'high' : score >= 75 ? 'medium' : 'low';
      
      matches.push({
        arancel,
        score: Math.round(score),
        matchType,
        confidence,
        matchedTerms: Array.from(matchedTermsSet)
      });
    }
  }
  
  // Ordenar por score descendente
  matches.sort((a, b) => b.score - a.score);
  
  // Tomar top 5 matches
  const topMatches = matches.slice(0, 5);
  
  // Determinar si es ambiguo (múltiples matches con score similar alto)
  const ambiguous = topMatches.length >= 2 && 
    topMatches[0].score >= minScore &&
    topMatches[1].score >= minScore &&
    topMatches[0].score - topMatches[1].score < 10;
  
  // Best match solo si supera umbral
  const bestMatch = topMatches.length > 0 && topMatches[0].score >= minScore 
    ? topMatches[0] 
    : null;
  
  // Necesita revisión manual si no hay match o es ambiguo
  const needsManualReview = !bestMatch || ambiguous || bestMatch.confidence !== 'high';
  
  // Sugerencias para búsqueda alternativa
  const suggestions: string[] = [];
  if (!bestMatch) {
    suggestions.push('Intente con términos más específicos');
    suggestions.push('Use el código arancelario si lo conoce');
    suggestions.push('Busque por categoría de producto');
  }
  
  return {
    matches: topMatches,
    bestMatch,
    needsManualReview,
    ambiguous,
    suggestions
  };
}

// Validar código arancelario
export function validateHSCode(hsCode: string): boolean {
  // Formato esperado: XXXX.XX.XX.XX
  const regex = /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/;
  if (!regex.test(hsCode)) return false;
  
  // Verificar que existe en la base de datos
  return ARANCELES_COMPLETOS.some(a => a.hsCode === hsCode);
}

// Buscar por código arancelario exacto
export function findByHSCode(hsCode: string): Arancel | null {
  return ARANCELES_COMPLETOS.find(a => a.hsCode === hsCode) || null;
}

// Clasificar producto con toda la información
export function classifyProduct(
  description: string,
  valorCIF?: number
): ClassificationResult & { 
  regulatoryAlerts: RegulatoryAlert[];
  taxCalculation?: TaxCalculation;
} {
  const result = findMatches(description);
  
  // Obtener alertas regulatorias del mejor match
  const regulatoryAlerts = result.bestMatch 
    ? getRequiredPermits(result.bestMatch.arancel)
    : [];
  
  // Calcular impuestos si hay valor CIF y best match
  const taxCalculation = result.bestMatch && valorCIF
    ? calculateTaxes(result.bestMatch.arancel, valorCIF)
    : undefined;
  
  return {
    ...result,
    regulatoryAlerts,
    taxCalculation
  };
}

// ============================================
// SISTEMA DE ENTIDADES REGULADORAS
// ============================================

export interface RegulatoryAlert {
  entity: string;
  entityCode: string;
  requirement: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
}

const REGULATORY_RULES: {
  pattern: RegExp | ((arancel: Arancel) => boolean);
  alerts: Omit<RegulatoryAlert, 'severity'>[];
}[] = [
  // Farmacia y Drogas
  {
    pattern: (a) => a.hsCode.startsWith('3004') || a.categoria === 'Farmacéuticos',
    alerts: [{
      entity: 'Dirección Nacional de Farmacia y Drogas',
      entityCode: 'DNFD',
      requirement: 'Registro Sanitario y Licencia de Importación',
      description: 'Medicamentos requieren autorización previa del MINSA'
    }]
  },
  // Suplementos
  {
    pattern: (a) => a.hsCode.startsWith('2106.90') || a.categoria === 'Suplementos',
    alerts: [{
      entity: 'Dirección de Farmacia y Drogas',
      entityCode: 'DNFD',
      requirement: 'Notificación Sanitaria Obligatoria',
      description: 'Suplementos alimenticios requieren NSO del MINSA'
    }]
  },
  // Vitaminas
  {
    pattern: (a) => a.hsCode.startsWith('2936') || a.descripcion.toLowerCase().includes('vitamina'),
    alerts: [{
      entity: 'Dirección de Farmacia y Drogas',
      entityCode: 'DNFD',
      requirement: 'Registro como Suplemento o Medicamento',
      description: 'Vitaminas pueden requerir registro según concentración'
    }]
  },
  // Equipos médicos
  {
    pattern: (a) => a.hsCode.startsWith('9018') || a.hsCode.startsWith('9019') || a.hsCode.startsWith('9021') || a.categoria === 'Médico',
    alerts: [{
      entity: 'Ministerio de Salud (MINSA)',
      entityCode: 'MINSA',
      requirement: 'Registro de Dispositivo Médico',
      description: 'Equipos médicos requieren certificación y registro sanitario'
    }]
  },
  // Productos agrícolas
  {
    pattern: (a) => /^0[1-9]|^1[0-4]/.test(a.hsCode),
    alerts: [{
      entity: 'Ministerio de Desarrollo Agropecuario',
      entityCode: 'MIDA',
      requirement: 'Certificado Fitosanitario/Zoosanitario',
      description: 'Productos agrícolas y animales requieren permisos MIDA'
    }]
  },
  // Semillas
  {
    pattern: (a) => a.hsCode.startsWith('1209'),
    alerts: [{
      entity: 'MIDA - Dirección de Sanidad Vegetal',
      entityCode: 'MIDA-DSV',
      requirement: 'Permiso de Importación de Semillas',
      description: 'Semillas para siembra requieren autorización especial'
    }]
  },
  // Alimentos para mascotas
  {
    pattern: (a) => a.hsCode.startsWith('2309') || a.categoria === 'Mascotas',
    alerts: [{
      entity: 'MIDA - Dirección de Salud Animal',
      entityCode: 'MIDA-DSA',
      requirement: 'Registro de Alimento para Animales',
      description: 'Alimentos para mascotas requieren registro MIDA'
    }]
  },
  // Carnes
  {
    pattern: (a) => a.hsCode.startsWith('02'),
    alerts: [
      {
        entity: 'Autoridad Panameña de Seguridad de Alimentos',
        entityCode: 'APA',
        requirement: 'Certificado Zoosanitario',
        description: 'Carnes requieren certificación sanitaria de origen'
      },
      {
        entity: 'MINSA',
        entityCode: 'MINSA',
        requirement: 'Permiso de Importación',
        description: 'Productos cárnicos requieren autorización MINSA'
      }
    ]
  },
  // Pescados y mariscos
  {
    pattern: (a) => a.hsCode.startsWith('03'),
    alerts: [{
      entity: 'Autoridad Panameña de Seguridad de Alimentos',
      entityCode: 'APA',
      requirement: 'Certificado Sanitario de Productos Pesqueros',
      description: 'Mariscos y pescados requieren certificación APA'
    }]
  },
  // Lácteos
  {
    pattern: (a) => a.hsCode.startsWith('04'),
    alerts: [{
      entity: 'APA',
      entityCode: 'APA',
      requirement: 'Certificado Zoosanitario para Lácteos',
      description: 'Productos lácteos requieren certificación de origen'
    }]
  },
  // Electrónicos
  {
    pattern: (a) => a.hsCode.startsWith('85') || a.categoria === 'Electrónica',
    alerts: [{
      entity: 'ACODECO',
      entityCode: 'ACODECO',
      requirement: 'Etiquetado en Español',
      description: 'Productos electrónicos requieren etiquetado y garantía'
    }]
  },
  // Juguetes
  {
    pattern: (a) => a.hsCode.startsWith('9503') || a.categoria === 'Juguetes',
    alerts: [{
      entity: 'ACODECO',
      entityCode: 'ACODECO',
      requirement: 'Certificación de Seguridad',
      description: 'Juguetes requieren cumplir normas de seguridad'
    }]
  },
  // Tabaco y Vapers
  {
    pattern: (a) => a.hsCode.startsWith('24') || a.hsCode.startsWith('9614') || a.categoria === 'Tabaco',
    alerts: [{
      entity: 'Ministerio de Salud',
      entityCode: 'MINSA',
      requirement: 'Regulación Especial de Tabaco',
      description: '⚠️ Productos de tabaco y vapers tienen regulaciones sanitarias estrictas. DAI elevado aplicable.'
    }]
  },
  // DAI alto (> 100%)
  {
    pattern: (a) => a.daiPercent > 100,
    alerts: [{
      entity: 'Autoridad Nacional de Aduanas',
      entityCode: 'ANA',
      requirement: 'Atención Especial - DAI Elevado',
      description: `Producto con DAI superior al 100%. Verificar contingentes arancelarios.`
    }]
  }
];

export function getRequiredPermits(arancel: Arancel): RegulatoryAlert[] {
  const alerts: RegulatoryAlert[] = [];
  
  for (const rule of REGULATORY_RULES) {
    const matches = typeof rule.pattern === 'function' 
      ? rule.pattern(arancel)
      : rule.pattern.test(arancel.hsCode);
    
    if (matches) {
      for (const alert of rule.alerts) {
        const severity: RegulatoryAlert['severity'] = 
          alert.entityCode === 'MINSA' || alert.entityCode === 'DNFD' ? 'critical' :
          alert.entityCode === 'ANA' ? 'warning' : 'info';
        
        alerts.push({ ...alert, severity });
      }
    }
  }
  
  return alerts;
}

// ============================================
// CALCULADORA DE IMPUESTOS
// ============================================

export interface TaxCalculation {
  valorCIF: number;
  daiPercent: number;
  daiAmount: number;
  baseITBMS: number;
  itbmsPercent: number;
  itbmsAmount: number;
  totalTributos: number;
  totalAPagar: number;
  isExempt: boolean;
  exemptionReason?: string;
  breakdown: {
    label: string;
    value: number;
    formula: string;
  }[];
}

export function calculateTaxes(arancel: Arancel, valorCIF: number): TaxCalculation {
  const daiPercent = arancel.daiPercent;
  const itbmsPercent = arancel.itbmsPercent;
  
  // Calcular DAI
  const daiAmount = valorCIF * (daiPercent / 100);
  
  // Base para ITBMS (CIF + DAI)
  const baseITBMS = valorCIF + daiAmount;
  
  // Calcular ITBMS
  const itbmsAmount = baseITBMS * (itbmsPercent / 100);
  
  // Total tributos
  const totalTributos = daiAmount + itbmsAmount;
  
  // Total a pagar
  const totalAPagar = valorCIF + totalTributos;
  
  // Verificar exención
  const isExempt = daiPercent === 0 && itbmsPercent === 0;
  const exemptionReason = isExempt 
    ? 'Producto exento de DAI e ITBMS según legislación panameña'
    : itbmsPercent === 0 
      ? 'Exento de ITBMS - Solo aplica DAI'
      : undefined;
  
  // Desglose detallado
  const breakdown: TaxCalculation['breakdown'] = [
    { label: 'Valor CIF', value: valorCIF, formula: 'FOB + Flete + Seguro' },
    { label: `DAI (${daiPercent}%)`, value: daiAmount, formula: `CIF × ${daiPercent}%` },
    { label: 'Base ITBMS', value: baseITBMS, formula: 'CIF + DAI' },
    { label: `ITBMS (${itbmsPercent}%)`, value: itbmsAmount, formula: `Base × ${itbmsPercent}%` },
    { label: 'Total Tributos', value: totalTributos, formula: 'DAI + ITBMS' },
    { label: 'Total a Pagar', value: totalAPagar, formula: 'CIF + Tributos' }
  ];
  
  return {
    valorCIF,
    daiPercent,
    daiAmount,
    baseITBMS,
    itbmsPercent,
    itbmsAmount,
    totalTributos,
    totalAPagar,
    isExempt,
    exemptionReason,
    breakdown
  };
}

// ============================================
// VALIDACIONES DE SEGURIDAD
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateClassification(
  arancel: Arancel,
  valorCIF: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar código arancelario
  if (!validateHSCode(arancel.hsCode)) {
    errors.push(`Código arancelario inválido: ${arancel.hsCode}`);
  }
  
  // Validar DAI
  if (arancel.daiPercent < 0 || arancel.daiPercent > 300) {
    errors.push(`DAI fuera de rango válido: ${arancel.daiPercent}%`);
  }
  
  // Validar ITBMS
  if (arancel.itbmsPercent < 0 || arancel.itbmsPercent > 15) {
    errors.push(`ITBMS fuera de rango válido: ${arancel.itbmsPercent}%`);
  }
  
  // Alertar productos controlados
  if (arancel.categoria === 'Tabaco') {
    warnings.push('⚠️ Producto controlado: Tabaco. Verificar regulaciones sanitarias adicionales.');
  }
  
  if (arancel.daiPercent > 100) {
    warnings.push(`⚠️ DAI elevado (${arancel.daiPercent}%). Verificar contingentes arancelarios.`);
  }
  
  // Validar coherencia de unidad de medida
  const unidadesValidas = ['u', 'kg', 'l', 'par', 'm2', 'm3', 'gal', 'g'];
  if (!unidadesValidas.includes(arancel.unidad || '')) {
    warnings.push(`Unidad de medida inusual: ${arancel.unidad}`);
  }
  
  // Validar valor CIF
  if (valorCIF < 0) {
    errors.push('Valor CIF no puede ser negativo');
  }
  
  if (valorCIF > 50000) {
    warnings.push('Valor CIF elevado. Verificar requisitos de corredor aduanal.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// CASOS DE PRUEBA
// ============================================

export const TEST_CASES = [
  {
    input: 'Laptop Dell',
    expectedHSCode: '8471.30.00.00',
    expectedDAI: 0,
    expectedITBMS: 7,
    requiredEntities: ['ACODECO']
  },
  {
    input: 'Pollo congelado',
    expectedHSCode: '0207.12.00.00',
    expectedDAI: 260,
    expectedITBMS: 0,
    requiredEntities: ['APA', 'MINSA']
  },
  {
    input: 'Vitamina C',
    expectedHSCode: '2936.29.00.00',
    expectedDAI: 0,
    expectedITBMS: 0,
    requiredEntities: ['DNFD']
  },
  {
    input: 'iPhone 15',
    expectedHSCode: '8517.13.00.00',
    expectedDAI: 0,
    expectedITBMS: 7,
    requiredEntities: ['ACODECO']
  },
  {
    input: 'Tarjeta de video GPU',
    expectedHSCode: '8473.30.00.00',
    expectedDAI: 0,
    expectedITBMS: 7,
    requiredEntities: ['ACODECO']
  }
];

export function runTestCases(): { passed: number; failed: number; results: any[] } {
  const results: any[] = [];
  let passed = 0;
  let failed = 0;
  
  for (const testCase of TEST_CASES) {
    const classification = classifyProduct(testCase.input);
    const match = classification.bestMatch;
    
    const testResult = {
      input: testCase.input,
      expectedHSCode: testCase.expectedHSCode,
      actualHSCode: match?.arancel.hsCode,
      matchScore: match?.score,
      hsCodeMatch: match?.arancel.hsCode === testCase.expectedHSCode,
      daiMatch: match?.arancel.daiPercent === testCase.expectedDAI,
      itbmsMatch: match?.arancel.itbmsPercent === testCase.expectedITBMS,
      regulatoryAlerts: classification.regulatoryAlerts.map(a => a.entityCode),
      passed: false
    };
    
    testResult.passed = testResult.hsCodeMatch && testResult.daiMatch && testResult.itbmsMatch;
    
    if (testResult.passed) {
      passed++;
    } else {
      failed++;
    }
    
    results.push(testResult);
  }
  
  return { passed, failed, results };
}
