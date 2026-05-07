import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, useTheme, ActivityIndicator, Snackbar, Divider } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getJobById, applyToJob } from '../../services/jobs';
import { colors } from '../../theme/colors';

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

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
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text>Oferta no encontrada</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(job.is_paid || job.isPaid) && (
          <Chip icon="star" style={styles.featuredChip} textStyle={{ color: '#000', fontWeight: '600' }}>
            Oferta Destacada
          </Chip>
        )}

        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          {job.title}
        </Text>

        {job.rubro && (
          <Chip compact style={[styles.rubroChip, { backgroundColor: colors.secondary }]} textStyle={{ color: colors.white }}>
            {job.rubro}
          </Chip>
        )}

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
              Publicado: {formatDate(job.createdAt)}
            </Text>
          </View>
          {job.expirationDate && (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="clock-alert-outline" size={18} color={colors.error} />
              <Text variant="bodyMedium" style={{ color: colors.error, marginLeft: 8 }}>
                Expira: {formatDate(job.expirationDate)}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="account-group" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
              {job.candidatesCount ?? 0} candidatos postulados
            </Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 16 }} />

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Descripcion
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
          {job.description}
        </Text>

        {job.requirements && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginTop: 20 }]}>
              Requisitos
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              {job.requirements}
            </Text>
          </>
        )}
      </ScrollView>

      {isEmpleado && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
          <Button
            mode="contained"
            onPress={handleApply}
            loading={applying}
            disabled={applying}
            style={styles.applyButton}
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16, fontWeight: '600' }}
            icon="send"
          >
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontWeight: '700', marginBottom: 8 },
  featuredChip: { backgroundColor: colors.featured, alignSelf: 'flex-start', marginBottom: 12 },
  rubroChip: { alignSelf: 'flex-start', marginBottom: 12 },
  metaSection: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 0.5,
  },
  applyButton: { borderRadius: 12 },
});
