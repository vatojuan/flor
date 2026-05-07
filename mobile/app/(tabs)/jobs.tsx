import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, Chip, Button, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getJobs, getEmployerJobs, getMyApplications, applyToJob, cancelApplication, deleteJob } from '../../services/jobs';
import JobCard from '../../components/JobCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../theme/colors';

export default function JobsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const isEmpleador = user?.role === 'empleador' || user?.role === 'admin';

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [rubroFilter, setRubroFilter] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [dialog, setDialog] = useState<{ visible: boolean; type: string; id?: number }>({ visible: false, type: '' });

  const fetchData = useCallback(async () => {
    try {
      if (isEmpleador && user) {
        const res = await getEmployerJobs(user.id);
        setJobs(res.offers || res.jobs || []);
      } else {
        const [jobsRes, appsRes] = await Promise.all([getJobs(), getMyApplications()]);
        setJobs(jobsRes.offers || []);
        setApplications(appsRes.applications || []);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isEmpleador]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rubros = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.rubro).filter(Boolean));
    return Array.from(set);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (search) result = result.filter((j) => j.title?.toLowerCase().includes(search.toLowerCase()));
    if (rubroFilter) result = result.filter((j) => j.rubro === rubroFilter);
    // Sort: featured first, then newest
    result.sort((a, b) => {
      if (a.is_paid && !b.is_paid) return -1;
      if (!a.is_paid && b.is_paid) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [jobs, search, rubroFilter]);

  const appliedJobIds = useMemo(() => new Set(applications.map((a: any) => a.job?.id)), [applications]);

  const handleApply = async (jobId: number) => {
    try {
      await applyToJob(jobId);
      setSnackbar({ visible: true, message: 'Postulacion enviada' });
      fetchData();
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
  };

  const handleDialogConfirm = async () => {
    if (!dialog.id) return;
    try {
      if (dialog.type === 'cancel') await cancelApplication(dialog.id);
      else if (dialog.type === 'delete') await deleteJob(dialog.id);
      setDialog({ visible: false, type: '' });
      fetchData();
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
  };

  const renderJobActions = (job: any) => {
    if (isEmpleador) {
      return (
        <>
          <Button compact onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}>
            Ver
          </Button>
          <Button compact textColor={colors.error} onPress={() => setDialog({ visible: true, type: 'delete', id: job.id })}>
            Eliminar
          </Button>
        </>
      );
    }

    const applied = appliedJobIds.has(job.id);
    const appId = applications.find((a: any) => a.job?.id === job.id)?.id;

    return (
      <>
        <Button compact onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}>
          Ver
        </Button>
        {applied ? (
          <Button compact textColor={colors.error} onPress={() => setDialog({ visible: true, type: 'cancel', id: appId })}>
            Cancelar
          </Button>
        ) : (
          <Button compact mode="contained-tonal" onPress={() => handleApply(job.id)}>
            Postularme
          </Button>
        )}
      </>
    );
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Buscar por titulo..."
        value={search}
        onChangeText={setSearch}
        style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
        inputStyle={{ fontSize: 14 }}
      />

      {rubros.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...rubros]}
          keyExtractor={(item) => item || 'all'}
          contentContainerStyle={styles.chipList}
          renderItem={({ item }) => (
            <Chip
              selected={item === rubroFilter}
              onPress={() => setRubroFilter(item === rubroFilter ? null : item)}
              style={styles.chip}
              compact
            >
              {item || 'Todos'}
            </Chip>
          )}
        />
      )}

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => router.push({ pathname: '/job/[id]', params: { id: item.id } })}
            actions={renderJobActions(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[colors.primary]} />}
        contentContainerStyle={filteredJobs.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-off-outline"
            title="No hay ofertas"
            description={search ? 'Intenta con otra busqueda' : 'No hay ofertas disponibles en este momento'}
          />
        }
      />

      <ConfirmDialog
        visible={dialog.visible}
        title={dialog.type === 'delete' ? 'Eliminar Oferta' : 'Cancelar Postulacion'}
        message={dialog.type === 'delete' ? '¿Seguro que deseas eliminar esta oferta?' : '¿Deseas cancelar tu postulacion?'}
        onConfirm={handleDialogConfirm}
        onCancel={() => setDialog({ visible: false, type: '' })}
        severity={dialog.type === 'delete' ? 'error' : 'warning'}
      />

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchbar: { margin: 16, marginBottom: 8, borderRadius: 12, elevation: 1 },
  chipList: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  chip: { marginRight: 4 },
  list: { paddingBottom: 16 },
  emptyList: { flex: 1 },
});
