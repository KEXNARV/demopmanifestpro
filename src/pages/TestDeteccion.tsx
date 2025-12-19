import { useState } from 'react';
import { DetectorColumnasMejorado } from '@/lib/deteccion/detectorColumnasMejorado';
import { ClasificadorInteligente } from '@/lib/clasificacion/clasificadorInteligente';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Beaker, Search, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TestDeteccion() {
  const [columnas, setColumnas] = useState('Guía Aérea,Nombre Completo,Cédula,Teléfono,Dirección,Descripción,Valor,Peso');
  const [descripcion, setDescripcion] = useState('iPhone 15 Pro Max 256GB');
  const [valor, setValor] = useState('800');
  const [resultadoColumnas, setResultadoColumnas] = useState<ReturnType<typeof DetectorColumnasMejorado.detectar> | null>(null);
  const [resultadoClasificacion, setResultadoClasificacion] = useState<ReturnType<typeof ClasificadorInteligente.clasificar> | null>(null);

  const probarDeteccion = () => {
    const columnasArray = columnas.split(',').map(c => c.trim()).filter(Boolean);
    const resultado = DetectorColumnasMejorado.detectar(columnasArray);
    setResultadoColumnas(resultado);
  };

  const probarClasificacion = () => {
    const resultado = ClasificadorInteligente.clasificar(descripcion, parseFloat(valor) || 0);
    setResultadoClasificacion(resultado);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Beaker className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Testing del Sistema</h1>
          </div>
        </div>

        {/* Test 1: Detección de Columnas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Test 1: Detección Automática de Columnas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="columnas">Columnas (separadas por coma)</Label>
              <Input
                id="columnas"
                value={columnas}
                onChange={(e) => setColumnas(e.target.value)}
                placeholder="Columna1,Columna2,Columna3..."
              />
            </div>

            <Button onClick={probarDeteccion}>
              Detectar Columnas
            </Button>

            {resultadoColumnas && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold">Resultado:</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Mapeo:</p>
                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(resultadoColumnas.mapping, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Confianza:</p>
                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(resultadoColumnas.confianza, null, 2)}
                    </pre>
                  </div>
                </div>

                {resultadoColumnas.noDetectados.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-destructive mb-2">No detectados:</p>
                    <div className="flex flex-wrap gap-2">
                      {resultadoColumnas.noDetectados.map((col, i) => (
                        <Badge key={i} variant="destructive">{col}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test 2: Clasificación de Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Test 2: Clasificación Inteligente de Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción del Producto</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: iPhone 15, Vitamina C, Zapatillas Nike..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor USD</Label>
              <Input
                id="valor"
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <Button onClick={probarClasificacion}>
              Clasificar Producto
            </Button>

            {resultadoClasificacion && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">
                    Categoría: {resultadoClasificacion.categoriaProducto}
                  </Badge>
                  <Badge variant="secondary">
                    Aduanera: {resultadoClasificacion.categoriaAduanera}
                  </Badge>
                  <Badge variant="outline">
                    Confianza: {resultadoClasificacion.confianza}%
                  </Badge>
                </div>

                {resultadoClasificacion.requierePermiso && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="font-semibold text-destructive">⚠️ Requiere Permiso</p>
                    <p className="text-sm text-muted-foreground">
                      Autoridades: {resultadoClasificacion.autoridades.join(', ')}
                    </p>
                  </div>
                )}

                {resultadoClasificacion.restricciones.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Restricciones:</p>
                    <ul className="text-sm space-y-1">
                      {resultadoClasificacion.restricciones.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultadoClasificacion.palabrasClaveDetectadas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Palabras clave detectadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {resultadoClasificacion.palabrasClaveDetectadas.map((palabra, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {palabra}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Cases Predefinidos */}
        <Card>
          <CardHeader>
            <CardTitle>Casos de Prueba Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescripcion('Ibuprofen 200mg tablets');
                  setValor('25');
                }}
              >
                Test: Medicamento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescripcion('Vitamin C 1000mg supplement');
                  setValor('30');
                }}
              >
                Test: Suplemento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescripcion('Samsung Galaxy S24 smartphone');
                  setValor('899');
                }}
              >
                Test: Electrónica
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescripcion('Nike Air Max sneakers');
                  setValor('150');
                }}
              >
                Test: Calzado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescripcion('Dog food premium 15kg');
                  setValor('45');
                }}
              >
                Test: Mascotas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescripcion('Laptop HP Pavilion 16GB RAM');
                  setValor('750');
                }}
              >
                Test: Computación
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
