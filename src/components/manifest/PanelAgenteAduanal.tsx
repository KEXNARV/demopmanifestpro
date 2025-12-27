// ============================================
// PANEL AGENTE ADUANAL AI-FIRST
// Interfaz unificada para el procesamiento inteligente
// ============================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Brain,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calculator,
  Package,
  Clock,
  Fingerprint
} from 'lucide-react';
import { UseAgenteAduanalResult } from '@/hooks/useAgenteAduanal';

interface PanelAgenteAduanalProps {
  agenteState: UseAgenteAduanalResult;
  mawb?: string;
}

export function PanelAgenteAduanal({ agenteState, mawb }: PanelAgenteAduanalProps) {
  const { estado, resultado, descargarConFirma, CLAUSULA_RESPONSABILIDAD } = agenteState;
  const [dialogoFirmaAbierto, setDialogoFirmaAbierto] = useState(false);
  const [corredorId, setCorredorId] = useState('');
  const [corredorNombre, setCorredorNombre] = useState('');
  const [aceptaClausula, setAceptaClausula] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = async () => {
    if (!aceptaClausula || !corredorId || !corredorNombre) return;

    setDescargando(true);
    try {
      await descargarConFirma({ id: corredorId, nombre: corredorNombre }, mawb);
      setDialogoFirmaAbierto(false);
      setAceptaClausula(false);
    } finally {
      setDescargando(false);
    }
  };

  if (!resultado) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {estado.procesando ? estado.mensaje : 'No hay datos procesados'}
          </p>
          {estado.procesando && (
            <div className="mt-4 max-w-xs mx-auto">
              <Progress value={estado.progreso} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{estado.fase}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const { resumen, auditoria, liquidaciones, clasificaciones } = resultado;

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Agente Aduanal AI</h2>
            <p className="text-sm text-muted-foreground">
              {resumen.total.toLocaleString()} paquetes procesados
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogoFirmaAbierto(true)} className="gap-2">
          <Download className="w-4 h-4" />
          Descargar con Firma Digital
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">De Minimis</p>
                <p className="text-2xl font-bold">{resumen.deMinimis}</p>
              </div>
              <Package className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Liquidación</p>
                <p className="text-2xl font-bold">{resumen.liquidacion}</p>
              </div>
              <Calculator className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Permisos</p>
                <p className="text-2xl font-bold">{resumen.conPermisos}</p>
              </div>
              <Shield className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revisión</p>
                <p className="text-2xl font-bold">{resumen.requierenRevision}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-2xl font-bold text-primary">
                  B/. {resumen.totalAPagar.toFixed(2)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Tabs defaultValue="auditoria">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auditoria" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Auditoría ({auditoria.paquetesProblematicos.length})
          </TabsTrigger>
          <TabsTrigger value="liquidaciones" className="gap-2">
            <Calculator className="w-4 h-4" />
            Liquidaciones
          </TabsTrigger>
          <TabsTrigger value="clasificaciones" className="gap-2">
            <Brain className="w-4 h-4" />
            Clasificación HTS
          </TabsTrigger>
        </TabsList>

        {/* Tab: Auditoría */}
        <TabsContent value="auditoria" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Log de Auditoría de Riesgos
              </CardTitle>
              <CardDescription>
                {auditoria.paquetesProblematicos.length} paquetes con alertas detectadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditoria.paquetesProblematicos.length === 0 ? (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertTitle>Sin problemas detectados</AlertTitle>
                  <AlertDescription>
                    Todos los paquetes pasaron la auditoría de riesgos.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guía</TableHead>
                        <TableHead>Riesgos</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Puntuación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditoria.paquetesProblematicos.map((problema) => (
                        <TableRow key={problema.guia}>
                          <TableCell className="font-mono text-sm">
                            {problema.guia}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {problema.riesgosDetectados.length} detectados
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                problema.categoriaRiesgo === 'critico' ? 'destructive' :
                                problema.categoriaRiesgo === 'alto' ? 'destructive' :
                                problema.categoriaRiesgo === 'medio' ? 'secondary' : 'outline'
                              }
                            >
                              {problema.categoriaRiesgo}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {problema.puntuacionRiesgo}/100
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Liquidaciones */}
        <TabsContent value="liquidaciones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Liquidaciones SIGA</CardTitle>
              <CardDescription>
                Total tributos: B/. {resumen.totalTributos.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guía</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">CIF</TableHead>
                      <TableHead className="text-right">DAI</TableHead>
                      <TableHead className="text-right">ITBMS</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liquidaciones.slice(0, 100).map((liq) => (
                      <TableRow key={liq.numeroGuia}>
                        <TableCell className="font-mono text-sm">
                          {liq.numeroGuia}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{liq.categoriaAduanera}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.valorCIF.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.montoDAI.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${liq.montoITBMS.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${liq.totalAPagar.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Clasificaciones */}
        <TabsContent value="clasificaciones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clasificación HTS con NLP</CardTitle>
              <CardDescription>
                {clasificaciones.size} códigos HTS asignados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guía</TableHead>
                      <TableHead>HTS Code</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Confianza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(clasificaciones.entries()).slice(0, 100).map(([guia, clasif]) => (
                      <TableRow key={guia}>
                        <TableCell className="font-mono text-sm">
                          {guia}
                        </TableCell>
                        <TableCell className="font-mono font-bold">
                          {clasif.hsCode}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {clasif.arancel?.descripcion || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              clasif.confianzaClasificacion >= 80 ? 'default' :
                              clasif.confianzaClasificacion >= 50 ? 'secondary' : 'outline'
                            }
                          >
                            {clasif.confianzaClasificacion}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Firma Digital */}
      <Dialog open={dialogoFirmaAbierto} onOpenChange={setDialogoFirmaAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Firma Digital y Descarga
            </DialogTitle>
            <DialogDescription>
              El archivo será firmado digitalmente con hash SHA-256
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="corredor-id">ID del Corredor</Label>
                <Input
                  id="corredor-id"
                  placeholder="Ej: COR-12345"
                  value={corredorId}
                  onChange={(e) => setCorredorId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corredor-nombre">Nombre del Corredor</Label>
                <Input
                  id="corredor-nombre"
                  placeholder="Nombre completo"
                  value={corredorNombre}
                  onChange={(e) => setCorredorNombre(e.target.value)}
                />
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertTitle>Cláusula de Responsabilidad Técnica</AlertTitle>
              <AlertDescription className="text-sm mt-2">
                <ScrollArea className="h-[100px]">
                  <p className="text-xs">{CLAUSULA_RESPONSABILIDAD}</p>
                </ScrollArea>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acepta-clausula"
                checked={aceptaClausula}
                onCheckedChange={(checked) => setAceptaClausula(checked === true)}
              />
              <label
                htmlFor="acepta-clausula"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Acepto la cláusula de responsabilidad técnica
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoFirmaAbierto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDescargar}
              disabled={!aceptaClausula || !corredorId || !corredorNombre || descargando}
              className="gap-2"
            >
              {descargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  Firmar y Descargar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PanelAgenteAduanal;
