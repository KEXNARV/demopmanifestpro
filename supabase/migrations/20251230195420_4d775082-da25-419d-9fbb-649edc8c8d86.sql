-- Restringir acceso a consignatarios_fiscales: solo propietarios o roles privilegiados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver consignatarios" ON public.consignatarios_fiscales;

CREATE POLICY "Users can view own consignatarios or privileged roles"
  ON public.consignatarios_fiscales
  FOR SELECT
  USING (
    corredor_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'auditor'::app_role) OR
    has_role(auth.uid(), 'revisor'::app_role)
  );