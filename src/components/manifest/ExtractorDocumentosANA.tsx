// ============================================
// EXTRACTOR DE DOCUMENTOS ANA (Autoridad Nacional de Aduanas)
// Motor de extracción para Declaraciones, Boletas y Manifiestos
// ============================================

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  DollarSign,
  Sparkles,
  FileCheck,
  FileWarning,
  Edit,
  Save,
  Package,
  ClipboardCheck,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import {
  DatosExtraidosANA,
  DocumentoANAProcesado,
  LineaArticulo,
  TipoDocumentoANA,
  formatearMoneda,
  validarFraccionArancelaria
} from '@/types/anaDocument';

// Configurar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ExtractorDocumentosANAProps {
  onDatosExtraidos?: (datos: DatosExtraidosANA) => void;
  onDocumentoValidado?: (documento: DocumentoANAProcesado) => void;
}

export function ExtractorDocumentosANA({
  onDatosExtraidos,
  onDocumentoValidado
}: ExtractorDocumentosANAProps) {
  const [documentos, setDocumentos] = useState<DocumentoANAProcesado[]>([]);
  const [documentoActivo, setDocumentoActivo] = useState<DocumentoANAProcesado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [editando, setEditando] = useState(false);
  const [datosEditables, setDatosEditables] = useState<DatosExtraidosANA | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extraer texto completo del PDF
  const extraerTextoPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const contenido = await pagina.getTextContent();
        const textoPagina = contenido.items
          .map((item: unknown) => (item as { str: string }).str)
          .join(' ');
        textoCompleto += textoPagina + '\n';
      }
      
      return textoCompleto;
    } catch (error) {
      console.error('Error al extraer texto del PDF:', error);
      return '';
    }
  };

  // Llamar a la función edge para extracción con IA
  const extraerDatosConIA = async (textoDocumento: string, nombreArchivo: string): Promise<DatosExtraidosANA | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('extract-ana-document', {
        body: { textoDocumento, nombreArchivo }
      });

      if (error) {
        console.error('Error al invocar función:', error);
        throw new Error(error.message || 'Error en extracción');
      }

      if (data?.success && data?.data) {
        return data.data as DatosExtraidosANA;
      }

      throw new Error('Respuesta inválida del servicio');
    } catch (error) {
      console.error('Error en extracción IA:', error);
      throw error;
    }
  };

  // Manejar carga de archivos
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setCargando(true);
    setProgreso(0);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgreso(Math.round(((i) / files.length) * 100));
        
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} no es un archivo PDF válido`);
          continue;
        }
        
        const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Agregar documento en estado procesando
        const docInicial: DocumentoANAProcesado = {
          id: docId,
          nombreArchivo: file.name,
          archivo: file,
          fechaCarga: new Date(),
          estado: 'procesando',
          datosExtraidos: null,
          errorMensaje: null
        };
        
        setDocumentos(prev => [...prev, docInicial]);
        
        try {
          // Extraer texto del PDF
          const textoPDF = await extraerTextoPDF(file);
          
          if (!textoPDF || textoPDF.trim().length < 50) {
            throw new Error('No se pudo extraer texto suficiente del PDF');
          }

          // Extraer datos con IA
          const datosExtraidos = await extraerDatosConIA(textoPDF, file.name);
          
          if (!datosExtraidos) {
            throw new Error('No se pudieron extraer datos del documento');
          }

          // Actualizar documento con datos extraídos
          const docActualizado: DocumentoANAProcesado = {
            ...docInicial,
            estado: 'completado',
            datosExtraidos
          };
          
          setDocumentos(prev => prev.map(d => d.id === docId ? docActualizado : d));
          setDocumentoActivo(docActualizado);
          
          onDatosExtraidos?.(datosExtraidos);
          
          if (datosExtraidos.alertas?.length > 0) {
            toast.warning(`${file.name}: ${datosExtraidos.alertas.length} alerta(s) detectada(s)`);
          } else {
            toast.success(`${file.name}: Extracción completada exitosamente`);
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          
          setDocumentos(prev => prev.map(d => 
            d.id === docId 
              ? { ...d, estado: 'error' as const, errorMensaje: errorMsg }
              : d
          ));
          
          toast.error(`Error procesando ${file.name}: ${errorMsg}`);
        }
        
        setProgreso(Math.round(((i + 1) / files.length) * 100));
      }
      
    } catch (error) {
      console.error('Error al procesar documentos:', error);
      toast.error('Error al procesar los documentos');
    } finally {
      setCargando(false);
      setProgreso(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const eliminarDocumento = (id: string) => {
    setDocumentos(prev => prev.filter(d => d.id !== id));
    if (documentoActivo?.id === id) {
      setDocumentoActivo(null);
    }
  };

  const iniciarEdicion = () => {
    if (documentoActivo?.datosExtraidos) {
      setDatosEditables(JSON.parse(JSON.stringify(documentoActivo.datosExtraidos)));
      setEditando(true);
    }
  };

  const guardarEdicion = () => {
    if (documentoActivo && datosEditables) {
      const docActualizado = {
        ...documentoActivo,
        datosExtraidos: datosEditables
      };
      setDocumentos(prev => prev.map(d => d.id === documentoActivo.id ? docActualizado : d));
      setDocumentoActivo(docActualizado);
      onDocumentoValidado?.(docActualizado);
      setEditando(false);
      toast.success('Cambios guardados correctamente');
    }
  };

  const actualizarLineaArticulo = (index: number, campo: keyof LineaArticulo, valor: unknown) => {
    if (!datosEditables) return;
    
    const nuevasLineas = [...datosEditables.lineasArticulo];
    nuevasLineas[index] = { ...nuevasLineas[index], [campo]: valor };
    setDatosEditables({ ...datosEditables, lineasArticulo: nuevasLineas });
  };

  const getTipoDocumentoIcon = (tipo: TipoDocumentoANA) => {
    switch (tipo) {
      case 'declaracion': return <FileCheck className="w-4 h-4 text-blue-600" />;
      case 'boleta': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'manifiesto': return <Package className="w-4 h-4 text-purple-600" />;
      case 'factura_comercial': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return <FileWarning className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTipoDocumentoLabel = (tipo: TipoDocumentoANA) => {
    switch (tipo) {
      case 'declaracion': return 'Declaración de Importación';
      case 'boleta': return 'Boleta de Pago';
      case 'manifiesto': return 'Manifiesto de Carga';
      case 'factura_comercial': return 'Factura Comercial';
      default: return 'Documento Desconocido';
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Extractor de Documentos ANA
            <Badge variant="outline" className="ml-2 gap-1">
              <Sparkles className="w-3 h-3" />
              IA
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Calculator className="w-4 h-4" />
            <AlertTitle>Motor de Extracción Inteligente</AlertTitle>
            <AlertDescription>
              Extrae automáticamente: Número de Declaración, Control de Boleta, RUC, 
              Fracciones Arancelarias, Valores FOB/CIF, Impuestos y verifica discrepancias.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="ana-document-upload"
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={cargando}
              className="gap-2"
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Cargar Documentos PDF
            </Button>
            
            {cargando && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{progreso}%</span>
              </div>
            )}
          </div>

          {/* Lista de documentos procesados */}
          {documentos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos Procesados</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {documentos.map(doc => (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        documentoActivo?.id === doc.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-card hover:bg-muted/50'
                      }`}
                      onClick={() => setDocumentoActivo(doc)}
                    >
                      <div className="flex items-center gap-3">
                        {doc.estado === 'procesando' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        {doc.estado === 'completado' && doc.datosExtraidos && getTipoDocumentoIcon(doc.datosExtraidos.tipoDocumento)}
                        {doc.estado === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                        
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{doc.nombreArchivo}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.estado === 'procesando' && 'Procesando...'}
                            {doc.estado === 'completado' && doc.datosExtraidos && getTipoDocumentoLabel(doc.datosExtraidos.tipoDocumento)}
                            {doc.estado === 'error' && doc.errorMensaje}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {doc.datosExtraidos?.alertas && doc.datosExtraidos.alertas.length > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {doc.datosExtraidos.alertas.length}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarDocumento(doc.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalles y edición */}
      <Dialog open={!!documentoActivo && documentoActivo.estado === 'completado'} onOpenChange={() => setDocumentoActivo(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {documentoActivo?.datosExtraidos && getTipoDocumentoIcon(documentoActivo.datosExtraidos.tipoDocumento)}
              {documentoActivo?.nombreArchivo}
              {documentoActivo?.datosExtraidos?.metadatos && (
                <Badge variant="outline" className="ml-2">
                  Confianza: {documentoActivo.datosExtraidos.metadatos.confianzaExtraccion}%
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {documentoActivo?.datosExtraidos && (
            <Tabs defaultValue="identificadores" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="identificadores">Identificadores</TabsTrigger>
                <TabsTrigger value="articulos">Artículos ({documentoActivo.datosExtraidos.lineasArticulo?.length || 0})</TabsTrigger>
                <TabsTrigger value="totales">Totales</TabsTrigger>
                <TabsTrigger value="alertas">
                  Alertas ({documentoActivo.datosExtraidos.alertas?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="identificadores" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Declaración</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.numeroDeclaracion || '' : documentoActivo.datosExtraidos.identificadores?.numeroDeclaracion || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, numeroDeclaracion: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Control de Boleta</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.numeroControlBoleta || '' : documentoActivo.datosExtraidos.identificadores?.numeroControlBoleta || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, numeroControlBoleta: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RUC Importador</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.rucImportador || '' : documentoActivo.datosExtraidos.identificadores?.rucImportador || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, rucImportador: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consignatario</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.nombreConsignatario || '' : documentoActivo.datosExtraidos.identificadores?.nombreConsignatario || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, nombreConsignatario: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Documento</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.fechaDocumento || '' : documentoActivo.datosExtraidos.identificadores?.fechaDocumento || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, fechaDocumento: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aduana Destino</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.aduanaDestino || '' : documentoActivo.datosExtraidos.identificadores?.aduanaDestino || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, aduanaDestino: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Régimen Aduanero</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.regimenAduanero || '' : documentoActivo.datosExtraidos.identificadores?.regimenAduanero || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, regimenAduanero: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Despacho</Label>
                    <Input 
                      value={editando ? datosEditables?.identificadores?.tipoDespacho || '' : documentoActivo.datosExtraidos.identificadores?.tipoDespacho || '—'}
                      onChange={(e) => editando && datosEditables && setDatosEditables({
                        ...datosEditables,
                        identificadores: { ...datosEditables.identificadores, tipoDespacho: e.target.value }
                      })}
                      readOnly={!editando}
                      className={!editando ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="articulos">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="w-32">Fracción</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">FOB</TableHead>
                        <TableHead className="text-right">Flete</TableHead>
                        <TableHead className="text-right">Seguro</TableHead>
                        <TableHead className="text-right">CIF</TableHead>
                        <TableHead className="text-right">Impuestos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(editando ? datosEditables?.lineasArticulo : documentoActivo.datosExtraidos.lineasArticulo)?.map((linea, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{linea.secuencia}</TableCell>
                          <TableCell>
                            {editando ? (
                              <Input 
                                value={linea.fraccionArancelaria}
                                onChange={(e) => actualizarLineaArticulo(idx, 'fraccionArancelaria', e.target.value)}
                                className={`font-mono text-xs w-28 ${!validarFraccionArancelaria(linea.fraccionArancelaria) ? 'border-destructive' : ''}`}
                              />
                            ) : (
                              <span className={`font-mono text-xs ${!validarFraccionArancelaria(linea.fraccionArancelaria) ? 'text-destructive' : ''}`}>
                                {linea.fraccionArancelaria}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editando ? (
                              <Input 
                                value={linea.descripcion}
                                onChange={(e) => actualizarLineaArticulo(idx, 'descripcion', e.target.value)}
                                className="text-xs"
                              />
                            ) : (
                              <div>
                                <p className="text-xs">{linea.descripcion}</p>
                                {linea.codigoReferencia && (
                                  <Badge variant="outline" className="mt-1 text-[10px]">{linea.codigoReferencia}</Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {editando ? (
                              <Input 
                                type="number"
                                step="0.01"
                                value={linea.valorFOB}
                                onChange={(e) => actualizarLineaArticulo(idx, 'valorFOB', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right"
                              />
                            ) : formatearMoneda(linea.valorFOB)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {editando ? (
                              <Input 
                                type="number"
                                step="0.01"
                                value={linea.valorFlete}
                                onChange={(e) => actualizarLineaArticulo(idx, 'valorFlete', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right"
                              />
                            ) : formatearMoneda(linea.valorFlete)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {editando ? (
                              <Input 
                                type="number"
                                step="0.01"
                                value={linea.valorSeguro}
                                onChange={(e) => actualizarLineaArticulo(idx, 'valorSeguro', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right"
                              />
                            ) : formatearMoneda(linea.valorSeguro)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {formatearMoneda(linea.valorCIF)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatearMoneda((linea.impuestoArancel || 0) + (linea.impuestoITBMS || 0) + (linea.otrosImpuestos || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="totales" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Totales de Declaración */}
                  {documentoActivo.datosExtraidos.totalesDeclaracion && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileCheck className="w-4 h-4" />
                          Totales Declaración
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">FOB Total:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesDeclaracion.valorFOBTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Flete Total:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesDeclaracion.valorFleteTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Seguro Total:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesDeclaracion.valorSeguroTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t pt-2">
                          <span>CIF Total:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesDeclaracion.valorCIFTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-primary">
                          <span>Total Impuestos:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesDeclaracion.totalImpuestos)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Totales de Boleta */}
                  {documentoActivo.datosExtraidos.totalesBoleta && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Totales Boleta
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Arancel:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesBoleta.subtotalArancel, documentoActivo.datosExtraidos.totalesBoleta.moneda)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ITBMS:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesBoleta.subtotalITBMS, documentoActivo.datosExtraidos.totalesBoleta.moneda)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Otros:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesBoleta.subtotalOtros, documentoActivo.datosExtraidos.totalesBoleta.moneda)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-lg border-t pt-2">
                          <span>TOTAL A PAGAR:</span>
                          <span className="font-mono">{formatearMoneda(documentoActivo.datosExtraidos.totalesBoleta.montoTotal, documentoActivo.datosExtraidos.totalesBoleta.moneda)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Verificación Cruzada */}
                {documentoActivo.datosExtraidos.verificacionCruzada && (
                  <Alert variant={documentoActivo.datosExtraidos.verificacionCruzada.alertaDiscrepancia ? 'destructive' : 'default'}>
                    {documentoActivo.datosExtraidos.verificacionCruzada.coincide ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <AlertTitle>Verificación Cruzada de Totales</AlertTitle>
                    <AlertDescription>
                      {documentoActivo.datosExtraidos.verificacionCruzada.coincide ? (
                        <span className="text-green-700">
                          ✅ Los montos coinciden correctamente
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <p>⚠️ <strong>DISCREPANCIA DETECTADA</strong></p>
                          <p>Monto Boleta: {formatearMoneda(documentoActivo.datosExtraidos.verificacionCruzada.montoBoleta)}</p>
                          <p>Monto Declaración: {formatearMoneda(documentoActivo.datosExtraidos.verificacionCruzada.montoDeclaracion)}</p>
                          <p>Diferencia: {formatearMoneda(documentoActivo.datosExtraidos.verificacionCruzada.diferencia)} ({documentoActivo.datosExtraidos.verificacionCruzada.porcentajeDiferencia.toFixed(2)}%)</p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="alertas">
                {documentoActivo.datosExtraidos.alertas && documentoActivo.datosExtraidos.alertas.length > 0 ? (
                  <div className="space-y-2">
                    {documentoActivo.datosExtraidos.alertas.map((alerta, idx) => (
                      <Alert key={idx} variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{alerta}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertTitle>Sin Alertas</AlertTitle>
                    <AlertDescription>
                      No se detectaron discrepancias ni problemas en el documento.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2">
            {editando ? (
              <>
                <Button variant="outline" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
                <Button onClick={guardarEdicion} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDocumentoActivo(null)}>
                  Cerrar
                </Button>
                <Button onClick={iniciarEdicion} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Editar Datos
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => {
                    if (documentoActivo) {
                      onDocumentoValidado?.(documentoActivo);
                      toast.success('Documento validado y listo para firma electrónica');
                      setDocumentoActivo(null);
                    }
                  }}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Validar y Continuar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
