import React, { useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { AuthContext, useAuthState } from '../hooks/useAuth';
import { ColorModeContext } from '../hooks/useColorMode';
import { lightTheme, darkTheme } from '../theme';

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(systemColorScheme || 'light');
  const authState = useAuthState();

  useEffect(() => {
    AsyncStorage.getItem('colorMode').then((stored) => {
      if (stored === 'light' || stored === 'dark') setColorMode(stored);
    });
  }, []);

  const toggleColorMode = useCallback(async () => {
    const next = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(next);
    await AsyncStorage.setItem('colorMode', next);
  }, [colorMode]);

  const theme = colorMode === 'dark' ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={authState}>
        <ColorModeContext.Provider value={{ colorMode, toggleColorMode }}>
          <PaperProvider theme={theme}>
            <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="job/[id]"
                options={{ headerShown: true, title: 'Detalle de Oferta', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface }}
              />
              <Stack.Screen
                name="job/create"
                options={{ headerShown: true, title: 'Publicar Oferta', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface }}
              />
              <Stack.Screen
                name="candidate/[id]"
                options={{ headerShown: true, title: 'Perfil del Candidato', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface }}
              />
              <Stack.Screen
                name="applications"
                options={{ headerShown: true, title: 'Postulaciones Recibidas', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface }}
              />
              <Stack.Screen
                name="favorites"
                options={{ headerShown: true, title: 'Mis Favoritos', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface }}
              />
              <Stack.Screen
                name="documents"
                options={{ headerShown: true, title: 'Mis Documentos', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface }}
              />
            </Stack>
          </PaperProvider>
        </ColorModeContext.Provider>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
