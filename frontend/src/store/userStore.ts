import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  created_at: Date;
}

interface UserStore {
  // Estado
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  // Estado inicial
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  // Actions básicas
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Auth methods
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock login - in real implementation would call API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (email === 'admin@aios.com' && password === 'admin123') {
        const mockUser: User = {
          id: 'user-1',
          email: 'admin@aios.com',
          role: 'admin',
          organization_id: 'org-1',
          created_at: new Date()
        };
        
        set({
          currentUser: mockUser,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        throw new Error('Credenciais inválidas');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro no login',
        isLoading: false,
        isAuthenticated: false,
        currentUser: null
      });
    }
  },
  
  logout: () => {
    set({
      currentUser: null,
      isAuthenticated: false,
      error: null
    });
  },
  
  clearError: () => set({ error: null })
}));
