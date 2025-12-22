import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, Plane, Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// Common airline codes at Tocumen
const AIRLINE_CODES: Record<string, string> = {
  '230': 'Avianca',
  '172': 'Copa Airlines',
  '139': 'American Airlines',
  '157': 'United Airlines',
  '001': 'American Airlines Cargo',
  '176': 'Emirates SkyCargo',
  '406': 'Atlas Air',
  '810': 'Amerijet International',
  '906': 'Skynet Worldwide Express',
};

export interface MAWBInfo {
  mawb: string;
  airlineCode: string;
  airlineName: string;
  sequenceNumber: string;
  formatted: string;
  isValid: boolean;
}

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onMawbChange: (mawb: MAWBInfo | null) => void;
  onProcess: () => void;
  mawbInfo: MAWBInfo | null;
  isLoading?: boolean;
  error?: string | null;
  fileLoaded?: boolean;
}

function parseMAWB(input: string): MAWBInfo | null {
  // Remove "MAWB" prefix if present and clean up
  const cleaned = input.replace(/^mawb\s*/i, '').replace(/\s+/g, '').trim();
  
  if (!cleaned) return null;

  // Try to parse format XXX-XXXXXXXX or XXXXXXXXXXX
  let airlineCode = '';
  let sequenceNumber = '';

  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length === 2) {
      airlineCode = parts[0];
      sequenceNumber = parts[1];
    }
  } else if (cleaned.length === 11) {
    airlineCode = cleaned.substring(0, 3);
    sequenceNumber = cleaned.substring(3);
  }

  // Validate
  const isValidAirlineCode = /^\d{3}$/.test(airlineCode);
  const isValidSequence = /^\d{8}$/.test(sequenceNumber);
  const isValid = isValidAirlineCode && isValidSequence;

  if (!airlineCode && !sequenceNumber) return null;

  return {
    mawb: cleaned,
    airlineCode,
    airlineName: AIRLINE_CODES[airlineCode] || 'Desconocida',
    sequenceNumber,
    formatted: `MAWB ${airlineCode}-${sequenceNumber}`,
    isValid,
  };
}

export function FileUpload({ onFileSelect, onMawbChange, onProcess, mawbInfo, isLoading, error, fileLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mawbInput, setMawbInput] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleMawbInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMawbInput(value);
    const parsed = parseMAWB(value);
    onMawbChange(parsed);
  }, [onMawbChange]);

  return (
    <div className="w-full space-y-6">
      {/* File Upload Section */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'drop-zone relative flex flex-col items-center justify-center p-8 md:p-12 cursor-pointer transition-all duration-300',
          isDragging && 'drop-zone-active scale-[1.02]',
          isLoading && 'opacity-50 pointer-events-none',
          error && 'border-destructive/50'
        )}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-xl bg-success-light flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-success" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
              Cambiar archivo
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Upload className={cn(
                'w-8 h-8 transition-colors duration-300',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo Excel aquí'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                o haz clic para seleccionar
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Archivos .xlsx, .xls</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Leyendo archivo...</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive-light flex items-start gap-3 animate-slide-up">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error al procesar archivo</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* MAWB Display Section */}
      {fileLoaded && (
        <div className="card-elevated p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Plane className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Master Air Waybill (MAWB)</h3>
          </div>
          
          {/* Auto-detected MAWB */}
          {mawbInfo?.isValid && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">{mawbInfo.formatted}</p>
                    <p className="text-sm text-green-700">
                      ✈️ Aerolínea: <span className="font-medium">{mawbInfo.airlineName}</span> ({mawbInfo.airlineCode})
                    </p>
                  </div>
                </div>
                <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Detectado automáticamente
                </div>
              </div>
            </div>
          )}

          {/* Manual MAWB Input - Only show if not auto-detected */}
          {!mawbInfo?.isValid && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="mawb-input" className="text-sm text-muted-foreground">
                  No se detectó MAWB automáticamente. Ingresa manualmente (opcional):
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="mawb-input"
                    type="text"
                    placeholder="906-12345678"
                    value={mawbInput}
                    onChange={handleMawbInputChange}
                    className={cn(
                      "text-lg font-mono",
                      mawbInfo?.isValid && "border-green-500 focus:border-green-500"
                    )}
                  />
                  {mawbInfo?.isValid && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>
              </div>

              {mawbInfo && !mawbInfo.isValid && (
                <div className="p-3 rounded-lg text-sm bg-amber-50 border border-amber-200 text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Formato incorrecto. Use: XXX-XXXXXXXX (ej: 906-12345678)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Option to override auto-detected MAWB */}
          {mawbInfo?.isValid && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                ¿MAWB incorrecto? Ingresa manualmente
              </summary>
              <div className="mt-2">
                <Input
                  type="text"
                  placeholder="906-12345678"
                  value={mawbInput}
                  onChange={handleMawbInputChange}
                  className="text-sm font-mono"
                />
              </div>
            </details>
          )}
        </div>
      )}

      {/* Process Button */}
      {fileLoaded && (
        <Button 
          onClick={onProcess}
          size="lg"
          className="w-full h-14 text-lg font-semibold animate-fade-in"
        >
          <Play className="w-5 h-5 mr-2" />
          Procesar Manifiesto
        </Button>
      )}
    </div>
  );
}
