import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '../../services/auth';
import { colors } from '../../theme/colors';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const { email, token } = useLocalSearchParams<{ email: string; token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const passwordValid = PASSWORD_REGEX.test(password);
  const passwordsMatch = password === confirmPassword;

  const handleReset = async () => {
    if (!passwordValid) {
      setSnackbar({ visible: true, message: 'La contraseña no cumple los requisitos' });
      return;
    }
    if (!passwordsMatch) {
      setSnackbar({ visible: true, message: 'Las contraseñas no coinciden' });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email || '', token || '', password);
      setSnackbar({ visible: true, message: 'Contraseña actualizada correctamente' });
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Nueva Contraseña
        </Text>

        <TextInput
          label="Nueva contraseña"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-outline" />}
          right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          style={[styles.input, { alignSelf: 'stretch' }]}
          outlineStyle={{ borderRadius: 12 }}
        />
        <Text variant="bodySmall" style={{ color: password && !passwordValid ? colors.error : theme.colors.onSurfaceVariant, alignSelf: 'stretch' }}>
          Min. 8 caracteres, mayuscula, minuscula, numero y especial
        </Text>

        <TextInput
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-check-outline" />}
          style={[styles.input, { alignSelf: 'stretch' }]}
          outlineStyle={{ borderRadius: 12 }}
          error={!!confirmPassword && !passwordsMatch}
        />

        <Button
          mode="contained"
          onPress={handleReset}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ height: 50 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
        >
          Actualizar Contraseña
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
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: 'transparent' },
  button: { borderRadius: 12, alignSelf: 'stretch', marginTop: 8 },
});
