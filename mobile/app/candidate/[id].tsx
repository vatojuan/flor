import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, useTheme, ActivityIndicator, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { getCandidateProfile } from '../../services/profile';
import { colors } from '../../theme/colors';

export default function CandidateDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getCandidateProfile(id)
        .then(setCandidate)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  if (!candidate) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text>Candidato no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {candidate.profilePicture ? (
          <Avatar.Image size={100} source={{ uri: candidate.profilePicture }} />
        ) : (
          <Avatar.Icon size={100} icon="account" style={{ backgroundColor: colors.primary }} />
        )}
        <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.onBackground }]}>
          {candidate.name}
        </Text>
        {candidate.rubro && (
          <Chip style={[styles.rubroChip, { backgroundColor: colors.secondary }]} textStyle={{ color: colors.white }}>
            {candidate.rubro}
          </Chip>
        )}
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {candidate.phone && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>
            {candidate.phone}
          </Text>
        </View>
      )}

      {candidate.description && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Descripcion
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
            {candidate.description}
          </Text>
        </View>
      )}

      {candidate.cvUrl && (
        <Button
          mode="contained"
          icon="file-document"
          onPress={() => Linking.openURL(candidate.cvUrl)}
          style={styles.cvButton}
          contentStyle={{ height: 50 }}
        >
          Ver CV
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', gap: 8 },
  name: { fontWeight: '700', marginTop: 12 },
  rubroChip: {},
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  section: { marginTop: 8 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  cvButton: { borderRadius: 12, marginTop: 24 },
});
