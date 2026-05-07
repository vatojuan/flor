import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar, Chip, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Candidate {
  id: number;
  name: string;
  rubro?: string;
  email?: string;
  phone?: string;
  cvUrl?: string;
  profilePicture?: string;
}

interface CandidateCardProps {
  candidate: Candidate;
  onViewProfile?: () => void;
  onViewCV?: () => void;
}

export default function CandidateCard({ candidate, onViewProfile, onViewCV }: CandidateCardProps) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          {candidate.profilePicture ? (
            <Avatar.Image size={48} source={{ uri: candidate.profilePicture }} />
          ) : (
            <Avatar.Icon size={48} icon="account" style={{ backgroundColor: colors.primary }} />
          )}
          <View style={styles.headerText}>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              {candidate.name}
            </Text>
            {candidate.rubro && (
              <Chip
                compact
                style={[styles.rubroChip, { backgroundColor: colors.secondary }]}
                textStyle={{ color: colors.white, fontSize: 10 }}
              >
                {candidate.rubro}
              </Chip>
            )}
          </View>
        </View>

        {candidate.email && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
              {candidate.email}
            </Text>
          </View>
        )}
        {candidate.phone && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
              {candidate.phone}
            </Text>
          </View>
        )}
      </Card.Content>
      <Card.Actions>
        {onViewCV && candidate.cvUrl && (
          <Button icon="file-document" onPress={onViewCV} compact>
            Ver CV
          </Button>
        )}
        {onViewProfile && (
          <Button mode="contained-tonal" onPress={onViewProfile} compact>
            Ver Perfil
          </Button>
        )}
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    borderRadius: 12,
  },
  content: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  rubroChip: {
    alignSelf: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 60,
  },
});
