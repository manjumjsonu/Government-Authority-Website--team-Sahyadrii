import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email?: string;
  surveyNumber?: string;
  name?: string;
  role: 'authority' | 'farmer' | 'vendor';
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      const storedRole = localStorage.getItem('role');

      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          setRole(storedRole);
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          // Clear corrupted data
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setRole(userData.role);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    localStorage.setItem('role', userData.role);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole(null);

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
