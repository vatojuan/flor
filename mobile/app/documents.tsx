import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, Card, IconButton, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import { getDocuments, uploadDocument, deleteDocument, getSignedUrl } from '../services/profile';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { colors } from '../theme/colors';

const MAX_DOCS = 5;
const MAX_SIZE = 5 * 1024 * 1024;

function getFileIcon(name: string) {
  if (name.endsWith('.pdf')) return 'file-pdf-box';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'file-word-box';
  if (name.endsWith('.jpg') || name.endsWith('.png')) return 'file-image';
  return 'file-document';
}

export default function DocumentsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const type = user?.role === 'empleador' || user?.role === 'admin' ? 'employer' : 'employee';

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ visible: boolean; id?: number }>({ visible: false });
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const fetchDocs = useCallback(async () => {
    try {
      const res = await getDocuments(type);
      setDocs(res.documents || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (docs.length >= MAX_DOCS) {
      setSnackbar({ visible: true, message: `Maximo ${MAX_DOCS} documentos` });
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      if (file.size && file.size > MAX_SIZE) {
        setSnackbar({ visible: true, message: 'El archivo excede 5 MB' });
        return;
      }

      setUploading(true);
      await uploadDocument(file.uri, file.name, type);
      setSnackbar({ visible: true, message: 'Documento subido' });
      fetchDocs();
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await deleteDocument(deleteDialog.id, type);
      setDeleteDialog({ visible: false });
      setSnackbar({ visible: true, message: 'Documento eliminado' });
      fetchDocs();
    } catch (err: any) {
      setSnackbar({ visible: true, message: err.message });
    }
  };

  const handleOpen = async (fileKey: string) => {
    try {
      const res = await getSignedUrl(fileKey, type);
      if (res.url) await Linking.openURL(res.url);
    } catch {
      setSnackbar({ visible: true, message: 'Error al abrir documento' });
    }
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {docs.length}/{MAX_DOCS} documentos
        </Text>
        <Button
          mode="contained"
          icon="upload"
          onPress={handleUpload}
          loading={uploading}
          disabled={uploading || docs.length >= MAX_DOCS}
          compact
          style={{ borderRadius: 10 }}
        >
          Subir
        </Button>
      </View>

      <FlatList
        data={docs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={docs.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="file-document-outline"
            title="Sin documentos"
            description="Subi tu CV y otros documentos relevantes"
            actionLabel="Subir Documento"
            onAction={handleUpload}
          />
        }
        renderItem={({ item }) => (
          <Card style={[styles.docCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
            <Card.Content style={styles.docContent}>
              <MaterialCommunityIcons
                name={getFileIcon(item.originalName) as any}
                size={32}
                color={colors.primary}
              />
              <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '500' }} numberOfLines={1}>
                {item.originalName}
              </Text>
              <IconButton icon="open-in-new" size={20} onPress={() => handleOpen(item.fileKey)} />
              <IconButton icon="delete" size={20} iconColor={colors.error} onPress={() => setDeleteDialog({ visible: true, id: item.id })} />
            </Card.Content>
          </Card>
        )}
      />

      <ConfirmDialog
        visible={deleteDialog.visible}
        title="Eliminar Documento"
        message="¿Seguro que deseas eliminar este documento?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ visible: false })}
        severity="error"
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyList: { flex: 1 },
  docCard: { marginBottom: 8, borderRadius: 12 },
  docContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
