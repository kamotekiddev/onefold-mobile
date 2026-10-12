import { Stack } from 'expo-router';
import { RoutineDraftProvider } from '@/features/routines';

export default function RoutinesLayout() {
  return <RoutineDraftProvider><Stack screenOptions={{ headerBackTitle: 'Back' }}><Stack.Screen name="details" options={{ title: 'Routine' }} /><Stack.Screen name="edit" options={{ title: 'Routine editor' }} /><Stack.Screen name="picker" options={{ title: 'Exercises' }} /><Stack.Screen name="configure" options={{ title: 'Exercise settings' }} /></Stack></RoutineDraftProvider>;
}
