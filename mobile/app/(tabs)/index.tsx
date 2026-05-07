import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Avatar, Chip, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getMyApplications, getEmployerJobs, cancelApplication } from '../../services/jobs';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme/colors';

export default function DashboardScreen() {
  const theme = useTheme();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isEmpleador = user?.role === 'empleador' || user?.role === 'admin';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ visible: boolean; id?: number }>({ visible: false });

  const fetchData = useCallback(async () => {
    try {
      if (isEmpleador && user) {
        const res = await getEmployerJobs(user.id);
        setData(res);
      } else {
        const res = await getMyApplications();
        setData(res);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isEmpleador]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    if (user) fetchData();
  }, [user, authLoading, isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCancel = async () => {
    if (!cancelDialog.id) return;
    try {
      await cancelApplication(cancelDialog.id);
      setCancelDialog({ visible: false });
      fetchData();
    } catch {}
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const offers = data?.offers || data?.jobs || [];
  const applications = data?.applications || [];

  // Employer metrics
  const activeCount = offers.length;
  const totalCandidates = offers.reduce((sum: number, j: any) => sum + (j.candidatesCount || 0), 0);
  const featuredCount = offers.filter((j: any) => j.is_paid).length;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Welcome header */}
      <View style={[styles.welcomeCard, { backgroundColor: colors.secondary }]}>
        <Avatar.Icon size={56} icon="account" style={{ backgroundColor: colors.primary }} />
        <View style={styles.welcomeText}>
          <Text variant="titleLarge" style={{ color: colors.white, fontWeight: '700' }}>
            Hola, {user?.name?.split(' ')[0]}
          </Text>
          <Chip
            compact
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start' }}
            textStyle={{ color: colors.white, fontSize: 11 }}
          >
            {isEmpleador ? 'Empresa' : 'Candidato'}
          </Chip>
        </View>
      </View>

      {isEmpleador ? (
        /* ========= EMPLOYER DASHBOARD ========= */
        <>
          {/* Metrics */}
          <View style={styles.metricsRow}>
            <MetricCard label="Ofertas Activas" value={activeCount} icon="briefcase" theme={theme} />
            <MetricCard label="Postulaciones" value={totalCandidates} icon="account-group" theme={theme} />
            <MetricCard label="Destacadas" value={featuredCount} icon="star" theme={theme} />
          </View>

          {/* Quick actions */}
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Acciones Rapidas
          </Text>
          <View style={styles.actionsGrid}>
            <ActionCard icon="plus-circle" label="Publicar Oferta" onPress={() => router.push('/job/create')} theme={theme} />
            <ActionCard icon="format-list-bulleted" label="Mis Ofertas" onPress={() => router.push('/(tabs)/jobs')} theme={theme} />
            <ActionCard icon="account-multiple" label="Postulaciones" onPress={() => router.push('/applications')} theme={theme} />
            <ActionCard icon="account-edit" label="Mi Perfil" onPress={() => router.push('/(tabs)/profile')} theme={theme} />
          </View>
        </>
      ) : (
        /* ========= EMPLOYEE DASHBOARD ========= */
        <>
          {/* Quick actions */}
          <View style={styles.quickButtons}>
            <Button
              mode="contained"
              icon="magnify"
              onPress={() => router.push('/(tabs)/jobs')}
              style={styles.quickButton}
              contentStyle={{ height: 48 }}
            >
              Ver Ofertas
            </Button>
            <Button
              mode="outlined"
              icon="account-edit"
              onPress={() => router.push('/(tabs)/profile')}
              style={[styles.quickButton, { borderColor: colors.primary }]}
              contentStyle={{ height: 48 }}
            >
              Mi Perfil
            </Button>
          </View>

          {/* My applications */}
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Mis Postulaciones
          </Text>

          {applications.length === 0 ? (
            <EmptyState
              icon="briefcase-off-outline"
              title="Sin postulaciones"
              description="Explora ofertas de empleo y postulate"
              actionLabel="Ver Ofertas"
              onAction={() => router.push('/(tabs)/jobs')}
            />
          ) : (
            applications.map((app: any) => (
              <Card key={app.id} style={[styles.appCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
                <Card.Content>
                  <Text variant="titleSmall" style={{ fontWeight: '600' }}>{app.job?.title}</Text>
                  <View style={styles.appMeta}>
                    <Chip compact style={{ alignSelf: 'flex-start' }}>
                      {app.label === 'automatic' ? 'Automatica' : 'Manual'}
                    </Chip>
                    <Chip compact icon="clock-outline" style={{ alignSelf: 'flex-start' }}>
                      {app.status || 'Pendiente'}
                    </Chip>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => router.push({ pathname: '/job/[id]', params: { id: app.job?.id } })}>
                    Ver Detalle
                  </Button>
                  <Button textColor={colors.error} onPress={() => setCancelDialog({ visible: true, id: app.id })}>
                    Cancelar
                  </Button>
                </Card.Actions>
              </Card>
            ))
          )}
        </>
      )}

      <ConfirmDialog
        visible={cancelDialog.visible}
        title="Cancelar Postulacion"
        message="¿Deseas cancelar tu postulacion a este empleo?"
        onConfirm={handleCancel}
        onCancel={() => setCancelDialog({ visible: false })}
        severity="warning"
      />
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, theme }: { label: string; value: number; icon: string; theme: any }) {
  return (
    <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
      <Card.Content style={styles.metricContent}>
        <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
        <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
          {value}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

function ActionCard({ icon, label, onPress, theme }: { icon: string; label: string; onPress: () => void; theme: any }) {
  return (
    <Card style={[styles.actionCard, { backgroundColor: theme.colors.surface }]} mode="elevated" onPress={onPress}>
      <Card.Content style={styles.actionContent}>
        <MaterialCommunityIcons name={icon as any} size={28} color={colors.primary} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, textAlign: 'center', fontWeight: '500' }}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    gap: 16,
  },
  welcomeText: { flex: 1, gap: 6 },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  metricCard: { flex: 1, borderRadius: 12 },
  metricContent: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', borderRadius: 12 },
  actionContent: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  quickButtons: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickButton: { flex: 1, borderRadius: 12 },
  appCard: { marginBottom: 8, borderRadius: 12 },
  appMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
