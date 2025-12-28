-- ============================================
-- TABLA: consignatarios_fiscales
-- Almacena RUC/Cédula asociados a nombres de consignatarios
-- Para enriquecimiento automático de datos fiscales
-- ============================================

CREATE TABLE public.consignatarios_fiscales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_consignatario TEXT NOT NULL,
  nombre_normalizado TEXT NOT NULL,
  ruc_cedula VARCHAR(20) NOT NULL,
  tipo_documento VARCHAR(10) DEFAULT 'cedula' CHECK (tipo_documento IN ('cedula', 'ruc', 'pasaporte')),
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion_principal TEXT,
  ciudad_principal VARCHAR(50),
  provincia_principal VARCHAR(50),
  usos_exitosos INTEGER DEFAULT 1,
  ultimo_uso TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN DEFAULT true,
  corredor_id UUID,
  notas TEXT
);

-- Índices para búsqueda rápida
CREATE INDEX idx_consignatarios_nombre_normalizado ON public.consignatarios_fiscales(nombre_normalizado);
CREATE INDEX idx_consignatarios_ruc_cedula ON public.consignatarios_fiscales(ruc_cedula);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_consignatarios_fiscales_updated_at
  BEFORE UPDATE ON public.consignatarios_fiscales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.consignatarios_fiscales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver consignatarios"
  ON public.consignatarios_fiscales
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores y admins pueden insertar consignatarios"
  ON public.consignatarios_fiscales
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'revisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Revisores y admins pueden actualizar consignatarios"
  ON public.consignatarios_fiscales
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'revisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Datos de ejemplo para pruebas
INSERT INTO public.consignatarios_fiscales (nombre_consignatario, nombre_normalizado, ruc_cedula, tipo_documento, telefono, ciudad_principal, provincia_principal)
VALUES 
  ('MARIA EUGENIA ARANGO', 'maria eugenia arango', '8-814-52', 'cedula', NULL, 'Panamá', 'Panamá'),
  ('JUAN CARLOS RODRIGUEZ', 'juan carlos rodriguez', '8-123-456', 'cedula', NULL, 'Colón', 'Colón'),
  ('FARMACIA UNIVERSAL S.A.', 'farmacia universal sa', '1234567-1-789012', 'ruc', NULL, 'David', 'Chiriquí');