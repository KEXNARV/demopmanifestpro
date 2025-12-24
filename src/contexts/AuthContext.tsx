// ============================================
// AuthContext - Proveedor de autenticación y RBAC
// H02: Sistema de autenticación con roles verificados
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Tipos de rol (debe coincidir con app_role en DB)
export type AppRole = 'operador' | 'revisor' | 'auditor' | 'admin';

// Permisos por acción
export type Permission = 
  | 'cargar_manifiesto'
  | 'ver_resultados'
  | 'solicitar_revision'
  | 'aprobar_liquidacion'
  | 'rechazar_liquidacion'
  | 'reclasificar'
  | 'exportar_reportes'
  | 'ver_auditoria'
  | 'verificar_integridad'
  | 'administrar_config'
  | 'administrar_usuarios';

// Mapa de permisos por rol
const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  operador: [
    'cargar_manifiesto',
    'ver_resultados',
    'solicitar_revision'
  ],
  revisor: [
    'cargar_manifiesto',
    'ver_resultados',
    'solicitar_revision',
    'aprobar_liquidacion',
    'rechazar_liquidacion',
    'reclasificar',
    'exportar_reportes'
  ],
  auditor: [
    'ver_resultados',
    'exportar_reportes',
    'ver_auditoria',
    'verificar_integridad'
  ],
  admin: [
    'cargar_manifiesto',
    'ver_resultados',
    'solicitar_revision',
    'aprobar_liquidacion',
    'rechazar_liquidacion',
    'reclasificar',
    'exportar_reportes',
    'ver_auditoria',
    'verificar_integridad',
    'administrar_config',
    'administrar_usuarios'
  ]
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: AppRole) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar rol del usuario desde la base de datos
  const loadUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role')
        .limit(1)
        .single();
      
      if (error) {
        console.warn('Error loading user role:', error);
        return null;
      }
      
      return data?.role as AppRole || 'operador';
    } catch (err) {
      console.error('Exception loading role:', err);
      return null;
    }
  };

  useEffect(() => {
    // Configurar listener de auth PRIMERO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Cargar rol de forma diferida para evitar deadlock
        if (newSession?.user) {
          setTimeout(() => {
            loadUserRole(newSession.user.id).then(userRole => {
              setRole(userRole);
            });
          }, 0);
        } else {
          setRole(null);
        }
      }
    );

    // LUEGO verificar sesión existente
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        loadUserRole(existingSession.user.id).then(userRole => {
          setRole(userRole);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return { error: new Error(error.message) };
      }
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || email
          }
        }
      });
      
      if (error) {
        return { error: new Error(error.message) };
      }
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  };

  const hasRole = (checkRole: AppRole): boolean => {
    return role === checkRole;
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasRole,
    isAuthenticated: !!user && !!session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
