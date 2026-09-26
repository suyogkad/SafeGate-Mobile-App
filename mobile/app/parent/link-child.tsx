/**
 * P08 Link Alex's phone. A navy code card (character peeking in), numbered "How to link" rows, setup shell.
 * "Waiting for Alex's phone…" is still text: no spinner. The demo doesn't wait for the child.
 */
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Image, View } from 'react-native';
import { SetupShell } from '@/components/SetupShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { OfflineError } from '@/lib/api';
import { linkCodeFor } from '@/lib/auth';
import { useApp, useChildName } from '@/store/app';
import { artTints, fonts, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function LinkChild() {
  const { c } = useTheme();
  const name = useChildName();
  const [copied, setCopied] = useState(false);
  const childId = useApp((s) => s.childId);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Codes are short-lived and single-use, so one is fetched when the screen opens
  // and a fresh one replaces it on request (the old one stops working server-side).
  const fetchCode = useCallback(async () => {
    if (!childId) return;
    setBusy(true);
    setError(null);
    try {
      setCode((await linkCodeFor(childId)).code);
    } catch (e) {
      setError(
        e instanceof OfflineError
          ? "We couldn't reach SafeGate. Check your connection and try again."
          : "We couldn't make a code just now. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }, [childId]);

  useEffect(() => {
    void fetchCode();
  }, [fetchCode]);

  const display = code ? `${code.slice(0, 3)} ${code.slice(3)}` : '- - -   - - -';

  const steps = [`Open SafeGate on ${name}'s phone.`, "Tap 'I already have a code'.", `Read this code out to ${name}.`];

  return (
    <SetupShell
      phase={3}
      face={FACES.smilePillPink}
      tint={artTints.yellow}
      title={`Link ${name}'s phone`}
      subtitle={`${name} types this code once. That's all.`}
      fallback="/parent/home"
      footer={
        <Button
          title="Go to home"
          icon="arrow-right"
          onPress={() => {
            useApp.getState().signInParent();
            router.replace('/parent/home');
          }}
        />
      }
    >
      {/* Code card — navy panel */}
      <View style={{ backgroundColor: c.brand, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', gap: space.lg }}>
        <Image
          source={FACES.monocleWave}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ position: 'absolute', right: -40, top: -24, width: 116, height: 76, transform: [{ rotate: '-10deg' }] }}
        />
        <T v="bodySmMedium" color="onBrand">
          {name}'s code
        </T>
        <T
          accessibilityLabel={code ? `Code: ${code.split('').join(' ')}` : 'Making a code'}
          allowFontScaling={false}
          style={{ fontFamily: fonts.bold, fontSize: 40, lineHeight: 48, letterSpacing: 6, color: c.onBrand }}
        >
          {display}
        </T>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            title={copied ? 'Copied' : 'Copy'}
            size="small"
            variant="onBrand"
            iconLeft={copied ? 'check' : 'copy'}
            label="Copy the code"
            disabled={!code}
            onPress={async () => {
              if (!code) return;
              await Clipboard.setStringAsync(code).catch(() => {});
              setCopied(true);
            }}
          />
          <Button
            title={busy ? 'Making…' : 'New code'}
            size="small"
            variant="onBrand"
            iconLeft="refresh-cw"
            disabled={busy}
            onPress={() => {
              setCopied(false);
              void fetchCode();
            }}
          />
        </View>
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite">
          <T v="body" color="textSecondary">
            {error}
          </T>
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <T v="section" header>
          How to link
        </T>
        <Card tone="raised" padding={space.lg}>
          <View style={{ gap: space.lg }}>
            {steps.map((s, i) => (
              <View key={s} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="section" color="brand">
                    {i + 1}
                  </T>
                </View>
                <T v="bodyLg" style={{ flex: 1 }}>
                  {s}
                </T>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <Card tone="tint" padding={space.lg}>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Icon name="smartphone" size={20} color={c.brand} />
            <T v="bodyLg" color="brand">
              Waiting for {name}'s phone…
            </T>
          </View>
          <T v="bodySm" color="textSecondary">
            {name} never needs an email or a password.
          </T>
        </View>
      </Card>
    </SetupShell>
  );
}
