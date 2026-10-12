import assert from 'node:assert/strict';
import test from 'node:test';

import type { Workout } from '../../../types/domain';
import { displayWeight, elapsed, inputWeight, workoutCounts } from './display';

test('unit display conversion never changes canonical load and input converts back', () => {
  const canonical = 100;
  assert.equal(displayWeight(canonical, 'kg'), '100');
  assert.equal(displayWeight(canonical, 'lb'), '220.46');
  assert.ok(Math.abs(inputWeight('220.46226218', 'lb') - canonical) < 1e-8);
  assert.equal(canonical, 100);
  assert.equal(displayWeight(0, 'lb'), '0');
  assert.equal(displayWeight(null, 'kg'), '—');
});

test('timestamp-derived countdown handles foreground recovery and expiry', () => {
  const endsAt = 90_000;
  assert.equal(elapsed(Math.ceil((endsAt - 30_000) / 1000)), '1:00');
  assert.equal(elapsed(Math.ceil((endsAt - 88_500) / 1000)), '0:02');
  assert.equal(elapsed(Math.ceil((endsAt - 100_000) / 1000)), '0:00');
  assert.equal(elapsed(3601), '60:01');
});

test('summary counts extra sets separately and skips never count as complete', () => {
  const makeSet = (id: string, kind: 'prescribed' | 'extra', status: 'pending' | 'completed' | 'skipped') => ({ id, kind, index: 0, plannedReps: 8, actualReps: status === 'completed' ? 8 : null, actualWeight: null, repsInput: '', weightInput: '', status });
  const workout: Workout = {
    id: 'workout', startRequestId: 'request', routineId: 'routine', routineName: 'Original snapshot', status: 'completed', startedAt: 0, finishedAt: 1000, restTimer: null, suggestions: [],
    entries: [{ id: 'entry', exercise: { id: 'exercise', name: 'Push-up', primaryMuscleGroup: 'Chest', equipment: 'Bodyweight', trackingType: 'bodyweight' }, prescription: { id: 'entry', exerciseId: 'exercise', order: 0, setCount: 3, repMin: 8, repMax: 12, restSeconds: 60, progressionMode: 'manual', prescriptionRevision: 1 }, previous: [], sets: [makeSet('one', 'prescribed', 'completed'), makeSet('two', 'prescribed', 'skipped'), makeSet('three', 'prescribed', 'pending'), makeSet('four', 'extra', 'completed')] }],
  };
  assert.deepEqual(workoutCounts(workout), { planned: 3, completed: 1, extra: 1 });
});
