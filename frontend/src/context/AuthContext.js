import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  getCurrentProfile,
  registerUser,
  setAuthTokenGetter,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return null;
    }

    const response = await getCurrentProfile();
    setProfile(response.profile);
    return response.profile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        setAuthTokenGetter(() => currentUser.getIdToken());

        try {
          await refreshProfile();
        } catch (error) {
          setProfile(null);
        }
      } else {
        setAuthTokenGetter(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const response = await getCurrentProfile();
    setProfile(response.profile);
    return response.profile;
  };

  const register = async (payload) => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const response = await registerUser({
      ...payload,
      email: normalizedEmail,
    });
    await signInWithEmailAndPassword(auth, normalizedEmail, payload.password);
    setProfile(response.profile);
    return response.profile;
  };

  const logout = async () => {
    setAuthTokenGetter(null);
    setProfile(null);
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
