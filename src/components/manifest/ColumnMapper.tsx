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
  { key: 'trackingNumber', label: 'Número de Guía', suggestions: ['tracking', 'guia', 'guide', 'awb', 'numero'] },
  { key: 'description', label: 'Descripción', suggestions: ['description', 'descripcion', 'product', 'producto', 'item'] },
  { key: 'valueUSD', label: 'Valor USD', suggestions: ['value', 'valor', 'price', 'precio', 'usd', 'amount'] },
  { key: 'weight', label: 'Peso', suggestions: ['weight', 'peso', 'kg', 'lbs'] },
  { key: 'recipient', label: 'Destinatario', suggestions: ['recipient', 'destinatario', 'consignee', 'receiver', 'nombre'] },
  { key: 'address', label: 'Dirección', suggestions: ['address', 'direccion', 'street', 'calle', 'domicilio'] },
];

export function ColumnMapper({ headers, onMapping }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});

  // Auto-detect columns based on suggestions
  useEffect(() => {
    const autoMapping: Partial<ColumnMapping> = {};
    
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
      <p className="text-sm text-muted-foreground mb-6">
        Selecciona las columnas del archivo que corresponden a cada campo requerido.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REQUIRED_FIELDS.map(field => (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {field.label}
              {mapping[field.key as keyof ColumnMapping] && (
                <CheckCircle2 className="w-4 h-4 text-success" />
              )}
            </label>
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
