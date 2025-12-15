import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/manifest/Header';
import { FileUpload } from '@/components/manifest/FileUpload';
import { ColumnMapper } from '@/components/manifest/ColumnMapper';
import { DataPreview } from '@/components/manifest/DataPreview';
import { ProcessingProgress } from '@/components/manifest/ProcessingProgress';
import { ResultsDashboard } from '@/components/manifest/ResultsDashboard';
import { ConfigPanel } from '@/components/manifest/ConfigPanel';
import { 
  parseExcelFile, 
  mapDataToManifest, 
  processManifest 
} from '@/lib/excelProcessor';
import { loadConfig } from '@/lib/storage';
import { 
  ManifestRow, 
  ProcessingConfig, 
  ProcessingResult, 
  ColumnMapping,
  ProcessingWarning
} from '@/types/manifest';
import { toast } from 'sonner';

type ProcessingStep = 'upload' | 'mapping' | 'preview' | 'processing' | 'results';

export default function Index() {
  const [step, setStep] = useState<ProcessingStep>('upload');
  const [config, setConfig] = useState<ProcessingConfig>(loadConfig());
  const [rawData, setRawData] = useState<{ headers: string[]; data: Record<string, unknown>[] } | null>(null);
  const [mappedData, setMappedData] = useState<ManifestRow[]>([]);
  const [warnings, setWarnings] = useState<ProcessingWarning[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const data = await parseExcelFile(file);
      
      if (data.data.length === 0) {
        throw new Error('El archivo no contiene datos');
      }

      setRawData(data);
      setStep('mapping');
      toast.success(`Archivo cargado: ${data.data.length.toLocaleString()} registros`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar el archivo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMapping = useCallback((mapping: ColumnMapping) => {
    if (!rawData) return;

    const { rows, warnings: mapWarnings } = mapDataToManifest(rawData.data, mapping);
    setMappedData(rows);
    setWarnings(mapWarnings);
    setStep('preview');

    if (mapWarnings.length > 0) {
      toast.warning(`Se encontraron ${mapWarnings.length} advertencias`);
    }
  }, [rawData]);

  const handleProcess = useCallback(async () => {
    setStep('processing');
    setProcessingProgress(0);

    // Simulate async processing with progress updates
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const processingResult = processManifest(mappedData, config, (progress) => {
        setProcessingProgress(progress);
      });

      setResult(processingResult);
      setProcessingProgress(100);
      
      setTimeout(() => {
        setStep('results');
        toast.success(`Procesamiento completado: ${processingResult.batches.length} lotes generados`);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en el procesamiento');
      toast.error('Error durante el procesamiento');
      setStep('preview');
    }
  }, [mappedData, config]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setRawData(null);
    setMappedData([]);
    setWarnings([]);
    setResult(null);
    setError(null);
    setProcessingProgress(0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-sm">
            {[
              { key: 'upload', label: '1. Cargar' },
              { key: 'mapping', label: '2. Mapear' },
              { key: 'preview', label: '3. Revisar' },
              { key: 'processing', label: '4. Procesar' },
              { key: 'results', label: '5. Resultados' },
            ].map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div className={`
                  px-3 py-1.5 rounded-full font-medium transition-all duration-300
                  ${step === s.key 
                    ? 'bg-primary text-primary-foreground' 
                    : ['upload', 'mapping', 'preview', 'processing', 'results'].indexOf(step) > index
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {s.label}
                </div>
                {index < 4 && (
                  <div className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${
                    ['upload', 'mapping', 'preview', 'processing', 'results'].indexOf(step) > index
                      ? 'bg-success'
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Config Panel - Show on upload and preview steps */}
        {(step === 'upload' || step === 'preview') && (
          <div className="mb-6">
            <ConfigPanel config={config} onConfigChange={setConfig} />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {step === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Cargar Manifiesto de Carga
                </h2>
                <p className="text-muted-foreground">
                  Sube tu archivo Excel con los datos del manifiesto para comenzar el procesamiento
                </p>
              </div>
              <FileUpload 
                onFileSelect={handleFileSelect} 
                isLoading={isLoading}
                error={error}
              />
            </div>
          )}

          {step === 'mapping' && rawData && (
            <ColumnMapper 
              headers={rawData.headers} 
              onMapping={handleMapping} 
            />
          )}

          {step === 'preview' && (
            <DataPreview 
              data={mappedData} 
              warnings={warnings}
              onConfirm={handleProcess} 
            />
          )}

          {step === 'processing' && (
            <ProcessingProgress 
              progress={processingProgress}
              status={processingProgress < 100 ? 'processing' : 'complete'}
              message={
                processingProgress < 30 
                  ? 'Clasificando productos...' 
                  : processingProgress < 60 
                    ? 'Agrupando por categorías...' 
                    : processingProgress < 90
                      ? 'Generando lotes...'
                      : 'Finalizando...'
              }
            />
          )}

          {step === 'results' && result && (
            <ResultsDashboard 
              result={result} 
              config={config}
              onReset={handleReset} 
            />
          )}
        </div>

        {/* Help Text */}
        {step === 'upload' && (
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Carga tu archivo</h3>
                <p className="text-sm text-muted-foreground">
                  Soportamos archivos Excel (.xlsx, .xls) con hasta 50,000 registros
                </p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Procesamiento automático</h3>
                <p className="text-sm text-muted-foreground">
                  Clasificamos por valor, tipo de producto y generamos lotes de 5,000
                </p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Descarga tus archivos</h3>
                <p className="text-sm text-muted-foreground">
                  Obtén archivos separados por categoría listos para despacho
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CargoManifest Pro — Procesamiento inteligente de manifiestos de carga aérea</p>
        </div>
      </footer>
    </div>
  );
}
