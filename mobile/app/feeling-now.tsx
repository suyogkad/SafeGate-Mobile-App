/**
 * C27 How are you feeling now? Three full-width choices, each with a character in a tinted circle.
 * Get help only: no back, close or tab bar. One tap sends; there is no Next.
 *   from=calm      (Calm me):   calmer → Home · same → Calm me · worse → Get help
 *   from=calmMode  (calm mode): calmer → Talk with the after-calm card · same → back to calm mode · worse → Get help
 * From calm mode it also shows the truthful line and the call card.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, View, type ImageSourcePropType } from 'react-native';
import { CallSomeoneCard } from '@/components/CallSomeoneCard';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui/Card';
import { FaceCircle } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { FACES } from '@/data/faces';
import { calmLead } from '@/lib/calmLead';
import { useApp } from '@/store/app';
import { moodColors, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Choice = { label: string; face: ImageSourcePropType; tint: string; go: () => void };

export default function FeelingNow() {
  const { c } = useTheme();
  const fromCalmMode = useLocalSearchParams<{ from?: string }>().from === 'calmMode';
  const calmMode = useApp((s) => s.calmMode);
  const emergency = useApp((s) => s.emergency);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const go = (href: Href, push = false) => (push ? router.push(href) : router.replace(href));

  const choices: Choice[] = [
    {
      label: 'A bit calmer',
      face: FACES.smileFlower,
      tint: moodColors.good.tint,
      go: () => {
        // Either way Alex did the calm steps, so Home's calm row gets its quiet "done".
        useApp.getState().markDone('calm');
        if (fromCalmMode) {
          useApp.getState().setAfterCalm(true);
          go('/talk');
        } else {
          go('/home');
        }
      },
    },
    {
      label: 'About the same',
      face: FACES.flatStarburst,
      tint: moodColors.ok.tint,
      go: () => go(fromCalmMode ? '/calm-mode' : '/calm'),
    },
    {
      label: 'Worse',
      face: FACES.frownHexagon,
      tint: moodColors.notGreat.tint,
      go: () => go('/get-help', true),
    },
  ];

  return (
    <Screen header={<Header left="none" />}>
      <T v="title" header>
        How are you feeling now?
      </T>

      <View style={{ gap: space.md }}>
        {choices.map((ch) => (
          <Tappable
            key={ch.label}
            label={ch.label}
            onPress={ch.go}
            style={{ backgroundColor: c.surface, borderRadius: radius.pill, padding: space.sm, paddingRight: space.xl }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <FaceCircle face={ch.face} tint={ch.tint} size={64} />
              <T v="heading" style={{ flex: 1 }}>
                {ch.label}
              </T>
              <Icon name="chevron-right" size={20} color={c.textMuted} />
            </View>
          </Tappable>
        ))}
      </View>

      {fromCalmMode ? (
        <>
          <Card tone="tint" padding={space.lg}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <Icon name="heart" size={22} color={c.brand} />
              <T v="bodyLg" color="brand" style={{ flex: 1 }}>
                {calmLead(calmMode, emergency)}
              </T>
            </View>
          </Card>
          <CallSomeoneCard />
        </>
      ) : null}
    </Screen>
  );
}
