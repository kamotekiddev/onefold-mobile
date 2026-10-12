import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorMessage, Field } from '@/components/ui';
import { useApp } from '@/lib/app-provider';
import type { SetUpdate, WeightUnit, WorkoutEntry, WorkoutSet } from '@/types/domain';
import { draftKey, readDraft, useWorkoutDrafts, writeDraft } from '../hooks/use-drafts';
import { displayWeight, errorText, inputWeight } from '../utils/display';

interface Props { workoutId: string; entry: WorkoutEntry; set: WorkoutSet; unit: WeightUnit }
export const SetRow = memo(function SetRow({ workoutId, entry, set, unit }: Props) {
  const { services } = useApp();
  const drafts = useWorkoutDrafts();
  const key = draftKey(workoutId, set.id);
  const draft = drafts[key];
  const reps = draft?.reps ?? set.repsInput;
  const rawWeight = draft?.weight ?? set.weightInput;
  const weight = draft && draft.unit !== unit && rawWeight.trim() && Number.isFinite(Number(rawWeight)) ? displayWeight(inputWeight(rawWeight, draft.unit), unit) : rawWeight;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const weighted = entry.exercise.trackingType !== 'bodyweight';
  const previous = entry.previous[set.index];
  const actualReps = reps.trim() !== '' && Number.isInteger(Number(reps)) && Number(reps) > 0 ? Number(reps) : null;
  const actualWeight = weight.trim() !== '' && Number.isFinite(Number(weight)) && Number(weight) >= 0 ? inputWeight(weight, unit) : null;
  const update = async (patch: SetUpdate) => {
    const version = (readDraft(key)?.version ?? 0) + 1;
    const next = { reps: patch.repsInput ?? reps, weight: patch.weightInput ?? weight, unit, pending: true, error: '', version };
    writeDraft(key, next);
    try { await services.workouts.updateSet(workoutId, entry.id, set.id, patch); if (readDraft(key)?.version === version) { writeDraft(key, { ...next, pending: false }); setError(''); } }
    catch (failure) { if (readDraft(key)?.version === version) writeDraft(key, { ...next, pending: false, error: `Not saved: ${errorText(failure)}` }); }
  };
  const changeStatus = async (status: WorkoutSet['status']) => {
    if (busy) return;
    if (status === 'completed' && (actualReps === null || (weighted && actualWeight === null))) {
      setError(weighted ? 'Enter positive whole-number reps and a weight of zero or more.' : 'Enter a positive whole number of reps.');
      return;
    }
    setBusy(true);
    await update({ status, repsInput: reps, weightInput: weight, actualReps, actualWeight: weighted ? actualWeight : null });
    setBusy(false);
  };
  return <Card>
    <AppText variant="heading">{set.kind === 'extra' ? 'Extra set' : `Set ${set.index + 1}`} · {set.status === 'completed' ? 'Complete' : set.status === 'skipped' ? 'Skipped' : 'To do'}</AppText>
    <AppText variant="caption">Target {set.plannedReps} reps{weighted ? ` × ${displayWeight(set.plannedWeight, unit)} ${unit}` : ''}</AppText>
    {previous && <AppText variant="caption">Previous: {previous.reps ?? '—'} reps{weighted ? ` × ${displayWeight(previous.weight, unit)} ${unit}` : ''}</AppText>}
    <View style={styles.inputs}>
      <View style={styles.input}><Field label="Actual reps" value={reps} keyboardType="number-pad" onChangeText={value => {
        const n = Number(value);
        void update({ repsInput: value, actualReps: value.trim() && Number.isInteger(n) && n > 0 ? n : null, ...(set.status === 'completed' ? { status: 'pending' as const } : {}) });
      }} /></View>
      {weighted && <View style={styles.input}><Field label={entry.exercise.trackingType === 'bodyweightAddedWeight' ? 'Added weight' : 'Actual weight'} suffix={unit} value={weight} keyboardType="decimal-pad" onChangeText={value => {
        const n = Number(value);
        void update({ weightInput: value, actualWeight: value.trim() && Number.isFinite(n) && n >= 0 ? inputWeight(value, unit) : null, ...(set.status === 'completed' ? { status: 'pending' as const } : {}) });
      }} /></View>}
    </View>
    {!!(error || draft?.error) && <><ErrorMessage message={error || draft?.error || ''} /><Button label="Retry saving inputs" variant="secondary" onPress={() => void update({ repsInput: reps, weightInput: weight, actualReps, actualWeight: weighted ? actualWeight : null, status: 'pending' })} /></>}
    <View style={styles.actions}>
      <View style={styles.input}><Button label={set.status === 'completed' ? 'Undo completion' : 'Complete set'} loading={busy} onPress={() => void changeStatus(set.status === 'completed' ? 'pending' : 'completed')} variant={set.status === 'completed' ? 'secondary' : 'primary'} /></View>
      {set.status !== 'completed' && <Button label={set.status === 'skipped' ? 'Restore' : 'Skip'} variant="secondary" disabled={busy} onPress={() => void changeStatus(set.status === 'skipped' ? 'pending' : 'skipped')} />}
    </View>
  </Card>;
});
const styles = StyleSheet.create({ inputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, input: { flex: 1, minWidth: 110 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' } });
