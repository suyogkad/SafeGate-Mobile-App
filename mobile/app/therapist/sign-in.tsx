/**
 * T00 Therapist sign in. The parent's sign-in layout (raised card with two labelled fields, sticky button; no collage:
 * the therapist side keeps illustrations to a minimum)
 * on the richer `brand` background. Demo: Priya's details are prefilled and any values are accepted.
 * No "Create an account": therapists join by invitation (registration and checks are out of scope).
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Wordmark } from '@/components/Wordmark';
import { Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { ApiError, OfflineError } from '@/lib/api';
import { therapistSignIn } from '@/lib/auth';
import { space } from '@/theme/tokens';

export default function TherapistSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await therapistSignIn(email.trim(), password);
      router.replace('/therapist/today');
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
    <Screen
      backdrop="brand"
      header={<Header left="back" getHelp={false} fallback="/welcome" right={<Wordmark size={22} />} />}
      footer={
        <View style={{ gap: space.sm }}>
          <Button title={busy ? 'Signing in…' : 'Sign in'} icon="arrow-right" disabled={!email || !password || busy} onPress={signIn} />
          <T v="bodySm" color="textMuted" center>
            Therapists join SafeGate by invitation.
          </T>
        </View>
      }
    >
      <Stagger>
        <View style={{ gap: space.sm }}>
          <T v="title" header>
            Sign in to your practice
          </T>
          <T v="body" color="textSecondary">
            See your sessions, your hours and what families have shared with you.
          </T>
        </View>
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ gap: space.lg }}>
            <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" leftIcon="mail" />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoComplete="password"
              leftIcon="lock"
              icon={show ? 'eye' : 'eye-off'}
              iconLabel={show ? 'Hide password' : 'Show password'}
              onIconPress={() => setShow((s) => !s)}
              onSubmitEditing={signIn}
            />
          </View>
        </Card>
        {error ? (
          <View accessibilityLiveRegion="polite">
            <T v="body" color="textSecondary">
              {error}
            </T>
          </View>
        ) : null}
      </Stagger>
    </Screen>
  );
}
