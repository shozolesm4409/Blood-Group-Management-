import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { auth } from '../services/firebase';
import { getUserProfile, logoutUser } from '../services/api';
// Standard modular SDK import for onAuthStateChanged
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    token: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setState({
              user: userProfile,
              isAuthenticated: true,
              token: await firebaseUser.getIdToken()
            });
          } else {
            // User authenticated in Firebase but no profile in Firestore (edge case)
            setState({ user: null, isAuthenticated: false, token: null });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setState({ user: null, isAuthenticated: false, token: null });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (user: User) => {
    // This is primarily used by the Login page to update local state immediately 
    // after successful login promise, but onAuthStateChanged will handles the source of truth.
    setState(prev => ({ ...prev, user, isAuthenticated: true }));
  };

  const logout = async () => {
    await logoutUser(state.user);
    setState({ user: null, isAuthenticated: false, token: null });
  };

  const updateUser = (user: User) => {
    setState(prev => ({ ...prev, user }));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
