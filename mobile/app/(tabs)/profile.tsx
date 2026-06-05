import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, ActivityIndicator, Switch, Divider, List } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useColorMode } from '../../hooks/useColorMode';
import {
  getEmployeeProfile, updateEmployeeProfile, uploadProfilePicture,
  getEmployerProfile, updateEmployerProfile, toggleActive,
} from '../../services/profile';
import { deleteAccount } from '../../services/auth';
import ProfileImage from '../../components/ProfileImage';
import ConfirmDialog from '../../components/ConfirmDialog';
import { colors } from '../../theme/colors';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const isEmpleador = user?.role === 'empleador' || user?.role === 'admin';

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const { colorMode, toggleColorMode } = useColorMode();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const data = isEmpleador ? await getEmployerProfile() : await getEmployeeProfile();
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setDescription(data.description || '');
      setCompanyName(data.companyName || '');
      setImageUrl(data.profilePicture || null);
      if (data.active !== undefined) setIsActive(data.active);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEmpleador]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEmpleador) {
        await updateEmployerProfile({ name, phone, description, companyName });
      } else {
        await updateEmployeeProfile({ name, phone, description });
      }
      setSnackbar({ visible: true, message: 'Perfil actualizado' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelected = async (uri: string) => {
    setImageUrl(uri);
    try {
      await uploadProfilePicture(uri, isEmpleador ? 'employer' : 'employee');
      setSnackbar({ visible: true, message: 'Foto actualizada' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await toggleActive();
      setIsActive(res.active);
      setSnackbar({ visible: true, message: res.active ? 'Perfil activado' : 'Perfil pausado' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
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

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} colors={[colors.primary]} />}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileImage imageUrl={imageUrl} onImageSelected={handleImageSelected} size={110} />

        <View style={styles.form}>
          <TextInput label="Nombre" value={name} onChangeText={setName} mode="outlined"
            left={<TextInput.Icon icon="account-outline" />} style={styles.input} outlineStyle={styles.inputOutline} />

          {isEmpleador && (
            <TextInput label="Nombre de empresa" value={companyName} onChangeText={setCompanyName} mode="outlined"
              left={<TextInput.Icon icon="domain" />} style={styles.input} outlineStyle={styles.inputOutline} />
          )}

          <TextInput label="Telefono" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />} style={styles.input} outlineStyle={styles.inputOutline} />

          <TextInput label="Descripcion" value={description} onChangeText={setDescription} mode="outlined"
            multiline numberOfLines={4} maxLength={3000} left={<TextInput.Icon icon="text" />}
            style={styles.input} outlineStyle={styles.inputOutline} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'right' }}>
            {description.length}/3000
          </Text>

          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}
            style={styles.saveButton} contentStyle={{ height: 48 }} labelStyle={{ fontWeight: '600' }}>
            Guardar Cambios
          </Button>

          <Divider style={{ marginVertical: 16 }} />

          {/* Documents */}
          <Button mode="outlined" icon="file-document-multiple" onPress={() => router.push('/documents')}
            style={styles.outlinedButton} contentStyle={{ height: 48 }}>
            Mis Documentos
          </Button>

          {/* Active toggle (employee only) */}
          {!isEmpleador && (
            <View style={[styles.toggleRow, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '500' }}>Recibir ofertas por email</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isActive ? 'Tu perfil esta activo' : 'Tu perfil esta pausado'}
                </Text>
              </View>
              <Switch value={isActive} onValueChange={handleToggleActive} color={colors.primary} />
            </View>
          )}

          <Divider style={{ marginVertical: 16 }} />

          {/* Settings section */}
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Ajustes
          </Text>

          <List.Item
            title="Modo Oscuro"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value={colorMode === 'dark'} onValueChange={toggleColorMode} color={colors.primary} />}
            style={[styles.listItem, { backgroundColor: theme.colors.surface }]}
          />

          <List.Item
            title="Cerrar Sesion"
            titleStyle={{ color: colors.primary }}
            left={(props) => <List.Icon {...props} icon="logout" color={colors.primary} />}
            onPress={handleLogout}
            style={[styles.listItem, { backgroundColor: theme.colors.surface }]}
          />

          <Divider style={{ marginVertical: 16 }} />

          <Button mode="outlined" textColor={colors.error} icon="delete-forever"
            onPress={() => setDeleteDialog(true)} style={{ borderColor: colors.error, borderRadius: 12 }}>
            Eliminar Cuenta
          </Button>

          <Text variant="bodySmall" style={styles.version}>FAP Mendoza v1.0.0</Text>
        </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  form: { marginTop: 24, gap: 12 },
  input: { backgroundColor: 'transparent' },
  inputOutline: { borderRadius: 12 },
  saveButton: { borderRadius: 12, marginTop: 8 },
  outlinedButton: { borderRadius: 12, borderColor: colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 8 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  listItem: { borderRadius: 12, marginBottom: 4 },
  version: { textAlign: 'center', marginTop: 24, color: colors.grey[500] },
});
