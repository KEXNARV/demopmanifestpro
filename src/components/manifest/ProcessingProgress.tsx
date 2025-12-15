import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingProgressProps {
  progress: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
  message?: string;
}

export function ProcessingProgress({ progress, status, message }: ProcessingProgressProps) {
  return (
    <div className="card-elevated p-8 animate-scale-in">
      <div className="flex flex-col items-center gap-6">
        <div className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500',
          status === 'processing' && 'bg-primary/10',
          status === 'complete' && 'bg-success-light',
          status === 'error' && 'bg-destructive-light'
        )}>
          {status === 'processing' ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : status === 'complete' ? (
            <CheckCircle2 className="w-10 h-10 text-success animate-scale-in" />
          ) : null}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {status === 'processing' ? 'Procesando Manifiesto' : 
             status === 'complete' ? '¡Procesamiento Completado!' : 
             'Procesando...'}
          </h3>
          {message && (
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          )}
        </div>

        <div className="w-full max-w-md">
          <div className="progress-bar">
            <div 
              className={cn(
                'progress-fill',
                status === 'complete' && 'bg-success'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {Math.round(progress)}% completado
          </p>
        </div>
      </div>
    </div>
  );
}
