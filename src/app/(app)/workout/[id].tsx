import { useLocalSearchParams } from 'expo-router';
import { WorkoutDetailScreen } from '@/features/workouts';
export default function DetailRoute() { const { id } = useLocalSearchParams<{ id?: string | string[] }>(); return <WorkoutDetailScreen id={typeof id === 'string' ? id : ''} />; }
