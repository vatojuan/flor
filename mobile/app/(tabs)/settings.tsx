import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Text, useTheme, Switch, Divider, Snackbar, Button } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { changePassword, deleteAccount } from '../../services/auth';
import ConfirmDialog from '../../components/ConfirmDialog';
import { colors } from '../../theme/colors';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(theme.dark);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleToggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('colorMode', value ? 'dark' : 'light');
    // Theme will update on next render cycle through root layout
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteDialog(false);
      await logout();
      router.replace('/(auth)/login');
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Cuenta</List.Subheader>
        <List.Item
          title={user?.name || 'Usuario'}
          description={user?.role === 'empleador' ? 'Empresa' : 'Candidato'}
          left={(props) => <List.Icon {...props} icon="account-circle" color={colors.primary} />}
          style={[styles.item, { backgroundColor: theme.colors.surface }]}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Apariencia</List.Subheader>
        <List.Item
          title="Modo Oscuro"
          description="Cambiar tema de la aplicacion"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => <Switch value={darkMode} onValueChange={handleToggleDarkMode} color={colors.primary} />}
          style={[styles.item, { backgroundColor: theme.colors.surface }]}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Seguridad</List.Subheader>
        <List.Item
          title="Cambiar Contraseña"
          left={(props) => <List.Icon {...props} icon="lock-reset" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Change password modal */}}
          style={[styles.item, { backgroundColor: theme.colors.surface }]}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Sesion</List.Subheader>
        <List.Item
          title="Cerrar Sesion"
          titleStyle={{ color: colors.primary }}
          left={(props) => <List.Icon {...props} icon="logout" color={colors.primary} />}
          onPress={handleLogout}
          style={[styles.item, { backgroundColor: theme.colors.surface }]}
        />
      </List.Section>

      <Divider style={{ marginVertical: 16 }} />

      <View style={styles.dangerZone}>
        <Text variant="labelLarge" style={{ color: colors.error, marginBottom: 8 }}>
          Zona de Peligro
        </Text>
        <Button
          mode="outlined"
          textColor={colors.error}
          icon="delete-forever"
          onPress={() => setDeleteDialog(true)}
          style={{ borderColor: colors.error, borderRadius: 12 }}
        >
          Eliminar Cuenta
        </Button>
      </View>

      <Text variant="bodySmall" style={styles.version}>
        FAP Mendoza v1.0.0
      </Text>

      <ConfirmDialog
        visible={deleteDialog}
        title="Eliminar Cuenta"
        message="Esta accion es irreversible. ¿Estas seguro que deseas eliminar tu cuenta y todos tus datos?"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteDialog(false)}
        confirmText="Eliminar"
        severity="error"
        loading={deleting}
      />

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  item: { borderRadius: 0 },
  dangerZone: { paddingHorizontal: 16 },
  version: {
    textAlign: 'center',
    marginTop: 32,
    color: colors.grey[500],
  },
});
