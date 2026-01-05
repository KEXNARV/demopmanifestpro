import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ColumnMapping } from '@/types/manifest';
import { detectarColumnasAutomaticamente } from '@/lib/deteccion/detectorColumnasMejorado';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROVINCIAS_PANAMA } from '@/lib/panamaGeography';
import { getCorregimientosPorProvincia } from '@/lib/panamaGeography/corregimientos';

interface ColumnMapperProps {
  headers: string[];
  onMapping: (mapping: ColumnMapping) => void;
}

const REQUIRED_FIELDS = [
  { 
    key: 'trackingNumber', 
    label: 'Guía Individual del Paquete', 
    suggestions: ['tracking', 'guia', 'awb', 'numero', 'house', 'hawb', 'paquete', 'package'],
    required: true,
    description: 'Ej: Amazon, FedEx, UPS (NO usar MAWB)'
  },
  { key: 'description', label: 'Descripción', suggestions: ['description', 'descripcion', 'product', 'producto', 'item'], required: true },
  { key: 'valueUSD', label: 'Valor USD', suggestions: ['value', 'valor', 'price', 'precio', 'usd', 'amount'], required: true },
  { key: 'weight', label: 'Peso', suggestions: ['weight', 'peso', 'kg', 'lbs'], required: true },
  { key: 'recipient', label: 'Destinatario', suggestions: ['recipient', 'destinatario', 'consignee', 'receiver', 'nombre', 'consignatario'], required: true },
  { key: 'address', label: 'Dirección', suggestions: ['address', 'direccion', 'street', 'calle', 'domicilio'], required: true },
];

// Campos geográficos - Provincia y Corregimiento ahora son OBLIGATORIOS
const GEOGRAPHIC_FIELDS = [
  { 
    key: 'province', 
    label: 'Provincia', 
    suggestions: ['province', 'provincia', 'state', 'estado', 'departamento'],
    required: true,
    description: 'Obligatorio para rutas de entrega'
  },
  { 
    key: 'district', 
    label: 'Barrio/Corregimiento', 
    suggestions: ['barrio', 'corregimiento', 'neighborhood', 'sector', 'zona', 'district'],
    required: true,
    description: 'Debe corresponder a la provincia'
  },
];

const OPTIONAL_FIELDS = [
  { key: 'city', label: 'Ciudad/Distrito', suggestions: ['city', 'ciudad', 'district', 'distrito', 'municipio'] },
  { key: 'phone', label: 'Teléfono', suggestions: ['phone', 'telefono', 'tel', 'celular', 'mobile', 'contacto'] },
  { key: 'identification', label: 'Identificación', suggestions: ['identification', 'id', 'cedula', 'pasaporte', 'dni', 'ruc'] },
];

export function ColumnMapper({ headers, onMapping }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [provinciasEnDatos, setProvinciasEnDatos] = useState<string[]>([]);

  // Auto-detect columns based on suggestions
  useEffect(() => {
    const auto = detectarColumnasAutomaticamente(headers);
    const autoMapping: Partial<ColumnMapping> = { ...auto.mapping };

    const normalize = (s: string) => s.toLowerCase().replace(/[_-]+/g, ' ').trim();
    const isMawbLikeHeader = (header: string) => {
      const h = normalize(header);
      return /(^|\s)(mawb|mwab|master)(\s|$)/.test(h);
    };

    // Regla crítica: trackingNumber debe venir de AWB/H-AWB/Tracking, NUNCA de MAWB
    const candidates = headers.filter((h) => !isMawbLikeHeader(h));
    const awbBoundary = /(^|[^a-z0-9])awb([^a-z0-9]|$)/i;
    const hawbBoundary = /(^|[^a-z0-9])hawb([^a-z0-9]|$)/i;

    const findBestTrackingHeader = () =>
      candidates.find((h) => hawbBoundary.test(h)) ||
      candidates.find((h) => awbBoundary.test(h)) ||
      candidates.find((h) => normalize(h).includes('tracking')) ||
      candidates.find((h) => normalize(h).includes('guia') || normalize(h).includes('guía')) ||
      candidates.find((h) => normalize(h).includes('package')) ||
      null;

    const currentTracking = autoMapping.trackingNumber;
    if (!currentTracking || isMawbLikeHeader(currentTracking)) {
      const best = findBestTrackingHeader();
      if (best) autoMapping.trackingNumber = best;
      else delete autoMapping.trackingNumber;
    }

    setMapping(autoMapping);
  }, [headers]);

  const handleChange = (key: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [key]: value }));
  };

  // Validación: todos los campos requeridos + geográficos obligatorios
  const allRequiredFields = [...REQUIRED_FIELDS, ...GEOGRAPHIC_FIELDS];
  const isComplete = allRequiredFields.every(field => mapping[field.key as keyof ColumnMapping]);

  // Obtener corregimientos disponibles basados en la provincia mapeada
  const corregimientosDisponibles = useMemo(() => {
    const provinciaColumn = mapping.province;
    if (!provinciaColumn) return [];
    
    // Aquí podríamos analizar los datos para determinar qué provincias hay
    // Por ahora retornamos todos los corregimientos de todas las provincias
    const todosCorregimientos = new Set<string>();
    PROVINCIAS_PANAMA.forEach(p => {
      getCorregimientosPorProvincia(p.nombre).forEach(c => todosCorregimientos.add(c));
    });
    return Array.from(todosCorregimientos).sort();
  }, [mapping.province]);

  const handleContinue = () => {
    if (isComplete) {
      onMapping(mapping as ColumnMapping);
    }
  };

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-2">Mapear Columnas</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Selecciona las columnas del archivo que corresponden a cada campo requerido.
      </p>

      {/* Important notice about tracking numbers */}
      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-amber-600 text-xs font-bold">!</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Importante: Usar Guía Individual del Paquete
            </h4>
            <p className="text-xs text-amber-600/90 dark:text-amber-400/80">
              El análisis de consignatarios, impuestos, valores y demás se realiza por la <strong>guía individual del paquete</strong> (AWB de Amazon, FedEx, UPS, etc.), 
              <strong> NO por la guía aérea master (MAWB)</strong>. El MAWB solo identifica el envío consolidado, no los paquetes individuales.
            </p>
          </div>
        </div>
      </div>

      {/* Required Fields */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive"></span>
          Campos Requeridos
        </h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {REQUIRED_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {field.label}
                {mapping[field.key as keyof ColumnMapping] && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </label>
              {'description' in field && field.description && (
                <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
              )}
              <Select
                value={mapping[field.key as keyof ColumnMapping] || ''}
                onValueChange={(value) => handleChange(field.key as keyof ColumnMapping, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar columna" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Geographic Fields - NOW REQUIRED */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive"></span>
          Campos Geográficos (Obligatorios)
          <AlertTriangle className="w-4 h-4 text-amber-500 ml-2" />
        </h4>
        <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
            Provincia y Barrio/Corregimiento son <strong>obligatorios</strong> para el procesamiento correcto de rutas de entrega.
            El sistema validará que los corregimientos correspondan a las provincias indicadas.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 md:grid-cols-2">
          {GEOGRAPHIC_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {field.label}
                <span className="text-destructive">*</span>
                {mapping[field.key as keyof ColumnMapping] && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </label>
              {'description' in field && field.description && (
                <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
              )}
              <Select
                value={mapping[field.key as keyof ColumnMapping] || ''}
                onValueChange={(value) => handleChange(field.key as keyof ColumnMapping, value)}
              >
                <SelectTrigger className={`w-full ${!mapping[field.key as keyof ColumnMapping] ? 'border-amber-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar columna (obligatorio)" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
          Campos Opcionales
        </h4>
        <div className="grid gap-4 md:grid-cols-3">
          {OPTIONAL_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {field.label}
                {mapping[field.key as keyof ColumnMapping] && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </label>
              <Select
                value={mapping[field.key as keyof ColumnMapping] || ''}
                onValueChange={(value) => handleChange(field.key as keyof ColumnMapping, value === '_none_' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No mapear" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">No mapear</SelectItem>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Validation message */}
      {!isComplete && (
        <Alert className="mb-4 border-destructive/50">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive text-sm">
            Debes mapear todos los campos obligatorios incluyendo <strong>Provincia</strong> y <strong>Barrio/Corregimiento</strong> para continuar.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!isComplete}
          className="gap-2"
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
