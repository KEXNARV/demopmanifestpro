import { useCallback, useState } from "react";
import { Brain, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgenteAduanal } from "@/hooks/useAgenteAduanal";
import { ManifestRow } from "@/types/manifest";
import { PanelAgenteAduanal } from "@/components/manifest/PanelAgenteAduanal";

interface AgenteAduanalTabProps {
  paquetes: ManifestRow[];
  mawb?: string;
}

export function AgenteAduanalTab({ paquetes, mawb }: AgenteAduanalTabProps) {
  const agente = useAgenteAduanal();
  const [procesado, setProcesado] = useState(false);

  const handleProcesar = useCallback(async () => {
    const manifiestoId = mawb || `manifest_${Date.now()}`;
    await agente.procesarManifiesto(paquetes, manifiestoId, {
      fechaRegistro: new Date(),
    });
    setProcesado(true);
  }, [agente, paquetes, mawb]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Agente Aduanal AI
          </CardTitle>
          <CardDescription>
            Ejecuta clasificación HTS con IA y genera un Excel consolidado con firma digital.
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
              {agente.estado.procesando ? "Procesando…" : "Procesar con IA"}
            </Button>
            <div className="text-sm text-muted-foreground">
              {procesado
                ? "Listo: revisa abajo los resultados y descarga." 
                : "Sugerido antes de Subvaluación/Exportación si necesitas HTS."}
            </div>
          </div>
        </CardContent>
      </Card>

      <PanelAgenteAduanal agenteState={agente} mawb={mawb} />
    </div>
  );
}
