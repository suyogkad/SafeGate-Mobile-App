/**
 * P00 Sign in. Two labelled fields (password show/hide), a block button and a link to Create account, with the
 * Welcome collage and the richer `brand` background. Demo: prefilled, any values accepted.
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { FaceCollage } from '@/components/FaceCollage';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Wordmark } from '@/components/Wordmark';
import { Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { ApiError, OfflineError } from '@/lib/api';
import { parentSignIn } from '@/lib/auth';
import { useChildName } from '@/store/app';
import { space } from '@/theme/tokens';

export default function SignIn() {
  const name = useChildName();
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
      await parentSignIn(email.trim(), password);
      router.replace('/parent/home');
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
        <View style={{ gap: space.xs }}>
          <Button title={busy ? 'Signing in…' : 'Sign in'} icon="arrow-right" disabled={!email || !password || busy} onPress={signIn} />
          <Button title="Create an account" variant="text" style={{ alignSelf: 'center' }} onPress={() => router.replace('/parent/create-account')} />
        </View>
      }
    >
      <Stagger>
        <FaceCollage height={150} />
        <View style={{ gap: space.sm }}>
          <T v="title" header>
            Welcome back
          </T>
          <T v="body" color="textSecondary">
            Sign in to see how {name} is doing.
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
