import { Host, Picker } from '@expo/ui';
import { useState } from 'react';

import { AppText, Button, Card, ErrorMessage, Screen } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useApp } from '@/lib/app-provider';

export function SettingsScreen() {
  const { state, services } = useApp();
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your change. Please retry.'); }
    finally { setBusy(false); }
  };
  const data = state.data;
  if (!data) return null;
  return <Screen title="Your training space" subtitle="Keep it simple. Make it yours.">
    <Card><AppText variant="heading">Weight units</AppText><AppText color={p.textSecondary}>Change how loads are displayed. Your underlying weights stay the same.</AppText><Host matchContents={{ vertical: true }} seedColor={p.accent} style={{ minHeight: 48 }}><Picker selectedValue={data.preferences.weightUnit} enabled={!busy} onValueChange={(unit) => void run(() => services.preferences.setWeightUnit(unit))}><Picker.Item label="Kilograms (kg)" value="kg" /><Picker.Item label="Pounds (lb)" value="lb" /></Picker></Host></Card>
    <Card><AppText variant="heading">Demo account</AppText><AppText>{data.session?.email}</AppText><AppText variant="caption" color={p.textSecondary}>This is a simulated account. All demo identities share this device’s saved training data.</AppText><Button label="Sign out" variant="secondary" disabled={busy} onPress={() => void run(() => services.auth.signOut())} /></Card>
    <Card><AppText variant="heading">Start fresh</AppText><AppText color={p.textSecondary}>Restore example routines and remove workouts, active sessions, and progression.</AppText>{confirmReset ? <><AppText>Reset all demo data? Units return to kg. You will stay signed in. This cannot be undone.</AppText><Button label="Reset all demo data" variant="danger" loading={busy} onPress={() => void run(async () => { await services.demo.reset(); setConfirmReset(false); setMessage('Demo data restored. Your next session is a fresh start.'); })} /><Button label="Keep my data" variant="secondary" disabled={busy} onPress={() => setConfirmReset(false)} /></> : <Button label="Reset demo data" variant="danger" disabled={busy} onPress={() => setConfirmReset(true)} />}</Card>
    {error ? <ErrorMessage message={error} /> : null}{message ? <AppText>{message}</AppText> : null}
    {__DEV__ ? <Card><AppText variant="heading">Development tools</AppText><AppText variant="caption">Trigger one predictable service failure to check retry states. Restart clears pending simulated failures.</AppText><Button label="Fail next service operation" variant="secondary" onPress={() => { services.demo.failNext(); setMessage('The next mock service operation will fail once.'); }} /></Card> : null}
    <AppText variant="caption" color={p.textSecondary}>Onefold · Local demo · No network synchronization</AppText>
  </Screen>;
}
