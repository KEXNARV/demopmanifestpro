import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS - restrict to known application domains
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://www.lovable.dev',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Input validation constants
const MAX_TEXT_LENGTH = 100000; // 100KB of text (facturas pueden ser largas)
const MAX_FILENAME_LENGTH = 255;
const MIN_TEXT_LENGTH = 10;

// Estructura mejorada para facturas Amazon
interface AmazonInvoiceItem {
  asin: string;
  descripcion: string;
  productGroup: string;
  paHsCode: string;        // PA HS Code de la factura
  exportControlNumber: string;
  countryOfOrigin: string;
  cantidad: number;
  pesoNeto: number;
  valorUnitario: number;
  valorTotal: number;
}

interface AmazonInvoice {
  invoiceNo: string;
  invoiceDate: string;
  transportationReference: string;  // AWB de Amazon (AMZPSR...)
  numberOfPackages: number;
  exporter: string;
  shipFrom: string;
  consignee: string;
  grossWeight: number;
  phone: string;
  email: string;
  incoterms: string;
  carrierServiceCode: string;
  taxId: string;
  items: AmazonInvoiceItem[];
  totalItemValue: number;
  freightCharge: number;
  giftWrapCharge: number;
  totalInvoiceValue: number;
}

interface ExtractedInvoiceData {
  // Campos originales
  awbs: string[];
  valores: { valor: number; moneda: string; concepto?: string }[];
  descripciones: string[];
  proveedores: string[];
  fechas: string[];
  destinatarios: string[];
  paises: { origen?: string; destino?: string };
  items: { descripcion: string; cantidad?: number; valorUnitario?: number; valorTotal?: number; hsCode?: string }[];
  
  // Campos específicos para Amazon
  amazonInvoices: AmazonInvoice[];
  transportationReferences: string[];  // Lista de TRANSPORTATION REFERENCE (AWB Amazon)
  hsCodesPanama: { codigo: string; descripcion: string }[];  // PA HS Codes extraídos
  desglose: {
    totalItemValue: number;
    totalFreight: number;
    totalInvoiceValue: number;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
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

    // Check user role - only allow operador, revisor, auditor, and admin
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
    if (contentLength && parseInt(contentLength) > MAX_TEXT_LENGTH * 2) {
      console.error('Request payload too large:', contentLength);
      return new Response(
        JSON.stringify({ error: 'Payload demasiado grande' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    // Ahora acepta: textosPorPagina (array) O textoFactura (string legado)
    const { textosPorPagina, textoFactura, nombreArchivo, awbsRequeridos } = body;

    // Soporte para nuevo formato multi-página o legado
    const paginasTexto: string[] = textosPorPagina || (textoFactura ? [textoFactura] : []);
    
    if (!paginasTexto.length || !paginasTexto.some(p => p && p.trim().length >= MIN_TEXT_LENGTH)) {
      console.error('No hay contenido válido para procesar');
      return new Response(
        JSON.stringify({ error: 'El texto de factura es demasiado corto o está vacío' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const awbsRequeridosSet = new Set<string>(
      (awbsRequeridos || []).map((awb: string) => awb.toUpperCase().replace(/[-\s]/g, ''))
    );

    // ============================================
    // PROCESS MULTI-PAGE INVOICE
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
    console.log(`Usuario ${user.id} procesando factura multi-página: ${safeLogFilename}, ${paginasTexto.length} páginas, ${awbsRequeridosSet.size} AWBs requeridos`);

    // Prompt optimizado para extraer factura individual de una página
    const systemPrompt = `Eres un experto en extracción de datos de facturas comerciales Amazon.
Extraes datos de UNA SOLA factura/página. Cada página tiene exactamente UNA factura.

CAMPOS CRÍTICOS A EXTRAER:
1. **TRANSPORTATION REFERENCE**: Número de seguimiento Amazon (AMZPSR...) - ES EL AWB PRINCIPAL
2. **PA HS Code**: Código arancelario de Panamá (XX.XX.XXXXXX)
3. **UNIT VALUE**: Valor unitario en USD
4. **FREIGHT CHARGE**: Cargo de flete en USD
5. **TOTAL INVOICE VALUE**: Valor total en USD

Responde SOLO con JSON válido, sin markdown ni texto adicional.`;

    const allInvoices: AmazonInvoice[] = [];
    const allTransportationRefs: string[] = [];
    const allHsCodes: { codigo: string; descripcion: string }[] = [];
    const facturasCoincidentes: AmazonInvoice[] = [];
    const facturasNoRequeridas: { transportationReference: string; page: number }[] = [];
    
    // Procesar cada página individualmente
    for (let pageIndex = 0; pageIndex < paginasTexto.length; pageIndex++) {
      const textoPage = paginasTexto[pageIndex];
      if (!textoPage || textoPage.trim().length < 20) continue;

      const userPrompt = `Extrae datos de esta factura Amazon (página ${pageIndex + 1}):

${textoPage.substring(0, 12000)}

Responde con JSON:
{
  "invoiceNo": "string",
  "invoiceDate": "string",
  "transportationReference": "AMZPSR...",
  "numberOfPackages": 1,
  "exporter": "Amazon Export Sales LLC",
  "consignee": "string",
  "grossWeight": 0.0,
  "phone": "string",
  "email": "string",
  "incoterms": "FCA",
  "items": [{"asin": "string", "descripcion": "string", "productGroup": "string", "paHsCode": "string", "countryOfOrigin": "string", "cantidad": 1, "pesoNeto": 0.0, "valorUnitario": 0.0, "valorTotal": 0.0}],
  "totalItemValue": 0.0,
  "freightCharge": 0.0,
  "totalInvoiceValue": 0.0
}`;

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (!response.ok) {
          console.error(`Error procesando página ${pageIndex + 1}: ${response.status}`);
          continue;
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;

        if (!content) continue;

        // Extraer JSON
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonStr = jsonMatch[1];

        const invoice: AmazonInvoice = JSON.parse(jsonStr.trim());
        invoice.transportationReference = invoice.transportationReference || '';
        
        // Agregar información de página
        (invoice as any).pageNumber = pageIndex + 1;
        
        allInvoices.push(invoice);
        
        if (invoice.transportationReference) {
          const refNormalizada = invoice.transportationReference.replace(/[-\s]/g, '').toUpperCase();
          allTransportationRefs.push(invoice.transportationReference);
          
          // Verificar si este AWB es requerido
          let esRequerida = awbsRequeridosSet.size === 0; // Si no hay lista, todas son requeridas
          
          if (awbsRequeridosSet.size > 0) {
            for (const awbReq of awbsRequeridosSet) {
              if (refNormalizada.includes(awbReq) || awbReq.includes(refNormalizada)) {
                esRequerida = true;
                break;
              }
            }
          }
          
          if (esRequerida) {
            facturasCoincidentes.push(invoice);
          } else {
            facturasNoRequeridas.push({
              transportationReference: invoice.transportationReference,
              page: pageIndex + 1
            });
          }
        }
        
        // Extraer HS Codes
        invoice.items?.forEach(item => {
          if (item.paHsCode) {
            allHsCodes.push({
              codigo: item.paHsCode.replace(/\s/g, ''),
              descripcion: item.descripcion || ''
            });
          }
        });

      } catch (parseError) {
        console.error(`Error parseando página ${pageIndex + 1}:`, parseError);
      }
    }

    // Calcular totales solo de facturas coincidentes
    let totalItemValue = 0;
    let totalFreight = 0;
    let totalInvoiceValue = 0;
    
    facturasCoincidentes.forEach(inv => {
      totalItemValue += inv.totalItemValue || 0;
      totalFreight += inv.freightCharge || 0;
      totalInvoiceValue += inv.totalInvoiceValue || 0;
    });

    // Construir respuesta
    const extractedData: ExtractedInvoiceData = {
      awbs: [...new Set(allTransportationRefs.map(r => r.replace(/[-\s]/g, '').toUpperCase()))],
      valores: [
        { valor: totalInvoiceValue, moneda: 'USD', concepto: 'TOTAL INVOICE VALUE' },
        { valor: totalFreight, moneda: 'USD', concepto: 'FREIGHT CHARGE' },
        { valor: totalItemValue, moneda: 'USD', concepto: 'TOTAL ITEM VALUE' }
      ].filter(v => v.valor > 0),
      descripciones: [...new Set(facturasCoincidentes.flatMap(inv => inv.items?.map(i => i.descripcion) || []).filter(Boolean))],
      proveedores: ['Amazon Export Sales LLC'],
      fechas: [...new Set(allInvoices.map(inv => inv.invoiceDate).filter(Boolean))],
      destinatarios: [...new Set(facturasCoincidentes.map(inv => inv.consignee).filter(Boolean))],
      paises: { origen: 'US', destino: 'Panama' },
      items: facturasCoincidentes.flatMap(inv => 
        inv.items?.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
          hsCode: item.paHsCode
        })) || []
      ),
      amazonInvoices: facturasCoincidentes,
      transportationReferences: facturasCoincidentes.map(inv => inv.transportationReference),
      hsCodesPanama: [...new Set(allHsCodes.map(h => JSON.stringify(h)))].map(s => JSON.parse(s)),
      desglose: { totalItemValue, totalFreight, totalInvoiceValue }
    };

    // Agregar metadata sobre procesamiento multi-página
    const resumenProcesamiento = {
      totalPaginas: paginasTexto.length,
      facturasExtraidas: allInvoices.length,
      facturasCoincidentes: facturasCoincidentes.length,
      facturasNoRequeridas: facturasNoRequeridas.length,
      awbsEncontrados: allTransportationRefs,
      facturasOmitidas: facturasNoRequeridas
    };

    console.log(`Procesamiento completo: ${allInvoices.length} facturas, ${facturasCoincidentes.length} coincidentes de ${awbsRequeridosSet.size} requeridos`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        resumen: resumenProcesamiento
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en extract-invoice-data:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
