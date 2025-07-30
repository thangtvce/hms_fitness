import React,{ createContext,useEffect,useState,useContext,useCallback,useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from 'services/apiAuthService';
import jwtDecode from 'jwt-decode';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [authState,setAuthState] = useState({
    authToken: null,
    user: null,
    loading: true,
  });
  const refreshTimerRef = useRef(null);
  const isRefreshingRef = useRef(false);

  const validateUserData = (userData) => {
    if (!userData || typeof userData !== 'object') return false;
    const { userId,email,roles } = userData;
    return (
      userId &&
      typeof userId === 'number' &&
      email &&
      typeof email === 'string' &&
      Array.isArray(roles) &&
      roles.every((role) => typeof role === 'string')
    );
  };

  const validateToken = (token) => {
    return typeof token === 'string' && token.length > 0;
  };

  const saveTokens = async (accessToken,refreshToken,user) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('accessToken',accessToken),
        AsyncStorage.setItem('refreshToken',refreshToken),
        AsyncStorage.setItem('user',JSON.stringify(user)),
      ]);
    } catch (err) {
    }
  };

  const clearTokens = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
    } catch (err) {
    }
  };

  const loadToken = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev,loading: true }));
      const [token,refreshToken,userData] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('user'),
      ]);
      console.log('AuthContext loadToken - accessToken:',token);
      if (token && refreshToken && userData) {
        if (!validateToken(token) || !validateToken(refreshToken)) {
          await logout();
          return;
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(userData);
          if (!validateUserData(parsedUser)) {
            await logout();
            return;
          }
        } catch (parseErr) {
          await logout();
          return;
        }

        try {
          const decoded = jwtDecode(token);
          const { exp } = decoded;
          if (!exp || typeof exp !== 'number') {
            await tryRefreshToken(refreshToken,parsedUser);
            return;
          }

          const currentTime = Math.floor(Date.now() / 1000);
          if (exp > currentTime) {
            setAuthState({ authToken: token,user: parsedUser,loading: false });
            scheduleTokenRefresh(token);
          } else {
            await tryRefreshToken(refreshToken,parsedUser);
          }
        } catch (decodeErr) {
          await tryRefreshToken(refreshToken,parsedUser);
        }
      } else {
        setAuthState({ authToken: null,user: null,loading: false });
      }
    } catch (err) {
      setAuthState({ authToken: null,user: null,loading: false });
    }
  },[]);

  const tryRefreshToken = async (refreshToken,parsedUser) => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const response = await authService.refreshToken({ refreshToken });
      const newAccessToken = response?.data?.accessToken || response?.accessToken;
      const newRefreshToken = response?.data?.refreshToken || response?.refreshToken;

      if (!validateToken(newAccessToken) || !validateToken(newRefreshToken)) {
        throw new Error('Invalid tokens returned from refresh');
      }

      await saveTokens(newAccessToken,newRefreshToken,parsedUser);
      setAuthState({ authToken: newAccessToken,user: parsedUser,loading: false });
      scheduleTokenRefresh(newAccessToken);
    } catch (refreshErr) {
      await logout();
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const scheduleTokenRefresh = (token) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    try {
      const decoded = jwtDecode(token);
      const { exp } = decoded;
      if (!exp || typeof exp !== 'number') {
        refreshAccessToken();
        return;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const timeLeft = exp - currentTime;

      if (timeLeft <= 300) {
        refreshAccessToken();
      } else {
        refreshTimerRef.current = setTimeout(refreshAccessToken,(timeLeft - 300) * 1000);
      }
    } catch (err) {
      refreshAccessToken();
    }
  };

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const response = await authService.refreshToken();
      // Adjust based on actual API response structure
      const newAccessToken = response?.data?.accessToken || response?.accessToken;
      const newRefreshToken = response?.data?.refreshToken || response?.refreshToken;

      if (!validateToken(newAccessToken) || !validateToken(newRefreshToken)) {
        throw new Error('Invalid tokens returned from refresh');
      }

      await saveTokens(newAccessToken,newRefreshToken,authState.user);
      setAuthState((prev) => ({ ...prev,authToken: newAccessToken }));
      scheduleTokenRefresh(newAccessToken);
    } catch (err) {
      await logout();
    } finally {
      isRefreshingRef.current = false;
    }
  },[authState.user]);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    setAuthState({ authToken: null,user: null,loading: false });
    try {
      await authService.logout();

    } catch (err) {
    }
    await clearTokens();
  },[]);

  const hasRole = (role) => {
    if (!authState.user || !Array.isArray(authState.user.roles)) return false;
    return authState.user.roles.includes(role);
  };

  useEffect(() => {

    loadToken();
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  },[loadToken]);

  // Prevent undefined userId calls
  useEffect(() => {
    if (!authState.user?.userId && !authState.loading) {
    }
  },[authState.user,authState.loading]);

  return (
    <AuthContext.Provider
      value={{
        authToken: authState.authToken,
        user: authState.user,
        loading: authState.loading,
        refreshAccessToken,
        logout,
        hasRole,
        setAuthToken: (token) => setAuthState((prev) => ({ ...prev,authToken: token })),
        setUser: (user) => setAuthState((prev) => ({ ...prev,user })),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};