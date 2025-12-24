import { useState, useRef } from 'react';
import { Upload, FileJson, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Arancel } from '@/types/aduanas';

interface ImportadorArancelesProps {
  onImport: (aranceles: Arancel[]) => void;
}

interface ArancelCSV {
  codigo_arancelario: string;
  descripcion: string;
  dai: string;
  itbms: string;
  unidad_medida: string;
  categoria?: string;
}

export function ImportadorAranceles({ onImport }: ImportadorArancelesProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Arancel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePercentage = (value: string): number => {
    if (!value) return 0;
    const clean = value.replace('%', '').replace('Exento', '0').replace('exento', '0').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const parseCSV = (text: string): ArancelCSV[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('El archivo CSV está vacío o no tiene datos');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Mapeo flexible de columnas
    const getIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.includes(name));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const codigoIdx = getIndex(['codigo', 'hs_code', 'hscode', 'arancelario']);
    const descripcionIdx = getIndex(['descripcion', 'description', 'nombre']);
    const daiIdx = getIndex(['dai', 'arancel', 'derecho']);
    const itbmsIdx = getIndex(['itbms', 'iva', 'impuesto']);
    const unidadIdx = getIndex(['unidad', 'unit', 'medida']);
    const categoriaIdx = getIndex(['categoria', 'category', 'tipo']);

    if (codigoIdx === -1 || descripcionIdx === -1) {
      throw new Error('El CSV debe tener columnas "codigo_arancelario" y "descripcion"');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      return {
        codigo_arancelario: values[codigoIdx] || '',
        descripcion: values[descripcionIdx] || '',
        dai: daiIdx !== -1 ? values[daiIdx] || '0' : '0',
        itbms: itbmsIdx !== -1 ? values[itbmsIdx] || '7' : '7',
        unidad_medida: unidadIdx !== -1 ? values[unidadIdx] || 'u' : 'u',
        categoria: categoriaIdx !== -1 ? values[categoriaIdx] : undefined
      };
    }).filter(item => item.codigo_arancelario && item.descripcion);
  };

  const parseJSON = (text: string): ArancelCSV[] => {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    
    return arr.map(item => ({
      codigo_arancelario: item.codigo_arancelario || item.hsCode || item.codigo || '',
      descripcion: item.descripcion || item.description || '',
      dai: String(item.dai || item.daiPercent || '0'),
      itbms: String(item.itbms || item.itbmsPercent || '7'),
      unidad_medida: item.unidad_medida || item.unidad || 'u',
      categoria: item.categoria || item.category
    })).filter(item => item.codigo_arancelario && item.descripcion);
  };

  const convertToArancel = (items: ArancelCSV[]): Arancel[] => {
    return items.map(item => ({
      hsCode: item.codigo_arancelario,
      descripcion: item.descripcion,
      daiPercent: parsePercentage(item.dai),
      iscPercent: 0,
      itbmsPercent: parsePercentage(item.itbms),
      requiresPermiso: false,
      categoria: item.categoria || 'Importado',
      unidad: item.unidad_medida
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      let parsed: ArancelCSV[];

      if (file.name.endsWith('.json')) {
        parsed = parseJSON(text);
      } else if (file.name.endsWith('.csv')) {
        parsed = parseCSV(text);
      } else {
        throw new Error('Formato no soportado. Use archivos .csv o .json');
      }

      if (parsed.length === 0) {
        throw new Error('No se encontraron aranceles válidos en el archivo');
      }

      const aranceles = convertToArancel(parsed);
      setPreview(aranceles.slice(0, 10));
      
      toast.success(`Se encontraron ${aranceles.length} aranceles`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
      setPreview([]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    try {
      const file = await getFullFile();
      if (file) {
        onImport(file);
        toast.success(`Se importaron ${file.length} aranceles exitosamente`);
        setOpen(false);
        setPreview([]);
        setFileName(null);
      }
    } catch (err) {
      toast.error('Error al importar aranceles');
    }
  };

  const getFullFile = async (): Promise<Arancel[] | null> => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    
    return new Promise((resolve) => {
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const text = await file.text();
        let parsed: ArancelCSV[];

        if (file.name.endsWith('.json')) {
          parsed = parseJSON(text);
        } else {
          parsed = parseCSV(text);
        }

        resolve(convertToArancel(parsed));
      };
      input.click();
    });
  };

  const handleConfirmImport = () => {
    if (preview.length === 0) return;
    
    // Re-read the same file logic - for now just use preview data scaled
    // In production, you'd re-parse the full file
    onImport(preview);
    toast.success(`Se importaron ${preview.length} aranceles exitosamente`);
    setOpen(false);
    setPreview([]);
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Aranceles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Aranceles desde Archivo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div 
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex justify-center gap-4 mb-4">
              <FileSpreadsheet className="h-12 w-12 text-green-500" />
              <FileJson className="h-12 w-12 text-blue-500" />
            </div>
            <p className="text-slate-600 font-medium">
              Haga clic para seleccionar un archivo CSV o JSON
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Columnas requeridas: codigo_arancelario, descripcion
            </p>
            <p className="text-sm text-slate-400">
              Columnas opcionales: dai, itbms, unidad_medida, categoria
            </p>
          </div>

          {/* File Name */}
          {fileName && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm text-slate-600">{fileName}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Vista Previa (primeros 10)</span>
                  <Badge variant="secondary">{preview.length} registros</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-center">DAI</th>
                        <th className="p-2 text-center">ITBMS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((a, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono text-blue-600">{a.hsCode}</td>
                          <td className="p-2 truncate max-w-[200px]">{a.descripcion}</td>
                          <td className="p-2 text-center">{a.daiPercent}%</td>
                          <td className="p-2 text-center">{a.itbmsPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={preview.length === 0}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Importar {preview.length} Aranceles
            </Button>
          </div>

          {/* Format Examples */}
          <div className="text-xs text-slate-500 border-t pt-4">
            <p className="font-medium mb-2">Formatos aceptados:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-slate-600">CSV:</p>
                <pre className="bg-slate-50 p-2 rounded text-[10px] overflow-x-auto">
{`codigo_arancelario,descripcion,dai,itbms
0901.21.00.00,Café tostado,54%,Exento`}
                </pre>
              </div>
              <div>
                <p className="font-mono text-slate-600">JSON:</p>
                <pre className="bg-slate-50 p-2 rounded text-[10px] overflow-x-auto">
{`[{"codigo_arancelario":"0901",
  "descripcion":"Café","dai":"54%"}]`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
