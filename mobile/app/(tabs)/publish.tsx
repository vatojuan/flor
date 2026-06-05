import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, RadioButton, Card, Divider, Chip, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../hooks/useAuth';
import { createJob, createPaymentPreference } from '../../services/jobs';
import { FAST_API, apiFetch } from '../../services/api';
import { colors } from '../../theme/colors';

const EXPIRATION_OPTIONS = [
  { label: '24h', value: '24h' },
  { label: '3 dias', value: '3d' },
  { label: '7 dias', value: '7d' },
  { label: '15 dias', value: '15d' },
  { label: '1 mes', value: '1m' },
];

const CONTRACT_TYPES = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Contrato', value: 'contrato' },
  { label: 'Temporal', value: 'temporal' },
  { label: 'Ocasional', value: 'ocasional' },
  { label: 'Freelance', value: 'freelance' },
];

const MODALITY_OPTIONS = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
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

export default function PublishScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [contractType, setContractType] = useState('efectivo');
  const [modality, setModality] = useState('presencial');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryVisible, setSalaryVisible] = useState(true);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expiration, setExpiration] = useState('7d');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const addBenefit = () => {
    const val = benefitInput.trim();
    if (val && !benefits.includes(val)) { setBenefits([...benefits, val]); setBenefitInput(''); }
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (val && !tags.includes(val)) { setTags([...tags, val]); setTagInput(''); }
  };

  const generateTags = async () => {
    if (!title || !description) return;
    setGeneratingTags(true);
    try {
      const res = await apiFetch(`${FAST_API}/api/job/generate-tags`, {
        method: 'POST', body: JSON.stringify({ title, description }), auth: false,
      });
      if (res.ok) { const data = await res.json(); if (data.tags) setTags(data.tags); }
    } catch {} finally { setGeneratingTags(false); }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setRequirements('');
    setContractType('efectivo'); setModality('presencial'); setLocation('');
    setSalaryMin(''); setSalaryMax(''); setSalaryVisible(true);
    setBenefits([]); setTags([]); setExpiration('7d'); setPlan('free');
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      setSnackbar({ visible: true, message: 'Titulo y descripcion son obligatorios' });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const body: any = {
        title: title.trim(), description: description.trim(),
        requirements: requirements.trim() || undefined, userId: user.id,
        expirationDate: calcExpirationDate(expiration),
        contract_type: contractType, modality,
        location: location.trim() || undefined,
        salary_min: salaryMin ? Number(salaryMin) : undefined,
        salary_max: salaryMax ? Number(salaryMax) : undefined,
        salary_visible: salaryVisible,
        benefits: benefits.length > 0 ? benefits : undefined,
        tags: tags.length > 0 ? tags : undefined,
      };
      const res = await createJob(body);
      if (plan === 'featured' && (res.job?.id || res.jobId || res.id)) {
        const jobId = res.job?.id || res.jobId || res.id;
        const payRes = await createPaymentPreference(jobId, title);
        if (payRes.init_point) await WebBrowser.openBrowserAsync(payRes.init_point);
      }
      setSnackbar({ visible: true, message: 'Oferta creada exitosamente' });
      resetForm();
      setTimeout(() => router.push('/(tabs)/jobs'), 1500);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text variant="titleMedium" style={styles.section}>Datos del puesto</Text>
        <TextInput label="Titulo *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} outlineStyle={styles.outline} />
        <TextInput label="Descripcion *" value={description} onChangeText={setDescription} mode="outlined" multiline numberOfLines={4} style={styles.input} outlineStyle={styles.outline} />
        <TextInput label="Requisitos (opcional)" value={requirements} onChangeText={setRequirements} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineStyle={styles.outline} />

        <Divider style={styles.divider} />
        <Text variant="titleMedium" style={styles.section}>Detalles</Text>

        <Text variant="labelLarge" style={styles.label}>Tipo de contrato</Text>
        <View style={styles.chipRow}>
          {CONTRACT_TYPES.map((ct) => (
            <Chip key={ct.value} selected={contractType === ct.value} onPress={() => setContractType(ct.value)} showSelectedCheck compact>{ct.label}</Chip>
          ))}
        </View>

        <Text variant="labelLarge" style={[styles.label, { marginTop: 12 }]}>Modalidad</Text>
        <SegmentedButtons value={modality} onValueChange={setModality} buttons={MODALITY_OPTIONS} style={{ marginBottom: 12 }} />

        <TextInput label="Ubicacion (ej: Godoy Cruz, Mendoza)" value={location} onChangeText={setLocation} mode="outlined"
          left={<TextInput.Icon icon="map-marker" />} style={styles.input} outlineStyle={styles.outline} />

        <View style={styles.salaryRow}>
          <TextInput label="Sueldo min" value={salaryMin} onChangeText={setSalaryMin} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} outlineStyle={styles.outline} />
          <TextInput label="Sueldo max" value={salaryMax} onChangeText={setSalaryMax} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} outlineStyle={styles.outline} />
        </View>

        <Chip icon={salaryVisible ? 'eye' : 'eye-off'} onPress={() => setSalaryVisible(!salaryVisible)} selected={!salaryVisible} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
          {salaryVisible ? 'Sueldo visible' : 'A convenir (oculto)'}
        </Chip>

        <Divider style={styles.divider} />
        <Text variant="titleMedium" style={styles.section}>Presentacion</Text>

        <Text variant="labelLarge" style={styles.label}>Beneficios</Text>
        <View style={styles.addRow}>
          <TextInput label="Agregar beneficio" value={benefitInput} onChangeText={setBenefitInput} mode="outlined"
            style={[styles.input, { flex: 1 }]} outlineStyle={styles.outline} onSubmitEditing={addBenefit} />
          <Button mode="contained-tonal" onPress={addBenefit} compact style={{ alignSelf: 'center' }}>+</Button>
        </View>
        {benefits.length > 0 && (
          <View style={styles.chipRow}>
            {benefits.map((b, i) => (
              <Chip key={i} onClose={() => setBenefits(benefits.filter((_, j) => j !== i))} compact style={styles.benefitChip} textStyle={{ color: colors.success }}>{b}</Chip>
            ))}
          </View>
        )}

        <Text variant="labelLarge" style={[styles.label, { marginTop: 12 }]}>Tags</Text>
        <View style={styles.addRow}>
          <TextInput label="Agregar tag" value={tagInput} onChangeText={setTagInput} mode="outlined"
            style={[styles.input, { flex: 1 }]} outlineStyle={styles.outline} onSubmitEditing={addTag} />
          <Button mode="contained-tonal" onPress={addTag} compact style={{ alignSelf: 'center' }}>+</Button>
        </View>
        {title && description && (
          <Button mode="text" icon="auto-fix" onPress={generateTags} loading={generatingTags} disabled={generatingTags} compact style={{ alignSelf: 'flex-start' }}>
            Auto-generar tags
          </Button>
        )}
        {tags.length > 0 && (
          <View style={styles.chipRow}>
            {tags.map((t, i) => (
              <Chip key={i} onClose={() => setTags(tags.filter((_, j) => j !== i))} compact style={styles.tagChip}>#{t}</Chip>
            ))}
          </View>
        )}

        <Divider style={styles.divider} />
        <Text variant="titleMedium" style={styles.section}>Publicacion</Text>

        <Text variant="labelLarge" style={styles.label}>Duracion</Text>
        <View style={styles.chipRow}>
          {EXPIRATION_OPTIONS.map((opt) => (
            <Chip key={opt.value} selected={expiration === opt.value} onPress={() => setExpiration(opt.value)} showSelectedCheck compact>{opt.label}</Chip>
          ))}
        </View>

        <Text variant="labelLarge" style={[styles.label, { marginTop: 16 }]}>Plan</Text>
        <RadioButton.Group onValueChange={setPlan} value={plan}>
          <Card style={[styles.planCard, { backgroundColor: theme.colors.surface }, plan === 'free' && { borderColor: colors.primary, borderWidth: 2 }]} onPress={() => setPlan('free')}>
            <Card.Content style={styles.planContent}>
              <RadioButton value="free" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>Gratuito</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Aparece en la lista general</Text>
              </View>
            </Card.Content>
          </Card>
          <Card style={[styles.planCard, { backgroundColor: theme.colors.surface }, plan === 'featured' && { borderColor: colors.featured, borderWidth: 2 }]} onPress={() => setPlan('featured')}>
            <Card.Content style={styles.planContent}>
              <RadioButton value="featured" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>Destacada - $15.000</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Primero en lista + email a candidatos</Text>
              </View>
            </Card.Content>
          </Card>
        </RadioButton.Group>

        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.createButton} contentStyle={{ height: 50 }} labelStyle={{ fontSize: 16, fontWeight: '600' }} icon="plus-circle">
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
  section: { fontWeight: '600', marginBottom: 12 },
  label: { marginBottom: 6 },
  input: { backgroundColor: 'transparent', marginBottom: 8 },
  outline: { borderRadius: 12 },
  divider: { marginVertical: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  salaryRow: { flexDirection: 'row', gap: 8 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  benefitChip: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.success },
  tagChip: { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
  planCard: { marginBottom: 10, borderRadius: 12 },
  planContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createButton: { borderRadius: 12, marginTop: 20 },
});
