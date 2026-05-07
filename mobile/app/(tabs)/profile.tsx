import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, ActivityIndicator, Switch, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import {
  getEmployeeProfile, updateEmployeeProfile, uploadProfilePicture,
  getEmployerProfile, updateEmployerProfile, toggleActive,
} from '../../services/profile';
import ProfileImage from '../../components/ProfileImage';
import { colors } from '../../theme/colors';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const isEmpleador = user?.role === 'empleador' || user?.role === 'admin';

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isActive, setIsActive] = useState(true);
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
          <TextInput
            label="Nombre"
            value={name}
            onChangeText={setName}
            mode="outlined"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
            outlineStyle={styles.inputOutline}
          />

          {isEmpleador && (
            <TextInput
              label="Nombre de empresa"
              value={companyName}
              onChangeText={setCompanyName}
              mode="outlined"
              left={<TextInput.Icon icon="domain" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          )}

          <TextInput
            label="Telefono"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
            style={styles.input}
            outlineStyle={styles.inputOutline}
          />

          <TextInput
            label="Descripcion"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            maxLength={3000}
            left={<TextInput.Icon icon="text" />}
            style={styles.input}
            outlineStyle={styles.inputOutline}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'right' }}>
            {description.length}/3000
          </Text>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={{ height: 48 }}
            labelStyle={{ fontWeight: '600' }}
          >
            Guardar Cambios
          </Button>

          <Divider style={{ marginVertical: 16 }} />

          {/* Documents button */}
          <Button
            mode="outlined"
            icon="file-document-multiple"
            onPress={() => router.push('/documents')}
            style={styles.docsButton}
            contentStyle={{ height: 48 }}
          >
            Mis Documentos
          </Button>

          {/* Active toggle (employee only) */}
          {!isEmpleador && (
            <View style={[styles.toggleRow, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                  Recibir ofertas por email
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isActive ? 'Tu perfil esta activo' : 'Tu perfil esta pausado'}
                </Text>
              </View>
              <Switch value={isActive} onValueChange={handleToggleActive} color={colors.primary} />
            </View>
          )}
        </View>
      </ScrollView>

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
  docsButton: { borderRadius: 12, borderColor: colors.primary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
});
