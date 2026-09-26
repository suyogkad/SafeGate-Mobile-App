/**
 * C15 Calm me. Filter chips and activity cards (ActivityBand: tint + character + "N STEPS", then title and one line).
 * ?filter= preselects a filter (Explore → Sounds opens "Too loud"). No ratings, timers, locks or "premium".
 */
import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { ActivityBand } from '@/components/ActivityBand';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { CALM_ACTIVITIES, CALM_FILTERS, type CalmFilter } from '@/data/calm';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function CalmMe() {
  const { c } = useTheme();
  const param = useLocalSearchParams<{ filter?: string }>().filter;
  const [filter, setFilter] = useState<CalmFilter>(CALM_FILTERS.includes(param as CalmFilter) ? (param as CalmFilter) : 'Slow down');
  const list = CALM_ACTIVITIES.filter((a) => a.filters.includes(filter));

  return (
    <Screen header={<Header title="Calm me" fallback="/home" />}>
      <T v="bodyLg" color="textSecondary">
        Short steps you can do any time.
      </T>

      <ChipRow>
        {CALM_FILTERS.map((f) => (
          <Chip key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />
        ))}
      </ChipRow>

      <View style={{ gap: space.lg }} key={filter}>
        <Stagger>
          {list.map((a) => (
            <Tappable
              key={a.id}
              label={`${a.title}. ${a.steps.length} steps. ${a.description}`}
              onPress={() => router.push(`/calm-activity?id=${a.id}` as Href)}
              style={{ backgroundColor: c.bg, borderRadius: radius.panel, ...shadow.lift }}
            >
              <ActivityBand activity={a} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
                <View style={{ flex: 1, gap: space.xs }}>
                  <T v="heading">{a.title}</T>
                  <T v="body" color="textSecondary">
                    {a.description}
                  </T>
                </View>
                <Icon name="chevron-right" size={22} color={c.textMuted} />
              </View>
            </Tappable>
          ))}
        </Stagger>
      </View>
    </Screen>
  );
}
