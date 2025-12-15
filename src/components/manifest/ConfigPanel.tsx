import { useState } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Pill,
  Leaf,
  Stethoscope,
  PawPrint,
  Package,
  Tag
} from 'lucide-react';
import { ProcessingConfig, ProductCategory, ValueThreshold, DEFAULT_CONFIG } from '@/types/manifest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { saveConfig, resetConfig } from '@/lib/storage';
import { toast } from 'sonner';

interface ConfigPanelProps {
  config: ProcessingConfig;
  onConfigChange: (config: ProcessingConfig) => void;
}

const ICON_OPTIONS = [
  { value: 'Pill', label: 'Medicamento', icon: Pill },
  { value: 'Leaf', label: 'Suplemento', icon: Leaf },
  { value: 'Stethoscope', label: 'Médico', icon: Stethoscope },
  { value: 'PawPrint', label: 'Veterinario', icon: PawPrint },
  { value: 'Package', label: 'General', icon: Package },
  { value: 'Tag', label: 'Etiqueta', icon: Tag },
];

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');

  const handleBatchSizeChange = (value: string) => {
    const size = parseInt(value) || 5000;
    onConfigChange({ ...config, batchSize: Math.max(100, Math.min(10000, size)) });
  };

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    onConfigChange({ ...config, sortOrder: value });
  };

  const handleAddKeyword = (categoryId: string) => {
    if (!newKeyword.trim()) return;
    
    const updatedCategories = config.categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, keywords: [...cat.keywords, newKeyword.trim().toLowerCase()] }
        : cat
    );
    onConfigChange({ ...config, categories: updatedCategories });
    setNewKeyword('');
  };

  const handleRemoveKeyword = (categoryId: string, keyword: string) => {
    const updatedCategories = config.categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, keywords: cat.keywords.filter(k => k !== keyword) }
        : cat
    );
    onConfigChange({ ...config, categories: updatedCategories });
  };

  const handleAddCategory = () => {
    const newCategory: ProductCategory = {
      id: `custom-${Date.now()}`,
      name: 'Nueva Categoría',
      keywords: [],
      color: 'category-general',
      icon: 'Package',
      priority: config.categories.length + 1,
    };
    onConfigChange({ ...config, categories: [...config.categories, newCategory] });
    setEditingCategory(newCategory.id);
  };

  const handleRemoveCategory = (categoryId: string) => {
    if (categoryId === 'general') {
      toast.error('No se puede eliminar la categoría General');
      return;
    }
    const updatedCategories = config.categories.filter(cat => cat.id !== categoryId);
    onConfigChange({ ...config, categories: updatedCategories });
  };

  const handleCategoryNameChange = (categoryId: string, name: string) => {
    const updatedCategories = config.categories.map(cat => 
      cat.id === categoryId ? { ...cat, name } : cat
    );
    onConfigChange({ ...config, categories: updatedCategories });
  };

  const handleSaveConfig = () => {
    saveConfig(config);
    toast.success('Configuración guardada');
  };

  const handleResetConfig = () => {
    const defaultConfig = resetConfig();
    onConfigChange(defaultConfig);
    toast.success('Configuración restablecida');
  };

  const handleValueThresholdChange = (id: string, field: 'minValue' | 'maxValue', value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedThresholds = config.valueTresholds.map(t => 
      t.id === id ? { ...t, [field]: numValue } : t
    );
    onConfigChange({ ...config, valueTresholds: updatedThresholds });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuración de Procesamiento
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-6 animate-slide-up">
        <div className="card-elevated p-6 space-y-6">
          {/* General Settings */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Configuración General</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tamaño máximo de lote
                </label>
                <Input
                  type="number"
                  value={config.batchSize}
                  onChange={(e) => handleBatchSizeChange(e.target.value)}
                  min={100}
                  max={10000}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo de registros por archivo (100-10,000)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Orden de valores
                </label>
                <Select value={config.sortOrder} onValueChange={handleSortOrderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Menor a mayor</SelectItem>
                    <SelectItem value="desc">Mayor a menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Value Thresholds */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Umbrales de Valor</h4>
            <div className="space-y-3">
              {config.valueTresholds.map(threshold => (
                <div key={threshold.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Input
                    value={threshold.name}
                    className="max-w-[200px]"
                    readOnly
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Min:</span>
                    <Input
                      type="number"
                      value={threshold.minValue}
                      onChange={(e) => handleValueThresholdChange(threshold.id, 'minValue', e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Max:</span>
                    <Input
                      type="number"
                      value={threshold.maxValue === Infinity ? '' : threshold.maxValue}
                      onChange={(e) => handleValueThresholdChange(threshold.id, 'maxValue', e.target.value || 'Infinity')}
                      placeholder="∞"
                      className="w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-foreground">Categorías de Productos</h4>
              <Button variant="outline" size="sm" onClick={handleAddCategory} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {config.categories.map(category => {
                const IconComponent = ICON_OPTIONS.find(i => i.value === category.icon)?.icon || Package;
                
                return (
                  <div key={category.id} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                      </div>
                      
                      {editingCategory === category.id ? (
                        <Input
                          value={category.name}
                          onChange={(e) => handleCategoryNameChange(category.id, e.target.value)}
                          onBlur={() => setEditingCategory(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingCategory(null)}
                          autoFocus
                          className="max-w-[200px]"
                        />
                      ) : (
                        <span 
                          className="font-medium text-foreground cursor-pointer hover:text-primary"
                          onClick={() => setEditingCategory(category.id)}
                        >
                          {category.name}
                        </span>
                      )}

                      <Badge variant="secondary" className="ml-auto">
                        Prioridad: {category.priority}
                      </Badge>

                      {category.id !== 'general' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCategory(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {category.keywords.map(keyword => (
                        <Badge 
                          key={keyword} 
                          variant="outline"
                          className="gap-1 cursor-pointer hover:bg-destructive-light hover:text-destructive hover:border-destructive"
                          onClick={() => handleRemoveKeyword(category.id, keyword)}
                        >
                          {keyword}
                          <span className="text-xs">×</span>
                        </Badge>
                      ))}
                      {category.keywords.length === 0 && category.id !== 'general' && (
                        <span className="text-sm text-muted-foreground italic">
                          Sin palabras clave
                        </span>
                      )}
                    </div>

                    {category.id !== 'general' && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nueva palabra clave"
                          value={editingCategory === category.id ? newKeyword : ''}
                          onChange={(e) => {
                            setEditingCategory(category.id);
                            setNewKeyword(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddKeyword(category.id);
                            }
                          }}
                          className="max-w-[200px]"
                        />
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleAddKeyword(category.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleResetConfig} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </Button>
            <Button onClick={handleSaveConfig} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Configuración
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
