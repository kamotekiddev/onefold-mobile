import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => undefined;
/** Keep static HTML deterministic, then use the device preference after hydration. */
export function useColorScheme() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const scheme = useRNColorScheme();
  return hydrated ? scheme : 'light';
}
