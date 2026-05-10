import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import { getModuleDefinition, hasRecordScope } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { deleteModuleRecord } from '../services/api';
import { exportRecordsToExcel } from '../services/export';
import { subscribeToModuleRecords } from '../services/realtime';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function ModuleListScreen({ navigation, route }) {
  const { profile } = useAuth();
  const module = route.params?.module || null;
  const moduleKey = route.params?.moduleKey || module?.key;
  const moduleLabel = route.params?.moduleLabel || module?.label;
  const canCreate = route.params?.create ?? module?.create ?? false;
  const editScope = route.params?.editScope ?? module?.editScope ?? false;
  const deleteScope = route.params?.deleteScope ?? module?.deleteScope ?? false;
  const definition = getModuleDefinition(moduleKey);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!definition || !moduleKey) {
      setLoading(false);
      setError('This module is not available right now.');
      return undefined;
    }

    const unsubscribe = subscribeToModuleRecords(
      moduleKey,
      profile,
      (nextRecords) => {
        setRecords(nextRecords);
        setError('');
        setLoading(false);
      },
      (loadError) => {
        setError(loadError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [definition, moduleKey, profile]);

  const visibleRecords = useMemo(() => {
    if (!definition) {
      return [];
    }

    const searchFields = Array.isArray(definition.searchFields) ? definition.searchFields : [];
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return records;
    }

    return records.filter((record) =>
      searchFields.some((field) =>
        String(record[field] ?? '').toLowerCase().includes(searchValue)
      )
    );
  }, [definition, records, search]);

  const handleDelete = (recordId) => {
    Alert.alert('Delete record', 'This item will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteModuleRecord(moduleKey, recordId);
          } catch (deleteError) {
            Alert.alert('Delete failed', deleteError.message);
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    if (!definition) {
      Alert.alert('Module unavailable', 'This module is not configured correctly.');
      return;
    }

    try {
      const fileUri = await exportRecordsToExcel(
        moduleKey,
        definition.fields.map((field) => ({ key: field.key, label: field.label })),
        visibleRecords
      );
      Alert.alert('Export saved', fileUri);
    } catch (exportError) {
      Alert.alert('Export failed', exportError.message);
    }
  };

  const canEditRecord = (record) => hasRecordScope(editScope, record, profile);
  const canDeleteRecord = (record) => hasRecordScope(deleteScope, record, profile);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{moduleLabel || definition?.title || 'Module'}</Text>
        {!definition ? (
          <Text style={styles.infoText}>
            This screen was opened without a valid module configuration.
          </Text>
        ) : null}
      </View>

      {definition ? (
        <View style={styles.actionRow}>
          {canCreate ? (
            <CustomButton
              title="New"
              style={styles.actionButton}
              onPress={() => navigation.navigate('ModuleForm', { moduleKey, moduleLabel })}
            />
          ) : null}
          <CustomButton
            title="Export Excel"
            variant="accent"
            style={styles.actionButton}
            onPress={handleExport}
          />
        </View>
      ) : null}

      {definition ? (
        <InputField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${moduleLabel || definition?.title || 'module'}`}
          autoCapitalize="none"
        />
      ) : null}

      {loading && !records.length ? <Text style={styles.infoText}>Loading...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && !visibleRecords.length && !error ? <Text style={styles.infoText}>No records found.</Text> : null}

      {definition ? visibleRecords.map((record) => (
        <View key={record.id} style={styles.card}>
          <Text style={styles.cardTitle}>{definition.getTitle(record)}</Text>
          <Text style={styles.meta}>{definition.getMeta(record)}</Text>
          {definition.getLines(record).filter(Boolean).map((line, index) => (
            <Text key={`${record.id}-${index}`} style={styles.line}>
              {line}
            </Text>
          ))}

          {canEditRecord(record) || canDeleteRecord(record) ? (
            <View style={styles.cardActions}>
              {canEditRecord(record) ? (
                <CustomButton
                  title="Edit"
                  variant="info"
                  style={styles.cardAction}
                  onPress={() => navigation.navigate('ModuleForm', { moduleKey, moduleLabel, record })}
                />
              ) : null}
              {canDeleteRecord(record) ? (
                <CustomButton
                  title="Delete"
                  variant="danger"
                  style={styles.cardAction}
                  onPress={() => handleDelete(record.id)}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      )) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundWhite,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 32,
  },
  headerRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryGold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkText,
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: colors.primaryGold,
    fontWeight: '600',
  },
  line: {
    marginTop: 8,
    fontSize: 14,
    color: colors.darkText,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cardAction: {
    flex: 1,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  errorText: {
    color: colors.dangerRed,
    fontSize: 14,
    marginBottom: 12,
  },
});
