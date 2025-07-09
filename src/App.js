import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from 'components/theme/ThemeContext';
import AppNavigator from 'navigation/AppNavigator';
import { StepTrackerProvider } from 'context/StepTrackerContext';
import { WaterTotalProvider } from './context/WaterTotalContext';


function RootNavigator() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Không cần truyền userId, StepTrackerProvider sẽ tự lấy từ AuthContext
  return (
    <StepTrackerProvider>
      <AppNavigator initialRouteName={user ? 'Main' : 'Login'} />
    </StepTrackerProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WaterTotalProvider>
        <RootNavigator />
      </WaterTotalProvider>
    </ThemeProvider>
  );
}