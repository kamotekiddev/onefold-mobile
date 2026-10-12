import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, ErrorMessage, Screen } from '@/components/ui';
import { useApp } from '@/lib/app-provider';
import { SetRow } from '../components/set-row';
import { useWorkoutDrafts } from '../hooks/use-drafts';
import { useNow } from '../hooks/use-now';
import { elapsed, errorText, workoutCounts } from '../utils/display';

export function ActiveWorkoutScreen() {
  const { state, services } = useApp();
  const now = useNow();
  const drafts = useWorkoutDrafts();
  const workout = state.data?.workouts.find(item => item.status === 'inProgress');
  const unit = state.data?.preferences.weightUnit ?? 'kg';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'finish' | 'abandon' | null>(null);
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  };
  if (!workout) return <Screen title="Workout"><EmptyState title="No active workout" message="Choose a routine when you’re ready to train." action={<Button label="View routines" onPress={() => router.replace('/')} />} /></Screen>;
  const counts = workoutCounts(workout);
  const sessionDrafts = Object.entries(drafts).filter(([key]) => key.startsWith(`${workout.id}/`)).map(([, draft]) => draft);
  const failedDrafts = sessionDrafts.some(draft => draft.error);
  const savingDrafts = sessionDrafts.some(draft => draft.pending);
  const rest = workout.restTimer ? Math.max(0, Math.ceil((workout.restTimer.endsAt - now) / 1000)) : null;
  const finish = () => void perform(async () => {
    if (failedDrafts || savingDrafts) throw new Error('Wait for inputs to save, or retry the failed sets, before finishing.');
    const completed = await services.workouts.complete(workout.id);
    router.replace({ pathname: '/workout/[id]', params: { id: completed.id } });
  });
  return <Screen scroll={false} title={workout.routineName} subtitle={`${elapsed((now - workout.startedAt) / 1000)} elapsed · ${counts.completed}/${counts.planned} planned sets`}>
    {!!error && <ErrorMessage message={error} />}
    {failedDrafts && <ErrorMessage message="Some inputs could not be saved. Return to the affected set and tap Retry saving inputs before finishing." />}
    {savingDrafts && <AppText variant="caption">Saving inputs…</AppText>}
    {rest !== null && <Card>
      <AppText variant="heading">{rest > 0 ? `Rest · ${elapsed(rest)}` : 'Rest complete — ready for your next set'}</AppText>
      <View style={styles.row}>
        <View style={styles.timerAction}><Button label="−15 sec" variant="secondary" disabled={busy || rest === 0} onPress={() => void perform(() => services.workouts.updateTimer(workout.id, { type: 'adjust', seconds: -15 }))} /></View>
        <View style={styles.timerAction}><Button label="+15 sec" variant="secondary" disabled={busy} onPress={() => void perform(() => services.workouts.updateTimer(workout.id, { type: 'adjust', seconds: 15 }))} /></View>
        <View style={styles.timerAction}><Button label={rest > 0 ? 'Skip rest' : 'Dismiss'} variant="secondary" disabled={busy} onPress={() => void perform(() => services.workouts.updateTimer(workout.id, { type: 'clear' }))} /></View>
      </View>
    </Card>}
    <SectionList
      style={styles.list}
      sections={workout.entries.map(entry => ({ entry, data: entry.sets }))}
      keyExtractor={set => set.id}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      renderSectionHeader={({ section }) => <View style={styles.section}><AppText variant="heading">{section.entry.exercise.name}</AppText><AppText variant="caption">{section.entry.prescription.repMin}–{section.entry.prescription.repMax} reps · {section.entry.prescription.restSeconds}s rest</AppText></View>}
      renderItem={({ item, section }) => <SetRow key={`${item.id}-${unit}`} workoutId={workout.id} entry={section.entry} set={item} unit={unit} />}
      renderSectionFooter={({ section }) => <View style={styles.section}><Button label={`Add extra set · ${section.entry.exercise.name}`} variant="secondary" disabled={busy} onPress={() => void perform(() => services.workouts.addSet(workout.id, section.entry.id))} /></View>}
      ListFooterComponent={<View style={styles.footer}>
        {confirm === 'finish' && <Card><AppText variant="heading">Finish with uncompleted sets?</AppText><AppText>{counts.planned - counts.completed} prescribed sets are skipped or unfinished. They will remain uncompleted and prevent progression for those exercises.</AppText><Button label="Finish anyway" disabled={failedDrafts || savingDrafts} loading={busy} onPress={finish} /><Button label="Keep training" variant="secondary" onPress={() => setConfirm(null)} /></Card>}
        {confirm === 'abandon' && <Card><AppText variant="heading">Abandon this workout?</AppText><AppText>This session will not appear in history or change your next targets.</AppText><Button label="Abandon workout" variant="danger" loading={busy} onPress={() => void perform(async () => { await services.workouts.abandon(workout.id); router.replace('/'); })} /><Button label="Keep training" variant="secondary" onPress={() => setConfirm(null)} /></Card>}
        <Button label="Finish workout" disabled={busy || failedDrafts || savingDrafts} onPress={() => counts.completed < counts.planned ? setConfirm('finish') : finish()} />
        <Button label="Abandon workout" variant="danger" disabled={busy} onPress={() => setConfirm('abandon')} />
      </View>}
    />
  </Screen>;
}
const styles = StyleSheet.create({ timerAction: { flex: 1, minWidth: 90 }, list: { flex: 1 }, content: { gap: 12, paddingBottom: 24 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, section: { paddingVertical: 12, gap: 5 }, footer: { gap: 12, paddingVertical: 16 } });
