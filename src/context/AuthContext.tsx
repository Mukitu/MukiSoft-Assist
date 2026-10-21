import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types/database';
import { api } from '../services/api';

export interface UserSession {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: UserSession | null;
  profile: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password?: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  switchDemoRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: 'user',
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
  isSupabaseConfigured: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  resetPassword: async () => ({ success: false }),
  switchDemoRole: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Supabase getSession error:', error);
          }

          if (session?.user && isMounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email || 'User',
            });

            // Fetch profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileData && isMounted) {
              setProfile(profileData as Profile);
            }
          } else if (isMounted) {
            setUser(null);
            setProfile(null);
          }

          // Listen for auth changes
          const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.email || 'User',
              });

              const { data: profileData } = await supabase!
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profileData && isMounted) {
                setProfile(profileData as Profile);
              }
            } else {
              setUser(null);
              setProfile(null);
            }
          });

          return () => {
            authListener.subscription.unsubscribe();
          };
        } else {
          // Supabase not configured: Check if an active session was previously created via login/role-switcher
          const savedDemo = localStorage.getItem('mukisoft_demo_current_user');
          if (savedDemo && isMounted) {
            try {
              const parsed = JSON.parse(savedDemo);
              if (parsed && parsed.id && parsed.email) {
                setUser({ id: parsed.id, email: parsed.email, name: parsed.full_name || parsed.name });
                setProfile(parsed);
              } else {
                localStorage.removeItem('mukisoft_demo_current_user');
                setUser(null);
                setProfile(null);
              }
            } catch {
              localStorage.removeItem('mukisoft_demo_current_user');
              setUser(null);
              setProfile(null);
            }
          } else if (isMounted) {
            // Visitor is unauthenticated by default
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
    }
  };

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        if (!password) {
          return { success: false, error: 'Password is required' };
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || data.user.email || '',
          });
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (p) setProfile(p as Profile);
        }
        return { success: true };
      }

      // Demo login
      const profiles = await api.getUsers();
      const existing = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
      const selected: Profile = existing || {
        id: `user_${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        role: 'user',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser({ id: selected.id, email: selected.email, name: selected.full_name });
      setProfile(selected);
      localStorage.setItem('mukisoft_demo_current_user', JSON.stringify(selected));
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password?: string, fullName?: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        if (!password) return { success: false, error: 'Password required' };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'MukiSoft User',
            },
          },
        });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: fullName || 'MukiSoft User',
          });
        }
        return { success: true };
      }

      const newProfile: Profile = {
        id: `user_${Date.now()}`,
        email,
        full_name: fullName || email.split('@')[0],
        role: 'user',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser({ id: newProfile.id, email: newProfile.email, name: newProfile.full_name });
      setProfile(newProfile);
      localStorage.setItem('mukisoft_demo_current_user', JSON.stringify(newProfile));
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('mukisoft_demo_current_user');
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: true };
  };

  const switchDemoRole = (targetRole: UserRole) => {
    const rolesMap: Record<UserRole, Profile> = {
      super_admin: {
        id: 'user_super_admin',
        email: 'superadmin@mukisoft.com',
        full_name: 'Lead Director (Super Admin)',
        role: 'super_admin',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      admin: {
        id: 'user_admin_demo',
        email: 'admin@mukisoft.com',
        full_name: 'Operations Manager (Admin)',
        role: 'admin',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      user: {
        id: 'user_customer_demo',
        email: 'tanvir@example.com',
        full_name: 'Tanvir Hossain (Client)',
        role: 'user',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const targetProfile = rolesMap[targetRole];
    setUser({ id: targetProfile.id, email: targetProfile.email, name: targetProfile.full_name });
    setProfile(targetProfile);
    localStorage.setItem('mukisoft_demo_current_user', JSON.stringify(targetProfile));
  };

  const role: UserRole = profile?.role || 'user';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        profile,
        role,
        isAuthenticated: Boolean(user),
        isAdmin,
        isSuperAdmin,
        isLoading,
        isSupabaseConfigured,
        login,
        register,
        logout,
        resetPassword,
        switchDemoRole,
        refreshProfile,
      },
    },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
