import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Job {
  id: number;
  title: string;
  rubro?: string;
  is_paid?: boolean;
  isPaid?: boolean;
  candidatesCount?: number;
  createdAt?: string;
  expirationDate?: string;
}

interface JobCardProps {
  job: Job;
  onPress?: () => void;
  actions?: React.ReactNode;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function JobCard({ job, onPress, actions }: JobCardProps) {
  const theme = useTheme();
  const isFeatured = job.is_paid || job.isPaid;

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        isFeatured && styles.featuredCard,
      ]}
      onPress={onPress}
      mode="elevated"
    >
      <Card.Content style={styles.content}>
        {isFeatured && (
          <Chip
            icon="star"
            style={styles.featuredChip}
            textStyle={styles.featuredChipText}
            compact
          >
            Destacada
          </Chip>
        )}
        <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>
        {job.rubro && (
          <Chip
            style={[styles.rubroChip, { backgroundColor: colors.secondary }]}
            textStyle={{ color: colors.white, fontSize: 11 }}
            compact
          >
            {job.rubro}
          </Chip>
        )}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {formatDate(job.createdAt)}
            </Text>
          </View>
          {job.expirationDate && (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.warning} />
              <Text variant="bodySmall" style={{ color: colors.warning, marginLeft: 4 }}>
                Expira: {formatDate(job.expirationDate)}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="account-group" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {job.candidatesCount ?? 0} candidatos
            </Text>
          </View>
        </View>
      </Card.Content>
      {actions && <Card.Actions style={styles.actions}>{actions}</Card.Actions>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  featuredCard: {
    borderWidth: 1.5,
    borderColor: colors.featured,
  },
  content: {
    gap: 8,
  },
  title: {
    fontWeight: '600',
  },
  featuredChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.featured,
  },
  featuredChipText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  rubroChip: {
    alignSelf: 'flex-start',
  },
  metaContainer: {
    gap: 4,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
