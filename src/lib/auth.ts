import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'merchant';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  merchantId?: string;
  accountNumber?: string;
  merchantName?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  rememberMe: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setRememberMe: (remember: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      rememberMe: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    {
      name: 'paygate-auth',
      partialize: (state) => ({
        user: state.user,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

export const initializeAuth = async () => {
  const { setUser, setLoading } = useAuthStore.getState();

  // Set up auth state listener FIRST
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // Defer Supabase calls with setTimeout to avoid deadlock
      setTimeout(async () => {
        const userData = await fetchUserData(session.user.id, session.user.email || '');
        setUser(userData);
        setLoading(false);
      }, 0);
    } else {
      setUser(null);
      setLoading(false);
    }
  });

  // THEN check for existing session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const userData = await fetchUserData(session.user.id, session.user.email || '');
    setUser(userData);
  }
  setLoading(false);
};

async function fetchUserData(userId: string, email: string): Promise<User | null> {
  try {
    // Check user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    const role = (roleData?.[0]?.role as UserRole) || 'merchant';

    if (role === 'admin') {
      return {
        id: userId,
        email,
        role: 'admin',
      };
    }

    // For merchants, get merchant data
    const { data: merchantData } = await supabase
      .from('merchants')
      .select('id, account_number, merchant_name')
      .eq('user_id', userId)
      .limit(1);

    const merchant = merchantData?.[0];

    return {
      id: userId,
      email,
      role: 'merchant',
      merchantId: merchant?.id,
      accountNumber: merchant?.account_number,
      merchantName: merchant?.merchant_name,
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}
