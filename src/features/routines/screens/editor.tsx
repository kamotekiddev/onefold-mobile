import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AppText, Button, Card, ErrorMessage, Field, Screen } from '@/components/ui';
import { useApp } from '@/lib/app-provider';
import type { RoutineEntry } from '@/types/domain';

import { useRoutineDraft } from '../hooks/draft';
import { confirmAction, errorText, prescriptionText } from '../utils';
import { getDropIndex } from '../reorder';

export function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, services } = useApp();
  const { draft, setDraft } = useRoutineDraft();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allowLeave, setAllowLeave] = useState(false);
  const [drag, setDrag] = useState<{ id: string; translation: number; target: number } | null>(null);
  const rowHeights = useRef<Record<string, number>>({});
  const scrollOffset = useRef(0);
  const dragStartOffset = useRef(0);
  const pointer = useRef(0);
  const list = useRef<FlatList<RoutineEntry>>(null);
  const { height } = useWindowDimensions();
  const unit = state.data?.preferences.weightUnit ?? 'kg';
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const value = await (id ? services.routines.getById(id) : Promise.resolve({ name: '', entries: [] }));
      if (alive) setDraft({ routineId: id, value: { name: value.name, entries: value.entries }, baseline: JSON.stringify({ name: value.name, entries: value.entries }) });
    };
    load().catch(e => { if (alive) setError(errorText(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, services, setDraft]);
  const dirty = !!draft && JSON.stringify(draft.value) !== draft.baseline;
  usePreventRemove(dirty && !allowLeave, ({ data }) => {
    confirmAction('Discard changes?', 'Your unsaved routine changes will be lost.', 'Discard', () => { setAllowLeave(true); navigation.dispatch(data.action); });
  });
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const interval = setInterval(() => {
      const delta = pointer.current < 160 ? -18 : pointer.current > height - 140 ? 18 : 0;
      if (delta) list.current?.scrollToOffset({ offset: Math.max(0, scrollOffset.current + delta), animated: false });
    }, 70);
    return () => clearInterval(interval);
  }, [dragging, height]);
  const move = (entryId: string, target: number) => setDraft(current => {
    if (!current) return current;
    const entries = [...current.value.entries];
    const from = entries.findIndex(entry => entry.id === entryId);
    if (from < 0 || target < 0 || target >= entries.length) return current;
    const [entry] = entries.splice(from, 1); entries.splice(target, 0, entry);
    return { ...current, value: { ...current.value, entries: entries.map((item, order) => ({ ...item, order })) } };
  });
  const save = async (confirmTargetReset = false) => {
    if (!draft || saving.current) return;
    const nextErrors: Record<string, string> = {};
    if (!draft.value.name.trim()) nextErrors.name = 'Enter a routine name.';
    if (!draft.value.entries.length) nextErrors.entries = 'Add at least one exercise.';
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const value = { ...draft.value, name: draft.value.name.trim() };
      const saved = draft.routineId ? await services.routines.update(draft.routineId, value, { confirmTargetReset }) : await services.routines.create(value);
      setAllowLeave(true); setDraft(null);
      setTimeout(() => router.replace({ pathname: '/routines/details', params: { id: saved.id } }), 0);
    } catch (e) {
      if ((e as { code?: string }).code === 'TARGET_RESET_REQUIRED') {
        confirmAction('Reset future targets?', 'Changed prescriptions reset progression for those exercises. Your workout history stays unchanged.', 'Save and reset', () => void save(true));
      } else setError(errorText(e));
    } finally { saving.current = false; setBusy(false); }
  };
  if (loading) return <Screen title="Routine editor"><ActivityIndicator /></Screen>;
  if (!draft) return <Screen title="Routine editor"><ErrorMessage message={error || 'Unable to load routine.'} /><Button label="Back" onPress={() => router.back()} /></Screen>;
  return <Screen title={id ? 'Edit routine' : 'Create routine'} scroll={false}>
    <FlatList keyboardShouldPersistTaps="handled" removeClippedSubviews={false} ref={list} data={draft.value.entries} keyExtractor={item => item.id} scrollEventThrottle={16} onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
      contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      ListHeaderComponent={<View style={{ gap: 12 }}><Field label="Routine name" value={draft.value.name} error={errors.name} placeholder="e.g. Upper body" onChangeText={name => setDraft(current => current && ({ ...current, value: { ...current.value, name } }))} />{error ? <ErrorMessage message={error} /> : null}{errors.entries ? <ErrorMessage message={errors.entries} /> : null}<AppText variant="caption">Hold an exercise’s drag handle to reorder. Move buttons are also available.</AppText></View>}
      renderItem={({ item, index }) => <View onLayout={event => { rowHeights.current[item.id] = event.nativeEvent.layout.height; }} style={{ zIndex: drag?.id === item.id ? 10 : 0, transform: [{ translateY: drag?.id === item.id ? drag.translation : 0 }], opacity: drag && drag.id !== item.id ? 0.7 : 1 }}>
        <Card><GestureDetector gesture={Gesture.Pan().activateAfterLongPress(250).runOnJS(true).onStart(event => { dragStartOffset.current = scrollOffset.current; pointer.current = event.absoluteY; setDrag({ id: item.id, translation: 0, target: index }); }).onUpdate(event => {
          pointer.current = event.absoluteY;
          const translation = event.translationY + scrollOffset.current - dragStartOffset.current;
          const target = getDropIndex(draft.value.entries, rowHeights.current, item.id, translation);
          setDrag({ id: item.id, translation, target });
        }).onEnd(event => {
          const target = getDropIndex(draft.value.entries, rowHeights.current, item.id, event.translationY + scrollOffset.current - dragStartOffset.current);
          move(item.id, target); setDrag(null);
        }).onFinalize(() => setDrag(null))}><View accessible accessibilityLabel={`Drag ${state.data?.exercises.find(exercise => exercise.id === item.exerciseId)?.name ?? 'exercise'} to reorder`} style={{ minHeight: 48, justifyContent: 'center' }}><AppText variant="heading">☰  {index + 1}. {state.data?.exercises.find(exercise => exercise.id === item.exerciseId)?.name}</AppText></View></GestureDetector>
        <AppText>{prescriptionText(item, unit)}</AppText>
        {drag?.id === item.id ? <AppText variant="caption">Drop at position {drag.target + 1}</AppText> : null}
        <Button label="Configure exercise" variant="secondary" onPress={() => router.push({ pathname: '/routines/configure', params: { entryId: item.id } })} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button label="Move up" variant="secondary" disabled={index === 0} onPress={() => move(item.id, index - 1)} /><Button label="Move down" variant="secondary" disabled={index === draft.value.entries.length - 1} onPress={() => move(item.id, index + 1)} /></View>
        <Button label="Remove exercise" variant="danger" onPress={() => setDraft(current => current && ({ ...current, value: { ...current.value, entries: current.value.entries.filter(entry => entry.id !== item.id).map((entry, order) => ({ ...entry, order })) } }))} /></Card>
      </View>}
      ListFooterComponent={<View style={{ gap: 12 }}><Button label="Add exercises" variant="secondary" onPress={() => router.push('/routines/picker')} /><Button label="Save routine" loading={busy} onPress={() => void save()} /><Button label="Cancel" variant="secondary" disabled={busy} onPress={() => router.back()} /></View>} />
  </Screen>;
}
