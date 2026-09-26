/**
 * C04 Link my phone. Title, six code boxes over one real input, step dashes (1 of 2), and Link my phone.
 * A wrong code is calm: info icon, no red, no shake.
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { StepDashes } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { OfflineError } from '@/lib/api';
import { childLink } from '@/lib/auth';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function LinkPhone() {
  const { c } = useTheme();
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = code.length === 6;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setWrong(null);
    try {
      // The server checks the code; it works once and expires in minutes.
      await childLink(code.toUpperCase());
      router.replace('/how-it-works');
    } catch (e) {
      // Calm wording, no red, no codes (rule 15).
      setWrong(
        e instanceof OfflineError
          ? "I can't reach SafeGate right now. Ask your grown-up to check the internet, then try again."
          : "That code didn't work. Check each letter with your grown-up and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<Header fallback="/welcome" />}
      footer={<Button title={busy ? 'Linking…' : 'Link my phone'} disabled={!ready || busy} onPress={submit} />}
    >
      <StepDashes step={1} total={2} />

      <View style={{ gap: space.sm }}>
        <T v="title" header>
          Let's link your phone
        </T>
        <T v="bodyLg" color="textMuted">
          Type the 6 letters and numbers your grown-up gives you.
        </T>
      </View>

      <View style={{ gap: space.md }}>
        <T v="label">Your code</T>
        <CodeInput
          label="Your code, 6 letters and numbers"
          value={code}
          onChange={(v) => {
            setCode(v);
            setWrong(null);
          }}
          onSubmit={submit}
        />
        {wrong ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Icon name="info" size={20} color={c.brand} />
            <T v="body" color="textSecondary" style={{ flex: 1 }}>
              {wrong}
            </T>
          </View>
        ) : null}
      </View>

      <T v="bodySm" color="textMuted">
        Your grown-up gets this code when they set up your account. Ask them to read it out.
      </T>
    </Screen>
  );
}
