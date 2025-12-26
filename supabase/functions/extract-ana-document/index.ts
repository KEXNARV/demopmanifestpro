import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_TEXT_LENGTH = 100000; // 100KB para documentos grandes
const MAX_FILENAME_LENGTH = 255;
const MIN_TEXT_LENGTH = 50;

// Tipos de documento ANA
type TipoDocumentoANA = 'declaracion' | 'boleta' | 'manifiesto' | 'factura_comercial' | 'desconocido';

interface IdentificadoresLogisticos {
  numeroDeclaracion: string | null;        // DE2025121838660-10
  numeroControlBoleta: string | null;      // 25127661338D
  rucImportador: string | null;            // 8-814-52
  nombreConsignatario: string | null;
  fechaDocumento: string | null;
  aduanaDestino: string | null;
  regimenAduanero: string | null;
  tipoDespacho: string | null;
}

interface LineaArticulo {
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

interface TotalesBoleta {
  montoTotal: number;                      // B/. 56.66
  subtotalArancel: number;
  subtotalITBMS: number;
  subtotalOtros: number;
  moneda: string;
}

interface TotalesDeclaracion {
  valorFOBTotal: number;
  valorFleteTotal: number;
  valorSeguroTotal: number;
  valorCIFTotal: number;
  totalImpuestos: number;
}

interface VerificacionCruzada {
  coincide: boolean;
  montoBoleta: number;
  montoDeclaracion: number;
  diferencia: number;
  porcentajeDiferencia: number;
  alertaDiscrepancia: boolean;
}

interface DatosExtraidosANA {
  tipoDocumento: TipoDocumentoANA;
  identificadores: IdentificadoresLogisticos;
  lineasArticulo: LineaArticulo[];
  totalesBoleta: TotalesBoleta | null;
  totalesDeclaracion: TotalesDeclaracion | null;
  verificacionCruzada: VerificacionCruzada | null;
  alertas: string[];
  metadatos: {
    fechaProcesamiento: string;
    confianzaExtraccion: number;  // 0-100
    camposEncontrados: number;
    camposEsperados: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // AUTHENTICATION CHECK
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError?.message);
      return new Response(
        JSON.stringify({ error: 'Usuario sin rol asignado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['operador', 'revisor', 'auditor', 'admin'];
    if (!allowedRoles.includes(roleData.role)) {
      console.error('Insufficient permissions for role:', roleData.role);
      return new Response(
        JSON.stringify({ error: 'Permiso denegado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // INPUT VALIDATION
    // ============================================
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_TEXT_LENGTH + 2000) {
      console.error('Request payload too large:', contentLength);
      return new Response(
        JSON.stringify({ error: 'Payload demasiado grande' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { textoDocumento, nombreArchivo, tipoDocumento } = body;

    if (typeof textoDocumento !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Tipo de datos inválido para textoDocumento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!textoDocumento || textoDocumento.trim().length < MIN_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'El texto del documento es demasiado corto o está vacío' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (textoDocumento.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Texto demasiado largo (máximo ${MAX_TEXT_LENGTH} caracteres)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nombreArchivo) {
      if (typeof nombreArchivo !== 'string' || nombreArchivo.length > MAX_FILENAME_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'Nombre de archivo inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const safeFilenamePattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._\-\s()[\]]+$/;
      if (!safeFilenamePattern.test(nombreArchivo)) {
        return new Response(
          JSON.stringify({ error: 'Nombre de archivo contiene caracteres no permitidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // PROCESS DOCUMENT WITH AI
    // ============================================
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY no está configurado');
      return new Response(
        JSON.stringify({ error: 'Configuración de servicio incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeLogFilename = (nombreArchivo || 'sin nombre').substring(0, 100).replace(/[\r\n]/g, '');
    console.log(`Usuario ${user.id} procesando documento ANA: ${safeLogFilename}, longitud: ${textoDocumento.length}`);

    // System prompt especializado para documentos ANA de Panamá
    const systemPrompt = `Eres un experto en extracción de datos de documentos aduaneros de la Autoridad Nacional de Aduanas (ANA) de Panamá.

TIPOS DE DOCUMENTOS QUE PUEDES PROCESAR:
1. DECLARACIÓN DE IMPORTACIÓN: Contiene "Declaración", número como "DE2025121838660-10"
2. BOLETA DE PAGO: Contiene "Boleta", "Control de Boleta" como "25127661338D"
3. MANIFIESTO DE CARGA: Lista de mercancías con AWBs
4. FACTURA COMERCIAL: Invoice, Commercial Invoice

CAMPOS A EXTRAER:

## Identificadores Logísticos:
- numeroDeclaracion: Formato DEAAAAMMxxxxxxx-xx (ej: DE2025121838660-10)
- numeroControlBoleta: Código alfanumérico de 11-12 caracteres (ej: 25127661338D)
- rucImportador: Formato X-XXX-XXXX o número (ej: 8-814-52, 155555-1-464949)
- nombreConsignatario: Nombre de persona o empresa
- fechaDocumento: Fecha del documento
- aduanaDestino: Nombre de aduana (ej: Tocumen, Colón, etc.)
- regimenAduanero: Tipo de régimen (ej: Importación definitiva)

## Líneas de Artículo (para cada producto):
- secuencia: Número de línea
- fraccionArancelaria: Código de 12 dígitos (ej: 950300990090)
- descripcion: Texto descriptivo del producto
- codigoReferencia: Código de referencia/SKU (ej: AMZPSR019357825)
- cantidad: Cantidad numérica
- unidadMedida: KG, UN, PZ, etc.
- pesoKg: Peso en kilogramos
- valorFOB: Valor Free On Board en USD o B/.
- valorFlete: Costo de flete
- valorSeguro: Costo de seguro
- valorCIF: FOB + Flete + Seguro
- paisOrigen: País de origen del producto
- impuestoArancel: Monto de arancel
- impuestoITBMS: ITBMS (7%)
- otrosImpuestos: Otros impuestos

## Totales de Boleta:
- montoTotal: Total a pagar (ej: B/. 56.66)
- subtotalArancel: Total aranceles
- subtotalITBMS: Total ITBMS
- subtotalOtros: Otros cargos
- moneda: B/. o USD

## Totales de Declaración:
- valorFOBTotal: Suma de todos los FOB
- valorFleteTotal: Suma de fletes
- valorSeguroTotal: Suma de seguros
- valorCIFTotal: Suma de CIF
- totalImpuestos: Suma de todos los impuestos

REGLAS IMPORTANTES:
1. Extrae TODOS los productos/líneas que encuentres
2. Las fracciones arancelarias son de 12 dígitos
3. Los valores monetarios deben ser números (sin símbolos)
4. Si un campo no existe, usa null
5. Detecta automáticamente el tipo de documento
6. Genera alertas si hay inconsistencias en los totales`;

    const userPrompt = `Analiza este documento de la ANA de Panamá y extrae todos los datos estructurados.
${tipoDocumento ? `Tipo de documento esperado: ${tipoDocumento}` : ''}

TEXTO DEL DOCUMENTO:
${textoDocumento.substring(0, 15000)}

Responde SOLO con un JSON válido con esta estructura:
{
  "tipoDocumento": "declaracion" | "boleta" | "manifiesto" | "factura_comercial" | "desconocido",
  "identificadores": {
    "numeroDeclaracion": "string o null",
    "numeroControlBoleta": "string o null",
    "rucImportador": "string o null",
    "nombreConsignatario": "string o null",
    "fechaDocumento": "string o null",
    "aduanaDestino": "string o null",
    "regimenAduanero": "string o null",
    "tipoDespacho": "string o null"
  },
  "lineasArticulo": [
    {
      "secuencia": number,
      "fraccionArancelaria": "string 12 dígitos",
      "descripcion": "string",
      "codigoReferencia": "string o null",
      "cantidad": number,
      "unidadMedida": "string",
      "pesoKg": number o null,
      "valorFOB": number,
      "valorFlete": number,
      "valorSeguro": number,
      "valorCIF": number,
      "paisOrigen": "string o null",
      "impuestoArancel": number o null,
      "impuestoITBMS": number o null,
      "otrosImpuestos": number o null
    }
  ],
  "totalesBoleta": {
    "montoTotal": number,
    "subtotalArancel": number,
    "subtotalITBMS": number,
    "subtotalOtros": number,
    "moneda": "string"
  } o null,
  "totalesDeclaracion": {
    "valorFOBTotal": number,
    "valorFleteTotal": number,
    "valorSeguroTotal": number,
    "valorCIFTotal": number,
    "totalImpuestos": number
  } o null,
  "alertas": ["string"],
  "metadatos": {
    "confianzaExtraccion": number 0-100,
    "camposEncontrados": number,
    "camposEsperados": number
  }
}`;

    // Call AI with tool calling for structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extraer_datos_ana',
              description: 'Extrae datos estructurados de documentos ANA de Panamá',
              parameters: {
                type: 'object',
                properties: {
                  tipoDocumento: {
                    type: 'string',
                    enum: ['declaracion', 'boleta', 'manifiesto', 'factura_comercial', 'desconocido']
                  },
                  identificadores: {
                    type: 'object',
                    properties: {
                      numeroDeclaracion: { type: ['string', 'null'] },
                      numeroControlBoleta: { type: ['string', 'null'] },
                      rucImportador: { type: ['string', 'null'] },
                      nombreConsignatario: { type: ['string', 'null'] },
                      fechaDocumento: { type: ['string', 'null'] },
                      aduanaDestino: { type: ['string', 'null'] },
                      regimenAduanero: { type: ['string', 'null'] },
                      tipoDespacho: { type: ['string', 'null'] }
                    }
                  },
                  lineasArticulo: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        secuencia: { type: 'number' },
                        fraccionArancelaria: { type: 'string' },
                        descripcion: { type: 'string' },
                        codigoReferencia: { type: ['string', 'null'] },
                        cantidad: { type: 'number' },
                        unidadMedida: { type: 'string' },
                        pesoKg: { type: ['number', 'null'] },
                        valorFOB: { type: 'number' },
                        valorFlete: { type: 'number' },
                        valorSeguro: { type: 'number' },
                        valorCIF: { type: 'number' },
                        paisOrigen: { type: ['string', 'null'] },
                        impuestoArancel: { type: ['number', 'null'] },
                        impuestoITBMS: { type: ['number', 'null'] },
                        otrosImpuestos: { type: ['number', 'null'] }
                      },
                      required: ['secuencia', 'descripcion', 'valorFOB', 'valorCIF']
                    }
                  },
                  totalesBoleta: {
                    type: ['object', 'null'],
                    properties: {
                      montoTotal: { type: 'number' },
                      subtotalArancel: { type: 'number' },
                      subtotalITBMS: { type: 'number' },
                      subtotalOtros: { type: 'number' },
                      moneda: { type: 'string' }
                    }
                  },
                  totalesDeclaracion: {
                    type: ['object', 'null'],
                    properties: {
                      valorFOBTotal: { type: 'number' },
                      valorFleteTotal: { type: 'number' },
                      valorSeguroTotal: { type: 'number' },
                      valorCIFTotal: { type: 'number' },
                      totalImpuestos: { type: 'number' }
                    }
                  },
                  alertas: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  metadatos: {
                    type: 'object',
                    properties: {
                      confianzaExtraccion: { type: 'number' },
                      camposEncontrados: { type: 'number' },
                      camposEsperados: { type: 'number' }
                    }
                  }
                },
                required: ['tipoDocumento', 'identificadores', 'lineasArticulo', 'alertas', 'metadatos']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extraer_datos_ana' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de AI gateway: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Intente de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Contacte al administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al procesar con IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI Response received');

    let extractedData: DatosExtraidosANA;

    // Check for tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error('Error parsing tool call arguments:', parseError);
        // Fallback to content parsing
        const content = aiResponse.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          extractedData = JSON.parse(jsonMatch ? jsonMatch[1] : content);
        } else {
          throw new Error('No valid response from AI');
        }
      }
    } else {
      // Fallback: parse from content
      const content = aiResponse.choices?.[0]?.message?.content;
      if (!content) {
        return new Response(
          JSON.stringify({ error: 'Respuesta vacía de IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      extractedData = JSON.parse(jsonMatch ? jsonMatch[1] : content.trim());
    }

    // ============================================
    // CROSS-VERIFICATION OF TOTALS
    // ============================================
    let verificacionCruzada: VerificacionCruzada | null = null;

    if (extractedData.totalesBoleta && extractedData.totalesDeclaracion) {
      const montoBoleta = extractedData.totalesBoleta.montoTotal || 0;
      const montoDeclaracion = extractedData.totalesDeclaracion.totalImpuestos || 0;
      const diferencia = Math.abs(montoBoleta - montoDeclaracion);
      const porcentajeDiferencia = montoDeclaracion > 0 
        ? (diferencia / montoDeclaracion) * 100 
        : 0;

      verificacionCruzada = {
        coincide: diferencia < 0.01,
        montoBoleta,
        montoDeclaracion,
        diferencia,
        porcentajeDiferencia,
        alertaDiscrepancia: diferencia >= 0.01
      };

      if (verificacionCruzada.alertaDiscrepancia) {
        extractedData.alertas = extractedData.alertas || [];
        extractedData.alertas.push(
          `⚠️ ALERTA DE DISCREPANCIA FINANCIERA: El monto de la boleta (B/. ${montoBoleta.toFixed(2)}) ` +
          `no coincide con el total de impuestos de la declaración (B/. ${montoDeclaracion.toFixed(2)}). ` +
          `Diferencia: B/. ${diferencia.toFixed(2)} (${porcentajeDiferencia.toFixed(2)}%)`
        );
      }
    }

    // Also verify sum of line items
    if (extractedData.lineasArticulo && extractedData.lineasArticulo.length > 0) {
      const sumaCIF = extractedData.lineasArticulo.reduce((sum, item) => sum + (item.valorCIF || 0), 0);
      const sumaImpuestos = extractedData.lineasArticulo.reduce((sum, item) => 
        sum + (item.impuestoArancel || 0) + (item.impuestoITBMS || 0) + (item.otrosImpuestos || 0), 0);

      if (extractedData.totalesDeclaracion) {
        const difCIF = Math.abs(sumaCIF - (extractedData.totalesDeclaracion.valorCIFTotal || 0));
        if (difCIF > 0.01) {
          extractedData.alertas = extractedData.alertas || [];
          extractedData.alertas.push(
            `⚠️ La suma de valores CIF por línea (B/. ${sumaCIF.toFixed(2)}) ` +
            `difiere del total declarado (B/. ${extractedData.totalesDeclaracion.valorCIFTotal?.toFixed(2)})`
          );
        }
      }
    }

    // Add verification result to response
    extractedData.verificacionCruzada = verificacionCruzada;

    // Add processing timestamp
    extractedData.metadatos = {
      ...extractedData.metadatos,
      fechaProcesamiento: new Date().toISOString()
    };

    console.log(`Extracción completada: ${extractedData.tipoDocumento}, ${extractedData.lineasArticulo?.length || 0} líneas, ${extractedData.alertas?.length || 0} alertas`);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en extract-ana-document:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
