import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, RadioButton, Card, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../hooks/useAuth';
import { createJob, createPaymentPreference } from '../../services/jobs';
import { colors } from '../../theme/colors';

const EXPIRATION_OPTIONS = [
  { label: '24 horas', value: '24h' },
  { label: '3 dias', value: '3d' },
  { label: '7 dias', value: '7d' },
  { label: '15 dias', value: '15d' },
  { label: '1 mes', value: '1m' },
];

function calcExpirationDate(option: string): string {
  const now = new Date();
  switch (option) {
    case '24h': now.setHours(now.getHours() + 24); break;
    case '3d': now.setDate(now.getDate() + 3); break;
    case '7d': now.setDate(now.getDate() + 7); break;
    case '15d': now.setDate(now.getDate() + 15); break;
    case '1m': now.setMonth(now.getMonth() + 1); break;
  }
  return now.toISOString();
}

export default function JobCreateScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [expiration, setExpiration] = useState('7d');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      setSnackbar({ visible: true, message: 'Titulo y descripcion son obligatorios' });
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const expirationDate = calcExpirationDate(expiration);
      const res = await createJob({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || undefined,
        userId: user.id,
        expirationDate,
      });

      if (plan === 'featured' && res.job?.id) {
        const payRes = await createPaymentPreference(res.job.id, title);
        if (payRes.init_point) {
          await WebBrowser.openBrowserAsync(payRes.init_point);
        }
      }

      setSnackbar({ visible: true, message: 'Oferta creada exitosamente' });
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          label="Titulo de la oferta"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />

        <TextInput
          label="Descripcion"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={5}
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />

        <TextInput
          label="Requisitos (opcional)"
          value={requirements}
          onChangeText={setRequirements}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />

        <Divider style={{ marginVertical: 16 }} />

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Duracion
        </Text>
        <RadioButton.Group onValueChange={setExpiration} value={expiration}>
          <View style={styles.radioGroup}>
            {EXPIRATION_OPTIONS.map((opt) => (
              <RadioButton.Item key={opt.value} label={opt.label} value={opt.value} style={styles.radioItem} />
            ))}
          </View>
        </RadioButton.Group>

        <Divider style={{ marginVertical: 16 }} />

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Plan
        </Text>
        <RadioButton.Group onValueChange={setPlan} value={plan}>
          <Card
            style={[styles.planCard, { backgroundColor: theme.colors.surface }, plan === 'free' && { borderColor: colors.primary, borderWidth: 2 }]}
            onPress={() => setPlan('free')}
          >
            <Card.Content style={styles.planContent}>
              <RadioButton value="free" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>Gratuito</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Aparece en la lista general de ofertas
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card
            style={[styles.planCard, { backgroundColor: theme.colors.surface }, plan === 'featured' && { borderColor: colors.featured, borderWidth: 2 }]}
            onPress={() => setPlan('featured')}
          >
            <Card.Content style={styles.planContent}>
              <RadioButton value="featured" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>Destacada - $15.000</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Aparece primero y se envia por email a candidatos del rubro
                </Text>
              </View>
            </Card.Content>
          </Card>
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
          contentStyle={{ height: 50 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
          icon="plus-circle"
        >
          Publicar Oferta
        </Button>
      </ScrollView>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  input: { backgroundColor: 'transparent', marginBottom: 12 },
  inputOutline: { borderRadius: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  radioGroup: {},
  radioItem: { paddingVertical: 2 },
  planCard: { marginBottom: 10, borderRadius: 12 },
  planContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createButton: { borderRadius: 12, marginTop: 20 },
});
