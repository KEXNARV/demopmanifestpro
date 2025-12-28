import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to known application domains
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://www.lovable.dev',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface ClasificacionRequest {
  descripcion: string;
  lineItemsFactura?: string[];
  peso?: number;
  valor?: number;
}

interface ClasificacionResponse {
  hsCode: string;
  descripcionArancelaria: string;
  confianza: number;
  razonamiento: string;
  terminosSensibles: Array<{
    termino: string;
    categoria: string;
    riesgo: 'alto' | 'medio' | 'bajo';
    autoridad?: string;
  }>;
  requiereRevision: boolean;
  motivoRevision?: string;
  sugerenciasAlternativas?: Array<{
    hsCode: string;
    descripcion: string;
    confianza: number;
  }>;
}

const SYSTEM_PROMPT = `Eres un experto clasificador arancelario para la Autoridad Nacional de Aduanas de Panamá (ANA).
Tu trabajo es analizar descripciones de productos y asignar códigos HTS (Sistema Armonizado) precisos.

REGLAS DE CLASIFICACIÓN:
1. Analiza la descripción completa incluyendo líneas de factura si están disponibles
2. Identifica materiales, función, uso previsto del producto
3. Detecta términos sensibles que requieran permisos especiales
4. Asigna el código HTS de 8-10 dígitos más específico posible
5. Si la descripción es genérica o ambigua, indica que requiere revisión manual

CÓDIGOS HTS COMUNES PANAMÁ:
- 9503: Juguetes (9503.00.99 genérico)
- 8471: Computadoras y partes (8471.30.01 laptops)
- 8517: Teléfonos celulares (8517.12.00)
- 6110: Ropa de punto (6110.20.00 algodón)
- 4202: Maletas y bolsos (4202.12.01)
- 8528: Monitores/TV (8528.52.01)
- 3304: Cosméticos (3304.99.00)
- 3004: Medicamentos (3004.90.99)
- 0901: Café (0901.21.00 tostado)
- 2106: Suplementos alimenticios (2106.90.99)

AUTORIDADES REGULADORAS:
- MINSA: Productos médicos, farmacéuticos, alimentos, cosméticos
- MIDA: Productos agrícolas, plantas, semillas
- MINGOB: Armas, explosivos, equipos de seguridad
- ASEP: Equipos de radio, telecomunicaciones
- APA: Productos pesqueros
- ACODECO: Productos de consumo regulados

TÉRMINOS DE ALTO RIESGO (siempre marcar revisión):
- Baterías de litio, productos químicos, farmacéuticos
- Dispositivos inalámbricos, drones, GPS
- Armas, munición, explosivos
- Sustancias controladas

Responde SIEMPRE en formato JSON válido.`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descripcion, lineItemsFactura, peso, valor } = await req.json() as ClasificacionRequest;
    
    if (!descripcion) {
      return new Response(
        JSON.stringify({ error: 'Descripción requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    // Construir prompt con toda la información disponible
    let userPrompt = `Clasifica el siguiente producto para importación a Panamá:

DESCRIPCIÓN DEL MANIFIESTO:
"${descripcion}"`;

    if (lineItemsFactura && lineItemsFactura.length > 0) {
      userPrompt += `

LÍNEAS DE FACTURA COMERCIAL:
${lineItemsFactura.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
    }

    if (peso) {
      userPrompt += `\n\nPESO: ${peso} kg`;
    }

    if (valor) {
      userPrompt += `\nVALOR DECLARADO: USD ${valor}`;
    }

    userPrompt += `

Responde en JSON con esta estructura exacta:
{
  "hsCode": "código HTS de 8-10 dígitos",
  "descripcionArancelaria": "descripción oficial del código",
  "confianza": número 0-100,
  "razonamiento": "explicación breve de por qué se asigna este código",
  "terminosSensibles": [
    {
      "termino": "palabra detectada",
      "categoria": "salud|seguridad|electronico|quimico|regulado",
      "riesgo": "alto|medio|bajo",
      "autoridad": "MINSA|MIDA|MINGOB|ASEP|etc (si aplica)"
    }
  ],
  "requiereRevision": true/false,
  "motivoRevision": "razón si requiere revisión",
  "sugerenciasAlternativas": [
    {
      "hsCode": "código alternativo",
      "descripcion": "descripción",
      "confianza": número 0-100
    }
  ]
}`;

    console.log('[clasificar-hts-ai] Procesando:', descripcion.substring(0, 50));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        // Note: temperature parameter removed as it's not supported by Gemini 2.5
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido, intenta más tarde' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes en Lovable AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[clasificar-hts-ai] Error AI Gateway:', response.status, errorText);
      throw new Error(`Error del gateway AI: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Respuesta vacía del modelo AI');
    }

    console.log('[clasificar-hts-ai] Respuesta raw:', content.substring(0, 200));

    // Extraer JSON de la respuesta (puede venir con markdown)
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Intentar encontrar JSON directo
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = content.substring(startIdx, endIdx + 1);
      }
    }

    const clasificacion: ClasificacionResponse = JSON.parse(jsonStr);

    console.log('[clasificar-hts-ai] Clasificado:', clasificacion.hsCode, 'confianza:', clasificacion.confianza);

    return new Response(
      JSON.stringify(clasificacion),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[clasificar-hts-ai] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        // Fallback con clasificación genérica
        hsCode: '9999.99.99',
        descripcionArancelaria: 'CLASIFICACIÓN PENDIENTE',
        confianza: 0,
        razonamiento: 'Error en clasificación AI - requiere revisión manual',
        terminosSensibles: [],
        requiereRevision: true,
        motivoRevision: 'Error en procesamiento AI'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
