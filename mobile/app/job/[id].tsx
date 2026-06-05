import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Chip, useTheme, ActivityIndicator, Snackbar, Divider } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getJobById, applyToJob } from '../../services/jobs';
import { colors } from '../../theme/colors';

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatSalary(min?: number, max?: number, visible?: boolean) {
  if (visible === false) return 'A convenir';
  if (!min && !max) return null;
  const fmt = (n: number) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  if (min && max) return `$${fmt(min)} - $${fmt(max)}/mes`;
  if (min) return `Desde $${fmt(min)}/mes`;
  return `Hasta $${fmt(max!)}/mes`;
}

const contractLabels: Record<string, string> = {
  ocasional: 'Ocasional', temporal: 'Temporal', contrato: 'Contrato',
  efectivo: 'Efectivo', freelance: 'Freelance',
};
const modalityLabels: Record<string, string> = {
  presencial: 'Presencial', remoto: 'Remoto', hibrido: 'Híbrido',
};

export default function JobDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isEmpleado = user?.role === 'empleado';

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    if (id) {
      getJobById(id)
        .then((res) => setJob(res.job || res))
        .catch(() => setSnackbar({ visible: true, message: 'Error al cargar oferta' }))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyToJob(job.id);
      setSnackbar({ visible: true, message: 'Postulacion enviada exitosamente' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  if (!job) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><Text>Oferta no encontrada</Text></View>;
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_visible);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {job.banner_url && (
          <Image source={{ uri: job.banner_url }} style={styles.banner} />
        )}

        {(job.is_paid || job.isPaid) && (
          <Chip icon="star" style={styles.featuredChip} textStyle={{ color: '#000', fontWeight: '600' }}>
            Oferta Destacada
          </Chip>
        )}

        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          {job.title}
        </Text>

        {/* Chips row */}
        <View style={styles.chipRow}>
          {job.rubro && (
            <Chip compact style={{ backgroundColor: colors.secondary }} textStyle={{ color: colors.white }}>
              {job.rubro}
            </Chip>
          )}
          {job.contract_type && (
            <Chip compact icon="file-document-outline">
              {contractLabels[job.contract_type] || job.contract_type}
            </Chip>
          )}
          {job.modality && (
            <Chip compact icon="office-building">
              {modalityLabels[job.modality] || job.modality}
            </Chip>
          )}
        </View>

        {/* Meta section */}
        <View style={styles.metaSection}>
          {job.location && (
            <MetaRow icon="map-marker" text={job.location} color={theme.colors.onSurfaceVariant} />
          )}
          {salary && (
            <MetaRow icon="currency-usd" text={salary} color={colors.success} />
          )}
          <MetaRow icon="calendar" text={`Publicado: ${formatDate(job.createdAt)}`} color={theme.colors.onSurfaceVariant} />
          {job.expirationDate && (
            <MetaRow icon="clock-alert-outline" text={`Expira: ${formatDate(job.expirationDate)}`} color={colors.error} />
          )}
          <MetaRow icon="account-group" text={`${job.candidatesCount ?? 0} candidatos postulados`} color={theme.colors.onSurfaceVariant} />
        </View>

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <>
            <Divider style={{ marginVertical: 12 }} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Beneficios</Text>
            <View style={styles.chipRow}>
              {job.benefits.map((b: string, i: number) => (
                <Chip key={i} icon="check-circle-outline" compact style={styles.benefitChip} textStyle={{ color: colors.success }}>
                  {b}
                </Chip>
              ))}
            </View>
          </>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <View style={[styles.chipRow, { marginTop: 8 }]}>
            {job.tags.map((tag: string, i: number) => (
              <Chip key={i} compact style={styles.tagChip} textStyle={{ fontSize: 11 }}>
                #{tag}
              </Chip>
            ))}
          </View>
        )}

        <Divider style={{ marginVertical: 16 }} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Descripcion</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
          {job.description}
        </Text>

        {job.requirements && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 20 }]}>Requisitos</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              {job.requirements}
            </Text>
          </>
        )}
      </ScrollView>

      {isEmpleado && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
          <Button mode="contained" onPress={handleApply} loading={applying} disabled={applying}
            style={styles.applyButton} contentStyle={{ height: 50 }} labelStyle={{ fontSize: 16, fontWeight: '600' }} icon="send">
            Postularme
          </Button>
        </View>
      )}

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

function MetaRow({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={styles.metaRow}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      <Text variant="bodyMedium" style={{ color, marginLeft: 8 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  banner: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  title: { fontWeight: '700', marginBottom: 8 },
  featuredChip: { backgroundColor: colors.featured, alignSelf: 'flex-start', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaSection: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontWeight: '600', marginBottom: 8, color: undefined },
  benefitChip: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.success },
  tagChip: { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 0.5 },
  applyButton: { borderRadius: 12 },
});
