import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { register } from '../../services/auth';
import { colors } from '../../theme/colors';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export default function RegisterScreen() {
  const theme = useTheme();
  const [role, setRole] = useState('empleado');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: '' });

  const passwordValid = PASSWORD_REGEX.test(password);

  const handleRegister = async () => {
    if (!email.trim() || !name.trim() || !password) {
      setSnackbar({ visible: true, message: 'Completa todos los campos', type: 'error' });
      return;
    }
    if (!passwordValid) {
      setSnackbar({ visible: true, message: 'La contraseña no cumple los requisitos', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), name.trim(), password, role);
      setSnackbar({ visible: true, message: 'Cuenta creada. Revisa tu email para verificar.', type: 'success' });
      setTimeout(() => {
        router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
      }, 1500);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            Crear Cuenta
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
            Registrate para acceder a la plataforma
          </Text>

          <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
            Tipo de usuario
          </Text>
          <SegmentedButtons
            value={role}
            onValueChange={setRole}
            buttons={[
              { value: 'empleado', label: 'Busco Empleo', icon: 'account-search' },
              { value: 'empleador', label: 'Soy Empresa', icon: 'domain' },
            ]}
            style={styles.segmented}
          />

          <View style={styles.form}>
            <TextInput
              label="Nombre completo"
              value={name}
              onChangeText={setName}
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <Text variant="bodySmall" style={{ color: password && !passwordValid ? colors.error : theme.colors.onSurfaceVariant }}>
              Min. 8 caracteres, mayuscula, minuscula, numero y caracter especial (@$!%*?&#)
            </Text>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
            >
              Crear Cuenta
            </Button>
          </View>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              ¿Ya tenes cuenta?
            </Text>
            <Button mode="text" onPress={() => router.back()}>
              Iniciar Sesion
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontWeight: '700' },
  segmented: { marginBottom: 16 },
  form: { gap: 12 },
  input: { backgroundColor: 'transparent' },
  inputOutline: { borderRadius: 12 },
  button: { marginTop: 8, borderRadius: 12 },
  buttonContent: { height: 50 },
  footer: { alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 4 },
});
