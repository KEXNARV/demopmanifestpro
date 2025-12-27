// ============================================
// SISTEMA DE FIRMA DIGITAL SHA-256
// Firma legal antes de descarga
// ============================================

export interface FirmaDigital {
  hash: string;
  timestamp: string;
  corredorId: string;
  corredorNombre: string;
  documentoId: string;
  clausulaAceptada: boolean;
}

export const CLAUSULA_RESPONSABILIDAD = `
CLÁUSULA DE RESPONSABILIDAD TÉCNICA

El suscrito, en calidad de Corredor de Aduanas debidamente autorizado por la
Autoridad Nacional de Aduanas de Panamá, DECLARO BAJO JURAMENTO que:

1. He verificado la exactitud de los datos contenidos en este documento.
2. Las clasificaciones arancelarias corresponden a la naturaleza de las mercancías.
3. Los valores declarados reflejan el valor de transacción real.
4. Asumo responsabilidad por cualquier inexactitud en la información proporcionada.

De conformidad con el Decreto de Gabinete No. 41 de 2002 y la Resolución 049-2025.
`;

export async function generarFirmaDigital(
  contenido: string,
  corredorId: string,
  corredorNombre: string,
  documentoId: string
): Promise<FirmaDigital> {
  const timestamp = new Date().toISOString();
  const dataToSign = `${contenido}|${corredorId}|${timestamp}|${documentoId}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    hash,
    timestamp,
    corredorId,
    corredorNombre,
    documentoId,
    clausulaAceptada: true
  };
}

export function verificarFirma(firma: FirmaDigital): boolean {
  return firma.hash.length === 64 && firma.clausulaAceptada;
}
