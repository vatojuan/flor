import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
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
  banner_url?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_visible?: boolean;
  modality?: string;
  contract_type?: string;
  benefits?: string[];
  tags?: string[];
}

interface JobCardProps {
  job: Job;
  onPress?: () => void;
  actions?: React.ReactNode;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatSalary(min?: number, max?: number, visible?: boolean) {
  if (visible === false) return 'A convenir';
  if (!min && !max) return null;
  const fmt = (n: number) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  if (min && max) return `$${fmt(min)} - $${fmt(max)}/mes`;
  if (min) return `Desde $${fmt(min)}/mes`;
  return `Hasta $${fmt(max!)}/mes`;
}

function formatContractModality(contract?: string, modality?: string) {
  const parts: string[] = [];
  if (contract) {
    const labels: Record<string, string> = {
      ocasional: 'Ocasional', temporal: 'Temporal', contrato: 'Contrato',
      efectivo: 'Efectivo', freelance: 'Freelance',
    };
    parts.push(labels[contract] || contract);
  }
  if (modality) {
    const labels: Record<string, string> = {
      presencial: 'Presencial', remoto: 'Remoto', hibrido: 'Híbrido',
    };
    parts.push(labels[modality] || modality);
  }
  return parts.join(' · ') || null;
}

export default function JobCard({ job, onPress, actions }: JobCardProps) {
  const theme = useTheme();
  const isFeatured = job.is_paid || job.isPaid;
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_visible);
  const contractModality = formatContractModality(job.contract_type, job.modality);

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
      {job.banner_url && (
        <Image source={{ uri: job.banner_url }} style={styles.banner} />
      )}
      <Card.Content style={styles.content}>
        {isFeatured && (
          <Chip icon="star" style={styles.featuredChip} textStyle={styles.featuredChipText} compact>
            Destacada
          </Chip>
        )}
        <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>

        {/* Rubro + Contract/Modality row */}
        <View style={styles.chipRow}>
          {job.rubro && (
            <Chip style={[styles.rubroChip, { backgroundColor: colors.secondary }]} textStyle={{ color: colors.white, fontSize: 11 }} compact>
              {job.rubro}
            </Chip>
          )}
          {contractModality && (
            <Chip icon="briefcase-outline" compact style={styles.infoChip} textStyle={{ fontSize: 10 }}>
              {contractModality}
            </Chip>
          )}
        </View>

        {/* Meta info */}
        <View style={styles.metaContainer}>
          {job.location && (
            <MetaRow icon="map-marker" text={job.location} color={theme.colors.onSurfaceVariant} />
          )}
          {salary && (
            <MetaRow icon="currency-usd" text={salary} color={colors.success} />
          )}
          <MetaRow icon="calendar" text={formatDate(job.createdAt)} color={theme.colors.onSurfaceVariant} />
          {job.expirationDate && (
            <MetaRow icon="clock-alert-outline" text={`Exp. ${formatDate(job.expirationDate)}`} color={colors.warning} />
          )}
          <MetaRow icon="account-group" text={`${job.candidatesCount ?? 0} candidatos`} color={theme.colors.onSurfaceVariant} />
        </View>

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <View style={styles.chipRow}>
            {job.benefits.slice(0, 3).map((b, i) => (
              <Chip key={i} icon="check-circle-outline" compact style={styles.benefitChip} textStyle={{ fontSize: 10, color: colors.success }}>
                {b}
              </Chip>
            ))}
            {job.benefits.length > 3 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>+{job.benefits.length - 3} más</Text>
            )}
          </View>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <View style={styles.chipRow}>
            {job.tags.slice(0, 4).map((tag, i) => (
              <Chip key={i} compact style={styles.tagChip} textStyle={{ fontSize: 10 }}>
                #{tag}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
      {actions && <Card.Actions style={styles.actions}>{actions}</Card.Actions>}
    </Card>
  );
}

function MetaRow({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={styles.metaRow}>
      <MaterialCommunityIcons name={icon as any} size={14} color={color} />
      <Text variant="bodySmall" style={{ color, marginLeft: 4 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6, borderRadius: 12, overflow: 'hidden' },
  featuredCard: { borderWidth: 1.5, borderColor: colors.featured },
  banner: { width: '100%', height: 120 },
  content: { gap: 6, paddingTop: 12 },
  title: { fontWeight: '600' },
  featuredChip: { alignSelf: 'flex-start', backgroundColor: colors.featured },
  featuredChipText: { color: '#000', fontSize: 11, fontWeight: '600' },
  rubroChip: { alignSelf: 'flex-start' },
  infoChip: { alignSelf: 'flex-start' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  metaContainer: { gap: 3, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  benefitChip: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.success },
  tagChip: { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
  actions: { paddingHorizontal: 12, paddingBottom: 8 },
});
