// ============================================
// MOTOR DE APRENDIZAJE HTS CON LOVABLE AI
// Clasificación evolutiva basada en correcciones
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  valorUSD: number;
  peso?: number;
  guia?: string;
  mawb?: string;
  userId?: string;
}

interface ClasificacionValidada {
  id: string;
  hts_code: string;
  descripcion_arancelaria: string;
  dai_percent: number;
  isc_percent: number;
  itbms_percent: number;
  autoridad_anuente?: string;
  confianza: number;
  usos_exitosos: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // AUTHENTICATION CHECK - Use anon key with RLS
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Motor Aprendizaje] No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use anon key with user's auth header to respect RLS policies
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Motor Aprendizaje] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Motor Aprendizaje] Usuario autenticado: ${user.id}`);

    const { descripcion, valorUSD, peso, guia, mawb } = await req.json() as ClasificacionRequest;

    console.log(`[Motor Aprendizaje] Procesando: "${descripcion.substring(0, 50)}..." valor: $${valorUSD}`);

    // ═══════════════════════════════════════════════════════
    // PASO 1: BUSCAR EN CLASIFICACIONES VALIDADAS (APRENDIDAS)
    // ═══════════════════════════════════════════════════════
    
    const descripcionNormalizada = normalizarDescripcion(descripcion);
    
    const { data: clasificacionesExistentes, error: searchError } = await supabase
      .from('clasificaciones_validadas')
      .select('*')
      .eq('activo', true)
      .textSearch('descripcion_normalizada', descripcionNormalizada, {
        type: 'websearch',
        config: 'spanish'
      })
      .order('usos_exitosos', { ascending: false })
      .limit(5);

    if (searchError) {
      console.log('[Motor Aprendizaje] Error buscando clasificaciones:', searchError.message);
    }

    // Si encontramos una clasificación validada con alta confianza
    if (clasificacionesExistentes && clasificacionesExistentes.length > 0) {
      const mejorMatch = clasificacionesExistentes[0] as ClasificacionValidada;
      
      if (mejorMatch.confianza >= 85) {
        console.log(`[Motor Aprendizaje] ✓ Usando clasificación aprendida: ${mejorMatch.hts_code}`);
        
        // Incrementar contador de usos exitosos
        await supabase
          .from('clasificaciones_validadas')
          .update({ usos_exitosos: mejorMatch.usos_exitosos + 1 })
          .eq('id', mejorMatch.id);

        return new Response(JSON.stringify({
          success: true,
          source: 'APRENDIDO',
          clasificacion: {
            hsCode: mejorMatch.hts_code,
            descripcionArancelaria: mejorMatch.descripcion_arancelaria,
            daiPercent: mejorMatch.dai_percent,
            iscPercent: mejorMatch.isc_percent,
            itbmsPercent: mejorMatch.itbms_percent,
            autoridadAnuente: mejorMatch.autoridad_anuente,
            confianza: mejorMatch.confianza,
            usosExitosos: mejorMatch.usos_exitosos + 1
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // PASO 2: USAR LOVABLE AI PARA CLASIFICACIÓN
    // ═══════════════════════════════════════════════════════
    
    console.log('[Motor Aprendizaje] Consultando Lovable AI...');

    const systemPrompt = `Eres un experto clasificador arancelario para la Autoridad Nacional de Aduanas de Panamá.
Tu tarea es clasificar productos según el Sistema Armonizado (HTS) de Panamá.

REGLAS CRÍTICAS:
1. El código HTS debe tener formato XXXX.XX.XX (8 dígitos con puntos)
2. Para valor < $100 USD, clasificar como "De Minimis" (no requiere impuestos)
3. Detectar si requiere permiso de MINSA, APA, AUPSA, MIDA u otra autoridad
4. Identificar productos farmacéuticos, cosméticos, alimentos, veterinarios

CATEGORÍAS ESPECIALES:
- Vitaminas/Suplementos: Capítulo 21 o 30
- Cosméticos: Capítulo 33
- Medicamentos: Capítulo 30
- Alimentos: Capítulos 16-22
- Electrónicos: Capítulos 84-85
- Textiles: Capítulos 61-63

Responde SOLO con JSON válido.`;

    const userPrompt = `Clasifica este producto para importación a Panamá:

DESCRIPCIÓN: ${descripcion}
VALOR DECLARADO: $${valorUSD} USD
PESO: ${peso || 'No especificado'} LB
GUÍA: ${guia || 'N/A'}

Responde con este formato JSON exacto:
{
  "hsCode": "XXXX.XX.XX",
  "descripcionArancelaria": "Descripción oficial",
  "daiPercent": 0-15,
  "iscPercent": 0-25,
  "itbmsPercent": 7,
  "autoridadAnuente": "MINSA/APA/AUPSA/MIDA o null",
  "esFarmaceutico": true/false,
  "esRestringido": true/false,
  "confianza": 0-100,
  "notas": "Observaciones adicionales"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'clasificar_producto',
            description: 'Clasificar producto según Sistema Armonizado de Panamá',
            parameters: {
              type: 'object',
              properties: {
                hsCode: { type: 'string', description: 'Código HTS formato XXXX.XX.XX' },
                descripcionArancelaria: { type: 'string' },
                daiPercent: { type: 'number' },
                iscPercent: { type: 'number' },
                itbmsPercent: { type: 'number' },
                autoridadAnuente: { type: 'string', nullable: true },
                esFarmaceutico: { type: 'boolean' },
                esRestringido: { type: 'boolean' },
                confianza: { type: 'number' },
                notas: { type: 'string' }
              },
              required: ['hsCode', 'descripcionArancelaria', 'daiPercent', 'itbmsPercent', 'confianza']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'clasificar_producto' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required. Please add credits to your workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('[Motor Aprendizaje] Respuesta AI recibida');

    // Extraer clasificación del tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No se recibió clasificación del AI');
    }

    const clasificacion = JSON.parse(toolCall.function.arguments);
    console.log(`[Motor Aprendizaje] AI clasificó: ${clasificacion.hsCode} (confianza: ${clasificacion.confianza}%)`);

    return new Response(JSON.stringify({
      success: true,
      source: 'AI',
      clasificacion: {
        hsCode: clasificacion.hsCode,
        descripcionArancelaria: clasificacion.descripcionArancelaria,
        daiPercent: clasificacion.daiPercent || 0,
        iscPercent: clasificacion.iscPercent || 0,
        itbmsPercent: clasificacion.itbmsPercent || 7,
        autoridadAnuente: clasificacion.autoridadAnuente,
        esFarmaceutico: clasificacion.esFarmaceutico || false,
        esRestringido: clasificacion.esRestringido || false,
        confianza: clasificacion.confianza,
        notas: clasificacion.notas
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Motor Aprendizaje] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ═══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════

function normalizarDescripcion(descripcion: string): string {
  return descripcion
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, ' ')    // Solo alfanuméricos
    .replace(/\s+/g, ' ')             // Espacios múltiples
    .trim();
}
