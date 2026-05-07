import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, ActivityIndicator, Chip, List, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import { getEmployerJobs } from '../services/jobs';
import CandidateCard from '../components/CandidateCard';
import EmptyState from '../components/EmptyState';
import { colors } from '../theme/colors';

export default function ApplicationsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getEmployerJobs(user.id);
      setJobs((res.offers || res.jobs || []).filter((j: any) => j.candidatesCount > 0 || j.applicants?.length > 0));
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={jobs.length === 0 ? styles.emptyContent : styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[colors.primary]} />}
    >
      {jobs.length === 0 ? (
        <EmptyState
          icon="account-group-outline"
          title="Sin postulaciones"
          description="Aun no hay candidatos postulados a tus ofertas"
        />
      ) : (
        jobs.map((job: any) => (
          <View key={job.id} style={styles.jobSection}>
            <View style={styles.jobHeader}>
              <Text variant="titleMedium" style={{ fontWeight: '600', flex: 1 }}>
                {job.title}
              </Text>
              <View style={styles.badges}>
                {job.is_paid && (
                  <Chip compact style={{ backgroundColor: colors.featured }} textStyle={{ fontSize: 10, color: '#000' }}>
                    Destacada
                  </Chip>
                )}
                <Chip compact icon="account-group">
                  {job.candidatesCount || job.applicants?.length || 0}
                </Chip>
              </View>
            </View>
            {job.rubro && (
              <Chip compact style={[styles.rubroChip, { backgroundColor: colors.secondary }]} textStyle={{ color: colors.white, fontSize: 10 }}>
                {job.rubro}
              </Chip>
            )}

            <View style={styles.candidatesList}>
              {(job.applicants || []).map((candidate: any) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onViewProfile={() => router.push({ pathname: '/candidate/[id]', params: { id: candidate.id } })}
                  onViewCV={candidate.cvUrl ? () => Linking.openURL(candidate.cvUrl) : undefined}
                />
              ))}
            </View>
            <Divider style={{ marginTop: 8 }} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  emptyContent: { flex: 1 },
  jobSection: { marginBottom: 16 },
  jobHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  badges: { flexDirection: 'row', gap: 4 },
  rubroChip: { alignSelf: 'flex-start', marginBottom: 8 },
  candidatesList: { gap: 6, marginTop: 8 },
});
