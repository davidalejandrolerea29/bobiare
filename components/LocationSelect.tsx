import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

export type LocationSelectOption = {
  id: string;
  name: string;
  department?: string;
};

type Props = {
  label: string;
  placeholder: string;
  value?: string;
  selectedId?: string | null;
  options: LocationSelectOption[];
  onSelect: (option: LocationSelectOption) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function LocationSelect({
  label,
  placeholder,
  value,
  selectedId,
  options,
  onSelect,
  disabled,
  loading,
  error,
  onRetry,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const search = normalizeSearch(query.trim());
    if (!search) {
      return options;
    }
    return options.filter(option =>
      normalizeSearch(`${option.name} ${option.department || ''}`).includes(search),
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.78}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        style={[styles.field, (disabled || loading) && styles.fieldDisabled]}>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {loading ? `Cargando ${label.toLowerCase()}…` : value || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary}/>
        ) : (
          <Icon name="chevron-down" size={22} color={disabled ? '#AAB4B9' : colors.muted}/>
        )}
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry ? (
            <TouchableOpacity onPress={onRetry}>
              <Text style={styles.retry}>Reintentar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={open}
        onRequestClose={close}>
        <View style={styles.modal}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close}/>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.handle}/>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>SELECCIONAR</Text>
                <Text style={styles.sheetTitle}>{label}</Text>
              </View>
              <TouchableOpacity style={styles.close} onPress={close}>
                <Icon name="close" size={21} color={colors.ink}/>
              </TouchableOpacity>
            </View>
            <View style={styles.search}>
              <Icon name="magnify" size={21} color={colors.muted}/>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={`Buscar ${label.toLowerCase()}`}
                placeholderTextColor="#8C999E"
                style={styles.searchInput}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Icon name="close-circle" size={19} color={colors.muted}/>
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>No encontramos coincidencias.</Text>
              }
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      onSelect(item);
                      close();
                    }}>
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionName, selected && styles.optionNameSelected]}>
                        {item.name}
                      </Text>
                      {item.department ? (
                        <Text style={styles.department}>Departamento {item.department}</Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Icon name="check-circle" size={21} color={colors.primary}/>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderRadius: 17,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,.76)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldDisabled: { opacity: 0.62 },
  value: { flex: 1, color: colors.ink, fontSize: 14, marginRight: 10 },
  placeholder: { color: '#8C999E' },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 11 },
  retry: { color: colors.primary, fontSize: 11, fontWeight: '900', marginLeft: 12 },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,31,58,.34)',
  },
  sheet: {
    maxHeight: '78%',
    minHeight: '54%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    ...shadow,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(96,119,146,.28)',
    alignSelf: 'center',
    marginTop: 9,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 11,
    marginBottom: 13,
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sheetTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 2 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.72)',
  },
  search: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.ink, marginHorizontal: 9 },
  list: { paddingBottom: 18 },
  option: {
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: {
    borderRadius: 14,
    borderBottomColor: 'transparent',
    backgroundColor: 'rgba(147,197,253,.24)',
  },
  optionCopy: { flex: 1, marginRight: 10 },
  optionName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  optionNameSelected: { color: colors.primary, fontWeight: '900' },
  department: { color: colors.muted, fontSize: 10, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 36 },
});
