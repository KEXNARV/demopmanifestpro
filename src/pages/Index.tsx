import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '@/components/manifest/Header';
import { FileUpload, MAWBInfo } from '@/components/manifest/FileUpload';
import { ColumnMapper } from '@/components/manifest/ColumnMapper';
import { DataPreview } from '@/components/manifest/DataPreview';
import { ProcessingProgress } from '@/components/manifest/ProcessingProgress';
import { VisualDashboard } from '@/components/manifest/VisualDashboard';
import { ConfigPanel } from '@/components/manifest/ConfigPanel';
import { ValidacionGuiasAlert, InfoGuiasVsMAWB } from '@/components/manifest/ValidacionGuiasAlert';
import { SelectorModoTransporte, useTransportMode } from '@/components/transporte/SelectorModoTransporte';
import { 
  parseExcelFile, 
  mapDataToManifest, 
  processManifest,
  ExtendedProcessingResult
} from '@/lib/excelProcessor';
import { loadConfig } from '@/lib/storage';
import { 
  ManifestRow, 
  ProcessingConfig, 
  ColumnMapping,
  ProcessingWarning
} from '@/types/manifest';
import { ResultadoValidacionLote } from '@/lib/validacion/validadorGuias';
import { AnalizadorManifiesto } from '@/lib/analizador/analizador-manifiesto-completo';
import { toast } from 'sonner';

type ProcessingStep = 'upload' | 'mapping' | 'preview' | 'processing' | 'results';

export default function Index() {
  const [step, setStep] = useState<ProcessingStep>('upload');
  const [config, setConfig] = useState<ProcessingConfig>(loadConfig());
  const [rawData, setRawData] = useState<{ headers: string[]; data: Record<string, unknown>[] } | null>(null);
  const [mappedData, setMappedData] = useState<ManifestRow[]>([]);
  const [warnings, setWarnings] = useState<ProcessingWarning[]>([]);
  const [validacionGuias, setValidacionGuias] = useState<ResultadoValidacionLote | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState<ExtendedProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mawbInfo, setMawbInfo] = useState<MAWBInfo | null>(null);
  const [fileLoaded, setFileLoaded] = useState(false);
  
  // Hook para modo de transporte
  const { modo: modoTransporte, zona: zonaAduanera, setModo, setZona } = useTransportMode();

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Leer datos del Excel
      const data = await parseExcelFile(file);
      
      if (data.data.length === 0) {
        throw new Error('El archivo no contiene datos');
      }

      setRawData(data);
      setFileLoaded(true);

      // Detectar MAWB automáticamente desde el archivo
      try {
        const arrayBuffer = await file.arrayBuffer();
        const analisis = await AnalizadorManifiesto.analizarArchivo(arrayBuffer);
        
        if (analisis.mawb && analisis.aerolinea) {
          const detectedMawb: MAWBInfo = {
            mawb: analisis.mawb,
            airlineCode: analisis.prefijoIATA || analisis.mawb.split('-')[0] || '000',
            airlineName: analisis.aerolinea,
            sequenceNumber: analisis.mawb.includes('-') ? analisis.mawb.split('-')[1] : analisis.mawb.slice(3),
            formatted: `MAWB ${analisis.mawb}`,
            isValid: true,
          };
          setMawbInfo(detectedMawb);
          toast.success(
            `✈️ MAWB detectado: ${analisis.mawb} - ${analisis.aerolinea}`,
            { duration: 5000 }
          );
        }
      } catch (mawbError) {
        console.warn('No se pudo detectar MAWB automáticamente:', mawbError);
      }

      toast.success(`Archivo cargado: ${data.data.length.toLocaleString()} registros - Presiona "Procesar" para continuar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar el archivo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartProcessing = useCallback(() => {
    if (!rawData) return;
    setStep('mapping');
  }, [rawData]);

  const handleMapping = useCallback((mapping: ColumnMapping) => {
    if (!rawData) return;

    const { rows, warnings: mapWarnings, validacionGuias: validacion } = mapDataToManifest(rawData.data, mapping);
    setMappedData(rows);
    setWarnings(mapWarnings);
    setValidacionGuias(validacion);
    setStep('preview');

    // Alertas según validación de guías
    if (validacion.mawbsDetectados > 0) {
      toast.error(
        `⚠️ ALERTA: Se detectaron ${validacion.mawbsDetectados} MAWB(s) usados como guías individuales. Verifique la columna de tracking.`,
        { duration: 8000 }
      );
    } else if (mapWarnings.length > 0) {
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
    setValidacionGuias(null);
    setResult(null);
    setError(null);
    setProcessingProgress(0);
    setMawbInfo(null);
    setFileLoaded(false);
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

        {/* MAWB Display when not on upload step */}
        {mawbInfo?.isValid && step !== 'upload' && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg">✈️</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{mawbInfo.formatted}</p>
                <p className="text-sm text-muted-foreground">
                  Aerolínea: {mawbInfo.airlineName} ({mawbInfo.airlineCode})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Config Panel - Show on upload and preview steps */}
        {(step === 'upload' || step === 'preview') && (
          <div className="mb-6">
            <ConfigPanel config={config} onConfigChange={setConfig} />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {step === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Cargar Manifiesto de Carga
                </h2>
                <p className="text-muted-foreground">
                  Sube tu archivo Excel para comenzar el procesamiento
                </p>
              </div>
              
              {/* Selector de Modo de Transporte */}
              <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                <SelectorModoTransporte
                  modoSeleccionado={modoTransporte}
                  zonaSeleccionada={zonaAduanera}
                  onModoChange={setModo}
                  onZonaChange={setZona}
                />
              </div>
              
              <FileUpload 
                onFileSelect={handleFileSelect}
                onMawbChange={setMawbInfo}
                onProcess={handleStartProcessing}
                mawbInfo={mawbInfo}
                isLoading={isLoading}
                error={error}
                fileLoaded={fileLoaded}
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
            <div className="space-y-4">
              {/* Alerta de validación de guías */}
              {validacionGuias && (
                <ValidacionGuiasAlert resultado={validacionGuias} />
              )}
              
              <DataPreview 
                data={mappedData} 
                warnings={warnings}
                onConfirm={handleProcess} 
              />
            </div>
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
          <VisualDashboard 
            result={result} 
            config={config}
            mawbInfo={mawbInfo}
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
                <h3 className="font-semibold text-foreground mb-1">MAWB (Opcional)</h3>
                <p className="text-sm text-muted-foreground">
                  Ingresa el número MAWB para identificar tu manifiesto de carga aérea
                </p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Descarga tus archivos</h3>
                <p className="text-sm text-muted-foreground">
                  Obtén archivos separados por categoría listos para usar
                </p>
              </div>
            </div>
            
            {/* Link to Arancel Search */}
            <div className="mt-8 text-center">
              <Link 
                to="/aranceles"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                <Search className="h-5 w-5" />
                Buscador de Aranceles de Panamá
              </Link>
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
