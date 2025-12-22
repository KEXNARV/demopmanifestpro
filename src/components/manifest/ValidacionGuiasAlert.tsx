import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ResultadoValidacionLote } from '@/lib/validacion/validadorGuias';

interface ValidacionGuiasAlertProps {
  resultado: ResultadoValidacionLote;
  onDismiss?: () => void;
}

export function ValidacionGuiasAlert({ resultado, onDismiss }: ValidacionGuiasAlertProps) {
  const tieneErroresCriticos = resultado.mawbsDetectados > 0 || resultado.guiasInvalidas > resultado.totalGuias * 0.5;
  const tieneAdvertencias = resultado.advertencias.length > 0 || resultado.duplicados.length > 0;
  const todoOk = !tieneErroresCriticos && !tieneAdvertencias && resultado.guiasValidas === resultado.totalGuias;

  if (todoOk) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-700">Validación exitosa</AlertTitle>
        <AlertDescription className="text-green-600">
          {resultado.totalGuias} guías individuales validadas correctamente.
          El análisis se realizará por paquete individual.
        </AlertDescription>
      </Alert>
    );
  }

  if (tieneErroresCriticos) {
    return (
      <Alert variant="destructive" className="border-destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Error de Identificación de Guías
          <Badge variant="destructive">Crítico</Badge>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          {resultado.mawbsDetectados > 0 && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="font-semibold text-destructive">
                🚨 Se detectaron {resultado.mawbsDetectados} MAWB(s) usados como guías individuales
              </p>
              <p className="text-sm mt-1 text-muted-foreground">
                El análisis de consignatarios, impuestos y valores debe realizarse por 
                <strong className="text-foreground"> guía individual del paquete</strong> (Amazon, courier local),
                <strong className="text-destructive"> NO por la guía aérea master (MAWB)</strong>.
              </p>
            </div>
          )}
          
          {resultado.errores.slice(0, 3).map((error, idx) => (
            <p key={idx} className="text-sm">{error}</p>
          ))}
          
          <div className="pt-2 border-t border-destructive/20">
            <p className="text-xs font-medium">¿Cómo corregirlo?</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>• Verifique que está usando la columna correcta para las guías</li>
              <li>• Busque columnas con nombres como: "Tracking", "AWB", "Guía Individual", "TBA..."</li>
              <li>• El MAWB solo debe usarse como referencia del manifiesto, no para análisis</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (tieneAdvertencias) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-700 flex items-center gap-2">
          Advertencias en Validación
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            {resultado.advertencias.length + (resultado.duplicados.length > 0 ? 1 : 0)}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-yellow-800">
          {resultado.duplicados.length > 0 && (
            <p className="text-sm">
              ⚠️ Se encontraron {resultado.duplicados.length} guías duplicadas. 
              Cada paquete debe tener una guía única.
            </p>
          )}
          
          {resultado.advertencias.slice(0, 2).map((adv, idx) => (
            <p key={idx} className="text-sm">{adv}</p>
          ))}
          
          <p className="text-xs text-muted-foreground pt-2">
            Validadas: {resultado.guiasValidas} de {resultado.totalGuias} guías
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Componente informativo sobre la diferencia entre MAWB y Guía Individual
 */
export function InfoGuiasVsMAWB() {
  return (
    <Alert className="border-blue-500/30 bg-blue-500/5">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-blue-700">Identificación de Paquetes</AlertTitle>
      <AlertDescription className="mt-2 text-sm text-muted-foreground space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
            <p className="font-semibold text-green-700 text-xs">✅ GUÍA INDIVIDUAL (Usar para análisis)</p>
            <p className="text-xs mt-1">
              Identificador único del paquete: Amazon (TBA...), UPS (1Z...), FedEx, DHL, courier local.
            </p>
          </div>
          <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
            <p className="font-semibold text-red-700 text-xs">❌ MAWB (Solo referencia)</p>
            <p className="text-xs mt-1">
              Guía aérea master (ej: 729-12345678). Solo identifica el vuelo, NO paquetes individuales.
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
