import type { ReactNode } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Header } from './Header';
import { Screen } from './Screen';
import { Appear, Stagger } from './ui/Appear';
import { T } from './ui/T';

export const SETUP_PHASES = ['Account', 'About your child', 'Comfort', 'Link phone'] as const;

/**
 * Parent setup progress: four labelled phases (the progress bar, split into phases).
 * The current phase is blue and bold; done phases are blue; later ones grey — plus "Step n of 4" in words.
 */
export function SetupSteps({ phase, detail }: { phase: 0 | 1 | 2 | 3; detail?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }} accessible accessibilityLabel={`Step ${phase + 1} of 4: ${SETUP_PHASES[phase]}${detail ? `, ${detail}` : ''}`}>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {SETUP_PHASES.map((p, i) => (
          <View key={p} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: i <= phase ? c.primary : c.track }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="caption" color="brand" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
          {SETUP_PHASES[phase]}
        </T>
        {/* textSecondary: this sits top-right, over the background's brightest glow. */}
        <T v="caption" color="textSecondary">
          {detail ?? `Step ${phase + 1} of 4`}
        </T>
      </View>
    </View>
  );
}

/**
 * Page shell for parent setup & sign-in (P00–P08): richer branded background, back arrow, phase progress,
 * a character in a tinted circle beside the title, content, and a sticky action bar.
 */
export function SetupShell({
  phase,
  detail,
  face,
  tint,
  title,
  subtitle,
  children,
  footer,
  left = 'back',
  fallback,
}: {
  phase?: 0 | 1 | 2 | 3;
  detail?: string;
  face?: ImageSourcePropType;
  tint?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  left?: 'back' | 'none';
  fallback?: Parameters<typeof Header>[0]['fallback'];
}) {
  const { c } = useTheme();
  return (
    <Screen backdrop="brand" header={<Header left={left} getHelp={false} fallback={fallback ?? '/welcome'} />} footer={footer}>
      {phase !== undefined ? <SetupSteps phase={phase} detail={detail} /> : null}
      <Appear>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={{ flex: 1, gap: space.sm }}>
            <T v="title" header>
              {title}
            </T>
            {subtitle ? (
              <T v="body" color="textSecondary">
                {subtitle}
              </T>
            ) : null}
          </View>
          {face ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ width: 88, height: 88, borderRadius: radius.pill, backgroundColor: tint ?? c.bg, alignItems: 'center', justifyContent: 'center' }}
            >
              <Image source={face} resizeMode="contain" style={{ width: 62, height: 62 }} />
            </View>
          ) : null}
        </View>
      </Appear>
      <Stagger start={120}>{children}</Stagger>
    </Screen>
  );
}
