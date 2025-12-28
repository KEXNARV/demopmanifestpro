import { useCallback, useState } from "react";
import { Brain, Sparkles, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgenteAduanal } from "@/hooks/useAgenteAduanal";
import { ManifestRow } from "@/types/manifest";
import { PanelAgenteAduanal } from "@/components/manifest/PanelAgenteAduanal";

interface AgenteAduanalTabProps {
  paquetes: ManifestRow[];
  mawb?: string;
  onProcessed?: (paquetesEnriquecidos: ManifestRow[]) => void;
}

export function AgenteAduanalTab({ paquetes, mawb, onProcessed }: AgenteAduanalTabProps) {
  const agente = useAgenteAduanal();
  const [procesado, setProcesado] = useState(false);
  const [paquetesConHTS, setPaquetesConHTS] = useState<number>(0);

  const handleProcesar = useCallback(async () => {
    const manifiestoId = mawb || `manifest_${Date.now()}`;
    const resultado = await agente.procesarManifiesto(paquetes, manifiestoId, {
      fechaRegistro: new Date(),
    });
    
    if (resultado) {
      // Enriquecer paquetes con clasificaciones HTS del resultado (clasificaciones es un Map)
      const paquetesEnriquecidos = paquetes.map(paq => {
        const clasificacion = resultado.clasificaciones.get(paq.trackingNumber);
        if (clasificacion) {
          return {
            ...paq,
            hsCode: clasificacion.hsCode,
            descripcionArancelaria: clasificacion.descripcionArancelaria,
            confianzaHTS: clasificacion.confianzaClasificacion,
            autoridadAnuente: clasificacion.autoridadesInvolucradas?.[0] || undefined,
          };
        }
        return paq;
      });
      
      const conHTS = paquetesEnriquecidos.filter(p => p.hsCode).length;
      setPaquetesConHTS(conHTS);
      console.log(`[AgenteAduanalTab] ${conHTS}/${paquetes.length} paquetes con HTS asignado`);
      
      // Notificar al padre para actualizar Subvaluación
      if (onProcessed) {
        onProcessed(paquetesEnriquecidos);
      }
    }
    
    setProcesado(true);
  }, [agente, paquetes, mawb, onProcessed]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Agente Aduanal AI
          </CardTitle>
          <CardDescription>
            Clasifica productos con Lovable AI (Gemini 2.5 Flash) y asigna códigos HTS para subvaluación.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleProcesar}
              disabled={agente.estado.procesando || paquetes.length === 0}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {agente.estado.procesando ? "Procesando…" : "Clasificar con IA"}
            </Button>
            
            {procesado && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  {paquetesConHTS} de {paquetes.length} paquetes con HTS
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Listo para Subvaluación
                </Badge>
              </div>
            )}
            
            {!procesado && (
              <span className="text-sm text-muted-foreground">
                Ejecuta clasificación antes de Subvaluación para usar códigos HTS.
              </span>
            )}
          </div>
          
          {agente.estado.procesando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              {agente.estado.mensaje}
            </div>
          )}
        </CardContent>
      </Card>

      <PanelAgenteAduanal agenteState={agente} mawb={mawb} />
    </div>
  );
}
