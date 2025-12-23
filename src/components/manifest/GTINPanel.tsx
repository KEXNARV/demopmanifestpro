import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Barcode, 
  Search, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Package,
  AlertTriangle,
  Copy,
  FileText
} from 'lucide-react';
import { 
  procesarGTIN, 
  validarGTIN, 
  extraerGTINsDeTexto,
  analizarCodigosGTIN,
  GTINInfo,
  GTINAnalysisReport
} from '@/lib/gtin/gtinProcessor';
import { toast } from 'sonner';

interface GTINPanelProps {
  descripciones?: string[];
}

export function GTINPanel({ descripciones = [] }: GTINPanelProps) {
  const [codigoInput, setCodigoInput] = useState('');
  const [resultadoValidacion, setResultadoValidacion] = useState<GTINInfo | null>(null);
  const [textoExtraccion, setTextoExtraccion] = useState('');
  const [codigosExtraidos, setCodigosExtraidos] = useState<GTINInfo[]>([]);

  // Análisis automático de descripciones del manifiesto
  const analisisManifiesto = useMemo(() => {
    if (!descripciones.length) return null;
    
    const todosLosGTINs: GTINInfo[] = [];
    for (const desc of descripciones) {
      const gtins = extraerGTINsDeTexto(desc);
      todosLosGTINs.push(...gtins);
    }
    
    if (todosLosGTINs.length === 0) return null;
    
    const codigos = todosLosGTINs.map(g => g.codigo);
    return {
      gtins: todosLosGTINs,
      reporte: analizarCodigosGTIN(codigos)
    };
  }, [descripciones]);

  const handleValidar = () => {
    if (!codigoInput.trim()) {
      toast.error('Ingrese un código GTIN');
      return;
    }
    
    const resultado = procesarGTIN(codigoInput.trim());
    setResultadoValidacion(resultado);
    
    if (resultado.valido) {
      toast.success(`Código ${resultado.tipo} válido`);
    } else {
      toast.error('Código inválido');
    }
  };

  const handleExtraer = () => {
    if (!textoExtraccion.trim()) {
      toast.error('Ingrese texto para extraer códigos');
      return;
    }
    
    const extraidos = extraerGTINsDeTexto(textoExtraccion);
    setCodigosExtraidos(extraidos);
    
    if (extraidos.length > 0) {
      toast.success(`Se encontraron ${extraidos.length} código(s) GTIN`);
    } else {
      toast.info('No se encontraron códigos GTIN en el texto');
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado');
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          Procesador GTIN (GS1)
        </CardTitle>
        <CardDescription>
          Validación y análisis de códigos GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN), GTIN-14
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="validar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="validar">Validar Código</TabsTrigger>
            <TabsTrigger value="extraer">Extraer de Texto</TabsTrigger>
            <TabsTrigger value="manifiesto" disabled={!analisisManifiesto}>
              Análisis Manifiesto
              {analisisManifiesto && (
                <Badge variant="secondary" className="ml-2">
                  {analisisManifiesto.gtins.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Validar Código */}
          <TabsContent value="validar" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ingrese código GTIN (8, 12, 13 o 14 dígitos)"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidar()}
                className="font-mono"
              />
              <Button onClick={handleValidar}>
                <Search className="h-4 w-4 mr-2" />
                Validar
              </Button>
            </div>

            {resultadoValidacion && (
              <Card className={resultadoValidacion.valido ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {resultadoValidacion.valido ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-semibold">
                          {resultadoValidacion.valido ? 'Código Válido' : 'Código Inválido'}
                        </p>
                        <Badge variant="outline">{resultadoValidacion.tipo}</Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copiarCodigo(resultadoValidacion.codigoNormalizado)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código Original</p>
                      <p className="font-mono">{resultadoValidacion.codigo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Normalizado (GTIN-14)</p>
                      <p className="font-mono">{resultadoValidacion.codigoNormalizado}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dígito de Verificación</p>
                      <p className="font-mono">
                        {resultadoValidacion.digitoVerificacion}
                        {resultadoValidacion.digitoVerificacion !== resultadoValidacion.digitoVerificacionCalculado && (
                          <span className="text-destructive ml-2">
                            (debería ser {resultadoValidacion.digitoVerificacionCalculado})
                          </span>
                        )}
                      </p>
                    </div>
                    {resultadoValidacion.paisOrigen && (
                      <div>
                        <p className="text-muted-foreground">País/Región de Origen</p>
                        <p className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {resultadoValidacion.paisOrigen}
                        </p>
                      </div>
                    )}
                    {resultadoValidacion.indicadorEmpaque && (
                      <div>
                        <p className="text-muted-foreground">Indicador de Empaque</p>
                        <p className="font-mono">{resultadoValidacion.indicadorEmpaque}</p>
                      </div>
                    )}
                    {resultadoValidacion.codigoProducto && (
                      <div>
                        <p className="text-muted-foreground">Código de Producto</p>
                        <p className="font-mono">{resultadoValidacion.codigoProducto}</p>
                      </div>
                    )}
                  </div>

                  {resultadoValidacion.errores.length > 0 && (
                    <div className="mt-4 p-3 rounded bg-destructive/10 border border-destructive/20">
                      <p className="font-medium text-destructive mb-2">Errores encontrados:</p>
                      <ul className="list-disc list-inside text-sm text-destructive">
                        {resultadoValidacion.errores.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Extraer de Texto */}
          <TabsContent value="extraer" className="space-y-4">
            <div className="space-y-2">
              <textarea
                className="w-full h-32 p-3 rounded-md border border-input bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Pegue aquí el texto con descripciones de productos para extraer códigos GTIN..."
                value={textoExtraccion}
                onChange={(e) => setTextoExtraccion(e.target.value)}
              />
              <Button onClick={handleExtraer} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Extraer Códigos GTIN
              </Button>
            </div>

            {codigosExtraidos.length > 0 && (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {codigosExtraidos.map((gtin, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {gtin.valido ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <div>
                          <p className="font-mono text-sm">{gtin.codigo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{gtin.tipo}</Badge>
                            {gtin.paisOrigen && (
                              <span className="text-xs text-muted-foreground">
                                {gtin.paisOrigen}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copiarCodigo(gtin.codigo)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Tab: Análisis Manifiesto */}
          <TabsContent value="manifiesto" className="space-y-4">
            {analisisManifiesto && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold">{analisisManifiesto.reporte.totalCodigos}</p>
                      <p className="text-sm text-muted-foreground">Total Códigos</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-500/30">
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold text-green-500">
                        {analisisManifiesto.reporte.codigosValidos}
                      </p>
                      <p className="text-sm text-muted-foreground">Válidos</p>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/30">
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold text-destructive">
                        {analisisManifiesto.reporte.codigosInvalidos}
                      </p>
                      <p className="text-sm text-muted-foreground">Inválidos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold">
                        {Object.keys(analisisManifiesto.reporte.porPais).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Países</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Por tipo */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Por Tipo de Código</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analisisManifiesto.reporte.porTipo)
                          .filter(([_, count]) => count > 0)
                          .map(([tipo, count]) => (
                            <div key={tipo} className="flex justify-between items-center">
                              <Badge variant="outline">{tipo}</Badge>
                              <span className="font-mono">{count}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Por país */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Por País de Origen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {Object.entries(analisisManifiesto.reporte.porPais)
                            .sort((a, b) => b[1] - a[1])
                            .map(([pais, count]) => (
                              <div key={pais} className="flex justify-between items-center">
                                <span className="text-sm flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {pais}
                                </span>
                                <span className="font-mono text-sm">{count}</span>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Códigos con errores */}
                {analisisManifiesto.reporte.codigosConErrores.length > 0 && (
                  <Card className="border-amber-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Códigos con Errores ({analisisManifiesto.reporte.codigosConErrores.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {analisisManifiesto.reporte.codigosConErrores.map((gtin, i) => (
                            <div key={i} className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                              <p className="font-mono text-sm">{gtin.codigo}</p>
                              <p className="text-xs text-muted-foreground">
                                {gtin.errores.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
