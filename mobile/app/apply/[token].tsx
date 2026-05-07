import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FAST_API } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

export default function ApplyConfirmScreen() {
  const theme = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token invalido');
      return;
    }

    fetch(`${FAST_API}/api/job/apply/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.token) {
          await loginWithToken(data.token);
          setStatus('success');
          setMessage('Postulacion confirmada exitosamente');
        } else {
          setStatus('error');
          setMessage(data.detail || 'Error al confirmar postulacion');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Error de conexion');
      });
  }, [token]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurface }}>
            Confirmando postulacion...
          </Text>
        </>
      )}

      {status === 'success' && (
        <>
          <MaterialCommunityIcons name="check-circle" size={72} color={colors.success} />
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 16, color: theme.colors.onBackground }}>
            ¡Listo!
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            {message}
          </Text>
          <Button mode="contained" onPress={() => router.replace('/(tabs)')} style={styles.button} contentStyle={{ height: 48 }}>
            Ir al Inicio
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <MaterialCommunityIcons name="alert-circle" size={72} color={colors.error} />
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 16, color: theme.colors.onBackground }}>
            Error
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            {message}
          </Text>
          <Button mode="contained" onPress={() => router.replace('/(tabs)')} style={styles.button} contentStyle={{ height: 48 }}>
            Ir al Inicio
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  button: { borderRadius: 12, marginTop: 24, alignSelf: 'stretch' },
});
