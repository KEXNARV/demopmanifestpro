/**
 * SELECTOR DE MODO DE TRANSPORTE
 * 
 * Permite seleccionar entre los tres modos de transporte:
 * - Aéreo (Aeropuerto Internacional de Tocumen)
 * - Marítimo (Zona Libre de Colón, Panamá Pacífico)
 * - Terrestre (Paso Canoas)
 */

import { useState } from 'react';
import { Plane, Ship, Truck, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModoTransporte, ZonaAduanera, InfoZonaAduanera, ZONAS_ADUANERAS } from '@/types/transporte';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Configuración de zonas aduaneras por modo
const ZONAS_POR_MODO: Record<ModoTransporte, ZonaAduanera[]> = {
  aereo: [
    'aeropuerto_tocumen',
    'aeropuerto_howard',
    'zona_libre_colon'
  ],
  maritimo: [
    'puerto_cristobal',
    'puerto_manzanillo',
    'puerto_colon_container',
    'puerto_balboa',
    'puerto_psa_rodman',
    'zona_libre_colon'
  ],
  terrestre: [
    'frontera_paso_canoas',
    'frontera_guabito'
  ]
};

// Configuración visual de modos
const MODOS_CONFIG = [
  {
    id: 'aereo' as ModoTransporte,
    nombre: 'Aéreo',
    descripcion: 'Carga aérea - AWB/MAWB',
    Icon: Plane,
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50 dark:bg-sky-950',
    borderColor: 'border-sky-500',
    textColor: 'text-sky-600 dark:text-sky-400'
  },
  {
    id: 'maritimo' as ModoTransporte,
    nombre: 'Marítimo',
    descripcion: 'Carga marítima - B/L',
    Icon: Ship,
    color: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950',
    borderColor: 'border-teal-500',
    textColor: 'text-teal-600 dark:text-teal-400'
  },
  {
    id: 'terrestre' as ModoTransporte,
    nombre: 'Terrestre',
    descripcion: 'Carga terrestre - Carta de Porte',
    Icon: Truck,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400'
  }
];

interface SelectorModoTransporteProps {
  modoSeleccionado: ModoTransporte;
  zonaSeleccionada: ZonaAduanera | null;
  onModoChange: (modo: ModoTransporte) => void;
  onZonaChange: (zona: ZonaAduanera) => void;
  disabled?: boolean;
}

export function SelectorModoTransporte({
  modoSeleccionado,
  zonaSeleccionada,
  onModoChange,
  onZonaChange,
  disabled = false
}: SelectorModoTransporteProps) {
  const zonasDisponibles = ZONAS_POR_MODO[modoSeleccionado];
  const modoConfig = MODOS_CONFIG.find(m => m.id === modoSeleccionado);
  const zonaInfo = zonaSeleccionada ? ZONAS_ADUANERAS[zonaSeleccionada] : null;

  const handleModoSelect = (modo: ModoTransporte) => {
    if (disabled) return;
    onModoChange(modo);
    // Auto-seleccionar primera zona del modo
    const primeraZona = ZONAS_POR_MODO[modo][0];
    if (primeraZona) {
      onZonaChange(primeraZona);
    }
  };

  const handleZonaSelect = (zona: string) => {
    onZonaChange(zona as ZonaAduanera);
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
      {/* Título */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          modoConfig?.bgColor
        )}>
          {modoConfig && <modoConfig.Icon className={cn("w-4 h-4", modoConfig.textColor)} />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Modo de Transporte</h3>
          <p className="text-xs text-muted-foreground">Selecciona el tipo de carga</p>
        </div>
      </div>

      {/* Selector de Modos - Cards */}
      <div className="grid grid-cols-3 gap-3">
        {MODOS_CONFIG.map((modo) => {
          const isSelected = modoSeleccionado === modo.id;
          const Icon = modo.Icon;
          
          return (
            <button
              key={modo.id}
              onClick={() => handleModoSelect(modo.id)}
              className={cn(
                "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected ? [
                  modo.borderColor,
                  modo.bgColor,
                  "shadow-lg"
                ] : [
                  "border-border",
                  "bg-card",
                  "hover:border-muted-foreground/30"
                ]
              )}
            >
              {/* Indicador de selección */}
              {isSelected && (
                <div className={cn(
                  "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full",
                  "bg-gradient-to-br flex items-center justify-center",
                  modo.color
                )}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Icono */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all",
                isSelected ? [
                  "bg-gradient-to-br shadow-inner",
                  modo.color
                ] : "bg-muted"
              )}>
                <Icon className={cn(
                  "w-6 h-6 transition-colors",
                  isSelected ? "text-white" : "text-muted-foreground"
                )} />
              </div>
              
              {/* Texto */}
              <span className={cn(
                "font-semibold text-sm transition-colors",
                isSelected ? modo.textColor : "text-foreground"
              )}>
                {modo.nombre}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 text-center">
                {modo.descripcion}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selector de Zona Aduanera */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className={cn("w-4 h-4", modoConfig?.textColor)} />
          <span className="text-sm font-medium text-foreground">Zona Aduanera</span>
        </div>
        
        <Select
          value={zonaSeleccionada || ''}
          onValueChange={handleZonaSelect}
          disabled={disabled}
        >
          <SelectTrigger className={cn(
            "w-full h-12 border-2",
            zonaSeleccionada && modoConfig?.borderColor
          )}>
            <SelectValue placeholder="Selecciona una zona aduanera">
              {zonaInfo && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "font-mono text-xs",
                    modoConfig?.textColor
                  )}>
                    {zonaInfo.codigoAduana}
                  </Badge>
                  <span className="text-sm">{zonaInfo.nombre}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {zonasDisponibles.map((zonaId) => {
              const zona = ZONAS_ADUANERAS[zonaId];
              return (
                <SelectItem 
                  key={zonaId} 
                  value={zonaId}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 py-1">
                    <Badge variant="outline" className={cn(
                      "font-mono text-xs min-w-[3.5rem] justify-center",
                      modoConfig?.textColor
                    )}>
                      {zona.codigoAduana}
                    </Badge>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{zona.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {zona.provincia} • {zona.tipo === 'aeropuerto' ? '✈️' : zona.tipo === 'puerto' ? '🚢' : zona.tipo === 'frontera' ? '🚛' : '🏭'}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Info de la zona seleccionada */}
      {zonaInfo && (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          modoConfig?.bgColor,
          modoConfig?.borderColor
        )}>
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br",
            modoConfig?.color
          )}>
            {zonaInfo.tipo === 'aeropuerto' && <Plane className="w-5 h-5 text-white" />}
            {zonaInfo.tipo === 'puerto' && <Ship className="w-5 h-5 text-white" />}
            {zonaInfo.tipo === 'frontera' && <Truck className="w-5 h-5 text-white" />}
            {zonaInfo.tipo === 'zona_libre' && <Ship className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold text-sm truncate", modoConfig?.textColor)}>
              {zonaInfo.nombre}
            </p>
            <p className="text-xs text-muted-foreground">
              {zonaInfo.provincia} • Código: {zonaInfo.codigoAduana}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para uso externo
export function useTransportMode() {
  const [modo, setModo] = useState<ModoTransporte>('aereo');
  const [zona, setZona] = useState<ZonaAduanera | null>(ZONAS_POR_MODO.aereo[0]);

  return {
    modo,
    zona,
    setModo,
    setZona,
    zonasDisponibles: ZONAS_POR_MODO[modo]
  };
}

export { ZONAS_POR_MODO, MODOS_CONFIG };
