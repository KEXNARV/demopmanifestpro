import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Calculator, Scale, Shield, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertaDiscrepancia, 
  ResultadoValidacion, 
  NivelAlerta,
  CategoriaAlerta,
  calcularEstadoVencimiento 
} from '@/lib/validacion/motorValidacionQA';

interface CentroCumplimientoProps {
  validacion: ResultadoValidacion | null;
  onClose?: () => void;
  onFirmar?: () => void;
}

const iconosCategoria: Record<CategoriaAlerta, React.ReactNode> = {
  calculo: <Calculator className="h-4 w-4" />,
  peso: <Scale className="h-4 w-4" />,
  vencimiento: <Clock className="h-4 w-4" />,
  permiso: <Shield className="h-4 w-4" />,
  integridad: <AlertTriangle className="h-4 w-4" />
};

const coloresNivel: Record<NivelAlerta, string> = {
  rojo: 'bg-destructive/10 text-destructive border-destructive/30',
  naranja: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  amarillo: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  verde: 'bg-green-500/10 text-green-600 border-green-500/30'
};

const badgeNivel: Record<NivelAlerta, string> = {
  rojo: 'bg-destructive text-destructive-foreground',
  naranja: 'bg-orange-500 text-white',
  amarillo: 'bg-yellow-500 text-black',
  verde: 'bg-green-500 text-white'
};

export function CentroCumplimiento({ validacion, onClose, onFirmar }: CentroCumplimientoProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!validacion) {
    return (
      <Card className="w-80 h-full border-l">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Centro de Cumplimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <p className="text-sm">Cargue un manifiesto para ver las alertas</p>
        </CardContent>
      </Card>
    );
  }

  const { resumen, alertas, listoParaFirma } = validacion;

  return (
    <Card className="w-80 h-full border-l flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Centro de Cumplimiento
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
        {/* Indicador Principal */}
        <div className={`p-4 rounded-lg border ${listoParaFirma ? coloresNivel.verde : coloresNivel.rojo}`}>
          <div className="flex items-center gap-2 mb-2">
            {listoParaFirma ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="font-semibold text-sm">
              {listoParaFirma ? 'Listo para Firma del Corredor' : 'Requiere Corrección'}
            </span>
          </div>
          <Progress value={resumen.porcentajeCumplimiento} className="h-2" />
          <p className="text-xs mt-1">{resumen.porcentajeCumplimiento}% cumplimiento</p>
        </div>

        {/* Resumen de Alertas */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{resumen.alertasRojas}</p>
            <p className="text-xs text-muted-foreground">Críticas</p>
          </div>
          <div className="text-center p-2 rounded bg-orange-500/10">
            <p className="text-lg font-bold text-orange-600">{resumen.alertasNaranjas}</p>
            <p className="text-xs text-muted-foreground">Medias</p>
          </div>
          <div className="text-center p-2 rounded bg-yellow-500/10">
            <p className="text-lg font-bold text-yellow-600">{resumen.alertasAmarillas}</p>
            <p className="text-xs text-muted-foreground">Bajas</p>
          </div>
        </div>

        {/* Próximo Vencimiento */}
        {resumen.proximoVencimiento && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Próximo Vencimiento</span>
            </div>
            <p className="text-lg font-bold">B/. {resumen.proximoVencimiento.monto.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {resumen.proximoVencimiento.diasRestantes > 0 
                ? `${resumen.proximoVencimiento.diasRestantes} días restantes`
                : 'Vencido'}
            </p>
          </div>
        )}

        <Separator />

        {/* Lista de Alertas */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {alertas.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin alertas pendientes</p>
              </div>
            ) : (
              alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${coloresNivel[alerta.nivel]}`}
                  onClick={() => setExpanded(expanded === alerta.id ? null : alerta.id)}
                >
                  <div className="flex items-start gap-2">
                    {iconosCategoria[alerta.categoria]}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold truncate">{alerta.titulo}</span>
                        <Badge className={`text-[10px] px-1 ${badgeNivel[alerta.nivel]}`}>
                          {alerta.nivel.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80 line-clamp-2">{alerta.descripcion}</p>
                      
                      {expanded === alerta.id && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <p className="text-xs font-medium mb-1">Acción Requerida:</p>
                          <p className="text-xs opacity-80">{alerta.accionRequerida}</p>
                          {alerta.item && (
                            <p className="text-xs mt-1">Ítem: #{alerta.item}</p>
                          )}
                          {alerta.autoridad && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              {alerta.autoridad}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Botón de Firma */}
        {onFirmar && (
          <Button 
            className="w-full" 
            disabled={!listoParaFirma}
            onClick={onFirmar}
          >
            {listoParaFirma ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Firmar y Refrendar
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Corregir Alertas
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
