import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ColumnMapping } from '@/types/manifest';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const OPTIONAL_FIELDS = [
  { key: 'province', label: 'Provincia', suggestions: ['province', 'provincia', 'state', 'estado', 'departamento'] },
  { key: 'city', label: 'Ciudad', suggestions: ['city', 'ciudad', 'district', 'distrito', 'municipio'] },
  { key: 'district', label: 'Barrio/Corregimiento', suggestions: ['barrio', 'corregimiento', 'neighborhood', 'sector', 'zona'] },
  { key: 'phone', label: 'Teléfono', suggestions: ['phone', 'telefono', 'tel', 'celular', 'mobile', 'contacto'] },
  { key: 'identification', label: 'Identificación', suggestions: ['identification', 'id', 'cedula', 'pasaporte', 'dni', 'ruc'] },
];

export function ColumnMapper({ headers, onMapping }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});

  // Auto-detect columns based on suggestions
  useEffect(() => {
    const autoMapping: Partial<ColumnMapping> = {};
    
    // Auto-detect required fields
    REQUIRED_FIELDS.forEach(field => {
      const matchedHeader = headers.find(header => 
        field.suggestions.some(suggestion => 
          header.toLowerCase().includes(suggestion.toLowerCase())
        )
      );
      if (matchedHeader) {
        autoMapping[field.key as keyof ColumnMapping] = matchedHeader;
      }
    });

    // Auto-detect optional fields
    OPTIONAL_FIELDS.forEach(field => {
      const matchedHeader = headers.find(header => 
        field.suggestions.some(suggestion => 
          header.toLowerCase().includes(suggestion.toLowerCase())
        )
      );
      if (matchedHeader) {
        autoMapping[field.key as keyof ColumnMapping] = matchedHeader;
      }
    });

    setMapping(autoMapping);
  }, [headers]);

  const handleChange = (key: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [key]: value }));
  };

  const isComplete = REQUIRED_FIELDS.every(field => mapping[field.key as keyof ColumnMapping]);

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
                  <CheckCircle2 className="w-4 h-4 text-success" />
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

      {/* Optional Fields */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
          Campos Opcionales (Geográficos y Consignatario)
        </h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {OPTIONAL_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {field.label}
                {mapping[field.key as keyof ColumnMapping] && (
                  <CheckCircle2 className="w-4 h-4 text-success" />
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
