import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from 'components/theme/ThemeContext'; // Import ThemeProvider
import AppNavigator from 'navigation/AppNavigator';

function RootNavigator() {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return <AppNavigator initialRouteName={user ? 'Main' : 'Login'} />;
}

export default function App() {
    return (
        <ThemeProvider>
            <RootNavigator />
        </ThemeProvider>
    );
}