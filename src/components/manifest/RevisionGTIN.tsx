/**
 * Componente de revisión manual para productos con códigos GTIN inválidos
 * Permite corregir o confirmar códigos GTIN detectados en las descripciones
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Barcode,
  Globe,
  Package,
  ArrowRight
} from 'lucide-react';
import { ManifestRow } from '@/types/manifest';
import { validarGTIN, procesarGTIN, GTINInfo } from '@/lib/gtin/gtinProcessor';

interface RevisionGTINProps {
  rows: ManifestRow[];
  onUpdateRow: (rowId: string, updates: Partial<ManifestRow>) => void;
  onMarcarRevisado: (rowId: string) => void;
}

export function RevisionGTIN({ rows, onUpdateRow, onMarcarRevisado }: RevisionGTINProps) {
  const [filtro, setFiltro] = useState('');
  const [selectedRow, setSelectedRow] = useState<ManifestRow | null>(null);
  const [nuevoGTIN, setNuevoGTIN] = useState('');
  const [validacionNuevo, setValidacionNuevo] = useState<GTINInfo | null>(null);

  // Filtrar solo filas que requieren revisión GTIN
  const filasConProblemas = useMemo(() => {
    return rows.filter(row => row.requiereRevisionGTIN).filter(row => {
      if (!filtro) return true;
      const busqueda = filtro.toLowerCase();
      return (
        row.trackingNumber.toLowerCase().includes(busqueda) ||
        row.description.toLowerCase().includes(busqueda) ||
        row.gtinCodigos?.some(g => g.includes(busqueda))
      );
    });
  }, [rows, filtro]);

  const estadisticas = useMemo(() => {
    const total = rows.filter(r => r.gtinCodigos && r.gtinCodigos.length > 0).length;
    const invalidos = rows.filter(r => r.requiereRevisionGTIN).length;
    const validos = total - invalidos;
    return { total, validos, invalidos };
  }, [rows]);

  const handleValidarNuevo = () => {
    if (nuevoGTIN) {
      const info = procesarGTIN(nuevoGTIN);
      setValidacionNuevo(info);
    }
  };

  const handleAplicarCorreccion = (rowId: string) => {
    if (validacionNuevo && validacionNuevo.valido) {
      onUpdateRow(rowId, {
        gtinCodigos: [validacionNuevo.codigo],
        gtinValido: true,
        gtinErrores: undefined,
        gtinPaisOrigen: validacionNuevo.paisOrigen,
        requiereRevisionGTIN: false
      });
      setSelectedRow(null);
      setNuevoGTIN('');
      setValidacionNuevo(null);
    }
  };

  const handleIgnorar = (rowId: string) => {
    onUpdateRow(rowId, {
      gtinValido: true,
      requiereRevisionGTIN: false
    });
    onMarcarRevisado(rowId);
    setSelectedRow(null);
  };

  if (estadisticas.total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Barcode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">Sin códigos GTIN detectados</h3>
          <p className="text-muted-foreground mt-2">
            No se encontraron códigos GTIN en las descripciones de los productos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de estado */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total con GTIN</p>
                <p className="text-2xl font-bold">{estadisticas.total}</p>
              </div>
              <Barcode className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">GTIN Válidos</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.validos}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requieren Revisión</p>
                <p className="text-2xl font-bold text-amber-600">{estadisticas.invalidos}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {estadisticas.invalidos > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Productos con GTIN Inválido
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por guía, descripción..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Guía</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[150px]">Código GTIN</TableHead>
                    <TableHead className="w-[200px]">Error</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filasConProblemas.map((row) => (
                    <TableRow 
                      key={row.id}
                      className={selectedRow?.id === row.id ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        {row.trackingNumber}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={row.description}>
                        {row.description}
                      </TableCell>
                      <TableCell>
                        {row.gtinCodigos?.map((codigo, idx) => (
                          <Badge 
                            key={idx} 
                            variant="destructive" 
                            className="font-mono text-xs mr-1"
                          >
                            {codigo}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-sm text-destructive">
                        {row.gtinErrores?.[0] || 'Error de validación'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRow(row);
                              setNuevoGTIN(row.gtinCodigos?.[0] || '');
                              setValidacionNuevo(null);
                            }}
                          >
                            Corregir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIgnorar(row.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Panel de corrección */}
      {selectedRow && (
        <Card className="border-primary">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Corregir Código GTIN - Guía {selectedRow.trackingNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Descripción del producto:</p>
              <p className="text-sm text-muted-foreground">{selectedRow.description}</p>
            </div>

            <Alert variant="destructive" className="bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Código actual inválido:</strong> {selectedRow.gtinCodigos?.join(', ')}
                <br />
                <span className="text-sm">{selectedRow.gtinErrores?.join('; ')}</span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Nuevo código GTIN</label>
                <Input
                  placeholder="Ingrese el código GTIN correcto"
                  value={nuevoGTIN}
                  onChange={(e) => {
                    setNuevoGTIN(e.target.value);
                    setValidacionNuevo(null);
                  }}
                  className="font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleValidarNuevo}>
                  Validar
                </Button>
              </div>
            </div>

            {validacionNuevo && (
              <div className={`p-4 rounded-lg border ${validacionNuevo.valido ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validacionNuevo.valido ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${validacionNuevo.valido ? 'text-green-800' : 'text-red-800'}`}>
                    {validacionNuevo.valido ? 'Código GTIN válido' : 'Código GTIN inválido'}
                  </span>
                  <Badge variant="outline">{validacionNuevo.tipo}</Badge>
                </div>
                
                {validacionNuevo.valido && validacionNuevo.paisOrigen && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Globe className="w-4 h-4" />
                    <span>País de origen: {validacionNuevo.paisOrigen}</span>
                  </div>
                )}
                
                {!validacionNuevo.valido && validacionNuevo.errores.length > 0 && (
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                    {validacionNuevo.errores.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleAplicarCorreccion(selectedRow.id)}
                disabled={!validacionNuevo?.valido}
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplicar Corrección
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => handleIgnorar(selectedRow.id)}
                className="gap-2"
              >
                Ignorar GTIN
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedRow(null);
                  setNuevoGTIN('');
                  setValidacionNuevo(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}