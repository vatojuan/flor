import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '../../services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleSubmit = async () => {
    if (!email.trim()) {
      setSnackbar({ visible: true, message: 'Ingresa tu email' });
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={sent ? 'email-fast-outline' : 'lock-reset'}
          size={64}
          color={colors.primary}
          style={styles.icon}
        />

        {sent ? (
          <>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
              Email Enviado
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
              Si el email existe en nuestro sistema, recibiras instrucciones para resetear tu contraseña.
            </Text>
            <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button} contentStyle={{ height: 50 }}>
              Volver al Login
            </Button>
          </>
        ) : (
          <>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
              Recuperar Contraseña
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
              Ingresa tu email y te enviaremos instrucciones para resetear tu contraseña.
            </Text>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              style={[styles.input, { alignSelf: 'stretch' }]}
              outlineStyle={{ borderRadius: 12 }}
            />
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ height: 50 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
            >
              Enviar Instrucciones
            </Button>
            <Button mode="text" onPress={() => router.back()}>
              Volver al Login
            </Button>
          </>
        )}
      </View>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  icon: { marginBottom: 16 },
  title: { fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: 'transparent', marginBottom: 16 },
  button: { borderRadius: 12, alignSelf: 'stretch', marginBottom: 8 },
});
