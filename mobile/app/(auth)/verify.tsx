import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verifyCode, resendCode } from '../../services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function VerifyScreen() {
  const theme = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleVerify = async () => {
    if (!code.trim()) {
      setSnackbar({ visible: true, message: 'Ingresa el codigo de verificacion' });
      return;
    }
    setLoading(true);
    try {
      await verifyCode(email || '', code.trim());
      setSnackbar({ visible: true, message: 'Email verificado correctamente' });
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendCode(email || '');
      setSnackbar({ visible: true, message: 'Codigo reenviado a tu email' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="email-check-outline" size={64} color={colors.primary} style={styles.icon} />
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Verifica tu Email
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
          Enviamos un codigo de verificacion a{'\n'}
          <Text style={{ fontWeight: '600' }}>{email}</Text>
        </Text>

        <TextInput
          label="Codigo de verificacion"
          value={code}
          onChangeText={setCode}
          mode="outlined"
          keyboardType="number-pad"
          style={[styles.input, { alignSelf: 'stretch' }]}
          outlineStyle={{ borderRadius: 12 }}
          left={<TextInput.Icon icon="shield-key-outline" />}
        />

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ height: 50 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
        >
          Verificar
        </Button>

        <Button mode="text" onPress={handleResend} loading={resending} disabled={resending}>
          Reenviar codigo
        </Button>
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
