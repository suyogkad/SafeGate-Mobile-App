/**
 * P01 Create account. Title/subtitle, three labelled fields (password show/hide) and a block button, on the richer
 * `brand` background with setup progress and a character.
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SetupShell } from '@/components/SetupShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { ApiError, OfflineError } from '@/lib/api';
import { parentCreateAccount } from '@/lib/auth';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function CreateAccount() {
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const ready = !!name.trim() && !!email.trim() && password.length >= 8;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await parentCreateAccount(name.trim(), email.trim(), password);
      router.push('/parent/about-child?step=1');
    } catch (e) {
      setError(
        e instanceof OfflineError
          ? "We couldn't reach SafeGate. Check your connection and try again."
          : e instanceof ApiError
            ? e.message
            : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SetupShell
      phase={0}
      face={FACES.crownEgg}
      tint={artTints.yellow}
      title="Let's set up SafeGate"
      subtitle="You create the account. Your child never needs a password."
      footer={
        <View style={{ gap: space.xs }}>
          <Button title={busy ? 'Creating…' : 'Create account'} icon="arrow-right" disabled={!ready || busy} onPress={next} />
          <Button title="I already have an account" variant="text" style={{ alignSelf: 'center' }} onPress={() => router.replace('/parent/sign-in')} />
        </View>
      }
    >
      <Card tone="raised" r={24} padding={space.xl}>
        <View style={{ gap: space.lg }}>
          <Input label="Your name" placeholder="Your name" value={name} onChangeText={setName} autoComplete="name" leftIcon="user" />
          <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" leftIcon="mail" />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoComplete="new-password"
            leftIcon="lock"
            icon={show ? 'eye' : 'eye-off'}
            iconLabel={show ? 'Hide password' : 'Show password'}
            onIconPress={() => setShow((s) => !s)}
          />
          <T v="bodySm" color="textMuted">
            At least 8 characters.
          </T>
        </View>
      </Card>

      {error ? (
        <View accessibilityLiveRegion="polite">
          <T v="body" color="textSecondary">
            {error}
          </T>
        </View>
      ) : null}

      <Card tone="tint" padding={space.lg}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <Icon name="info" size={20} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            Next you'll add your child. Then you'll get a code to type into their phone.
          </T>
        </View>
      </Card>
    </SetupShell>
  );
}
