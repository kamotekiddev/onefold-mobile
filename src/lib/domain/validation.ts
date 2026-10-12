import type { Exercise, RoutineInput } from '../../types/domain';
export class ServiceError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'ServiceError'; }
}
export const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;
export const isNonnegative = (value: number) => Number.isFinite(value) && value >= 0;
export function validateRoutine(input: RoutineInput, catalog: Exercise[]) {
  if (!input.name.trim()) throw new ServiceError('VALIDATION', 'Enter a routine name.');
  if (!input.entries.length) throw new ServiceError('VALIDATION', 'Add at least one exercise.');
  if (new Set(input.entries.map(entry => entry.id)).size !== input.entries.length) throw new ServiceError('VALIDATION', 'Every routine entry needs a unique ID.');
  for (const entry of input.entries) {
    const exercise = catalog.find(item => item.id === entry.exerciseId);
    if (!exercise) throw new ServiceError('VALIDATION', 'Choose an exercise from the catalog.');
    if (![entry.setCount, entry.repMin, entry.repMax].every(isPositiveInteger) || entry.repMin > entry.repMax) throw new ServiceError('VALIDATION', 'Use positive whole numbers for sets and reps, with minimum reps no greater than maximum reps.');
    if (!isNonnegative(entry.restSeconds) || (entry.startingWeight !== undefined && !isNonnegative(entry.startingWeight))) throw new ServiceError('VALIDATION', 'Weight and rest time cannot be negative.');
    if (entry.progressionMode === 'weight' && (exercise.trackingType === 'bodyweight' || !Number.isFinite(entry.weightIncrement) || (entry.weightIncrement ?? 0) <= 0)) throw new ServiceError('VALIDATION', 'Weight progression needs a positive increment and a weighted exercise.');
    if (entry.progressionMode === 'reps' && !isPositiveInteger(entry.repIncrement ?? 0)) throw new ServiceError('VALIDATION', 'Rep progression needs a positive whole-number increment.');
  }
}
