import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, useTheme, ActivityIndicator, Avatar, Divider, IconButton, TextInput, Dialog, Portal, Snackbar } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuth } from '../../hooks/useAuth';
import { getCandidateProfile } from '../../services/profile';
import { getReputationSummary, getCandidateReviews, createReview, isFavorite, addFavorite, removeFavorite } from '../../services/reputation';
import { colors } from '../../theme/colors';

export default function CandidateDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isEmpleador = user?.role === 'empleador' || user?.role === 'admin';

  const [candidate, setCandidate] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Review dialog
  const [reviewDialog, setReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const cid = Number(id);
    Promise.all([
      getCandidateProfile(cid),
      getReputationSummary(cid),
      getCandidateReviews(cid),
      isEmpleador ? isFavorite(cid) : Promise.resolve({ isFavorite: false }),
    ])
      .then(([profile, rep, revs, fav]) => {
        setCandidate(profile);
        setReputation(rep);
        setReviews(Array.isArray(revs) ? revs : []);
        setIsFav(fav.isFavorite);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isEmpleador]);

  const toggleFav = async () => {
    const cid = Number(id);
    try {
      if (isFav) { await removeFavorite(cid); setIsFav(false); }
      else { await addFavorite(cid); setIsFav(true); }
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
  };

  const submitReview = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await createReview({ candidate_id: Number(id), rating, comment: comment.trim() || undefined });
      setReviewDialog(false);
      setRating(0);
      setComment('');
      // Refresh
      const [rep, revs] = await Promise.all([getReputationSummary(Number(id)), getCandidateReviews(Number(id))]);
      setReputation(rep);
      setReviews(Array.isArray(revs) ? revs : []);
      setSnackbar({ visible: true, message: 'Reseña guardada' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }
  if (!candidate) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><Text>Candidato no encontrado</Text></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ position: 'relative' }}>
          {candidate.profilePicture ? (
            <Avatar.Image size={100} source={{ uri: candidate.profilePicture }} />
          ) : (
            <Avatar.Icon size={100} icon="account" style={{ backgroundColor: colors.primary }} />
          )}
          {reputation?.badge_verified && (
            <MaterialCommunityIcons name="check-decagram" size={28} color={colors.info}
              style={{ position: 'absolute', bottom: 0, right: -4 }} />
          )}
        </View>
        <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.onBackground }]}>
          {candidate.name}
        </Text>
        {candidate.rubro && (
          <Chip style={{ backgroundColor: colors.secondary }} textStyle={{ color: colors.white }}>
            {candidate.rubro}
          </Chip>
        )}

        {/* Reputation summary */}
        {reputation && reputation.review_count > 0 && (
          <View style={styles.repRow}>
            <View style={styles.repItem}>
              <MaterialCommunityIcons name="star" size={20} color={colors.featured} />
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>{reputation.avg_rating?.toFixed(1)}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>({reputation.review_count})</Text>
            </View>
            <View style={styles.repItem}>
              <MaterialCommunityIcons name="briefcase-check" size={18} color={colors.primary} />
              <Text variant="bodySmall">{reputation.jobs_completed} trabajos</Text>
            </View>
          </View>
        )}

        {/* Employer actions */}
        {isEmpleador && (
          <View style={styles.employerActions}>
            <IconButton icon={isFav ? 'heart' : 'heart-outline'} iconColor={isFav ? colors.error : theme.colors.onSurfaceVariant}
              size={28} onPress={toggleFav} />
            <Button mode="contained-tonal" icon="star-outline" onPress={() => setReviewDialog(true)} compact>
              Calificar
            </Button>
          </View>
        )}
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {candidate.phone && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>{candidate.phone}</Text>
        </View>
      )}

      {candidate.description && (
        <View style={{ marginTop: 12 }}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Descripcion</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>{candidate.description}</Text>
        </View>
      )}

      {candidate.cvUrl && (
        <Button mode="contained" icon="file-document" onPress={() => Linking.openURL(candidate.cvUrl)}
          style={styles.cvButton} contentStyle={{ height: 50 }}>
          Ver CV
        </Button>
      )}

      {/* Reviews section */}
      {reviews.length > 0 && (
        <>
          <Divider style={{ marginVertical: 20 }} />
          <Text variant="titleMedium" style={styles.sectionTitle}>Reseñas de empleadores</Text>
          {reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <MaterialCommunityIcons key={s} name={s <= rev.rating ? 'star' : 'star-outline'}
                    size={18} color={colors.featured} />
                ))}
              </View>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{rev.employer_name}</Text>
              {rev.job_title && <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{rev.job_title}</Text>}
              {rev.comment && <Text variant="bodyMedium" style={{ fontStyle: 'italic', marginTop: 4 }}>"{rev.comment}"</Text>}
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {new Date(rev.created_at).toLocaleDateString('es-AR')}
              </Text>
              <Divider style={{ marginTop: 12 }} />
            </View>
          ))}
        </>
      )}

      {/* Review Dialog */}
      <Portal>
        <Dialog visible={reviewDialog} onDismiss={() => setReviewDialog(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Calificar a {candidate.name}</Dialog.Title>
          <Dialog.Content>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <IconButton key={s} icon={s <= rating ? 'star' : 'star-outline'} iconColor={colors.featured}
                  size={32} onPress={() => setRating(s)} />
              ))}
            </View>
            <TextInput label="Comentario (opcional)" value={comment} onChangeText={setComment} mode="outlined"
              multiline numberOfLines={3} style={{ backgroundColor: 'transparent', marginTop: 8 }}
              placeholder="Ej: Excelente trabajador, puntual y responsable" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReviewDialog(false)}>Cancelar</Button>
            <Button onPress={submitReview} loading={submitting} disabled={rating === 0 || submitting}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', gap: 8 },
  name: { fontWeight: '700', marginTop: 12 },
  repRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  repItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  cvButton: { borderRadius: 12, marginTop: 24 },
  reviewCard: { marginBottom: 4, paddingVertical: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
});
