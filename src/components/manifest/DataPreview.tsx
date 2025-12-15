import { useState } from 'react';
import { Eye, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ManifestRow, ProcessingWarning } from '@/types/manifest';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DataPreviewProps {
  data: ManifestRow[];
  warnings: ProcessingWarning[];
  onConfirm: () => void;
}

const PAGE_SIZE = 20;

export function DataPreview({ data, warnings, onConfirm }: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginatedData = data.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="card-elevated animate-slide-up">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Vista Previa de Datos</h3>
            <p className="text-sm text-muted-foreground">
              {data.length.toLocaleString()} registros cargados
            </p>
          </div>
        </div>
        {warnings.length > 0 && (
          <Badge variant="outline" className="border-warning text-warning gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            {warnings.length} advertencias
          </Badge>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="p-4 bg-warning-light border-b border-warning/20">
          <p className="text-sm font-medium text-warning mb-2">Advertencias detectadas:</p>
          <ul className="text-sm text-warning/80 space-y-1 max-h-24 overflow-y-auto">
            {warnings.slice(0, 5).map((warning, index) => (
              <li key={index}>• {warning.message}</li>
            ))}
            {warnings.length > 5 && (
              <li className="text-warning font-medium">
                ... y {warnings.length - 5} advertencias más
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Guía</th>
              <th>Descripción</th>
              <th className="text-right">Valor USD</th>
              <th className="text-right">Peso</th>
              <th>Destinatario</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr key={row.id} className="animate-fade-in" style={{ animationDelay: `${index * 20}ms` }}>
                <td className="text-muted-foreground font-mono text-xs">
                  {currentPage * PAGE_SIZE + index + 1}
                </td>
                <td className="font-mono text-sm">{row.trackingNumber || '-'}</td>
                <td className="max-w-xs truncate" title={row.description}>
                  {row.description || '-'}
                </td>
                <td className="text-right font-mono">
                  ${row.valueUSD.toFixed(2)}
                </td>
                <td className="text-right font-mono text-muted-foreground">
                  {row.weight.toFixed(2)}
                </td>
                <td className="max-w-xs truncate" title={row.recipient}>
                  {row.recipient || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Página {currentPage + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={onConfirm} className="gap-2">
          Procesar Datos
        </Button>
      </div>
    </div>
  );
}
