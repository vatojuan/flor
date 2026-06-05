import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Text, Avatar, Chip, IconButton, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMyFavorites, removeFavorite } from '../services/reputation';
import EmptyState from '../components/EmptyState';
import { colors } from '../theme/colors';

export default function FavoritesScreen() {
  const theme = useTheme();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getMyFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const handleRemove = async (candidateId: number) => {
    try {
      await removeFavorite(candidateId);
      setFavorites(favorites.filter((f) => f.candidate_id !== candidateId));
      setSnackbar({ visible: true, message: 'Favorito eliminado' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={favorites.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavorites(); }} colors={[colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Sin favoritos"
            description="Visita el perfil de un candidato y presiona el corazon para agregarlo a favoritos."
          />
        }
        renderItem={({ item }) => (
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
            mode="elevated"
            onPress={() => router.push({ pathname: '/candidate/[id]', params: { id: item.candidate_id } })}
          >
            <Card.Content style={styles.cardContent}>
              {item.candidate_picture ? (
                <Avatar.Image size={56} source={{ uri: item.candidate_picture }} />
              ) : (
                <Avatar.Icon size={56} icon="account" style={{ backgroundColor: colors.primary }} />
              )}
              <View style={styles.cardInfo}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>{item.candidate_name}</Text>
                {item.candidate_rubro && (
                  <Chip compact style={{ backgroundColor: colors.secondary, alignSelf: 'flex-start' }}
                    textStyle={{ color: colors.white, fontSize: 10 }}>
                    {item.candidate_rubro}
                  </Chip>
                )}
                {item.review_count > 0 && (
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={14} color={colors.featured} />
                    <Text variant="bodySmall" style={{ fontWeight: '600' }}>{item.avg_rating?.toFixed(1)}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>({item.review_count})</Text>
                  </View>
                )}
              </View>
              <IconButton icon="heart" iconColor={colors.error} size={24}
                onPress={() => handleRemove(item.candidate_id)} />
            </Card.Content>
          </Card>
        )}
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
  list: { padding: 16, paddingBottom: 32 },
  emptyList: { flex: 1 },
  card: { marginBottom: 8, borderRadius: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1, gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
