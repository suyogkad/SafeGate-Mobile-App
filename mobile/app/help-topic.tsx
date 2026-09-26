/**
 * C25a Help topic. Title, intro, numbered steps, the call-someone card with this topic's contacts, and actions
 * (Let Jordan know, Calm me) on the help background.
 * "Let Jordan know" appears only where tellGrownUp is true: never on "Someone is hurting me".
 * Copy is placeholder (TODO(safegate) in src/data/helpTopics.ts) pending review.
 */
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { CallSomeoneCard } from '@/components/CallSomeoneCard';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { HELP_TOPICS, helpTopic } from '@/data/helpTopics';
import { PARENT } from '@/data/people';
import { useApp } from '@/store/app';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function HelpTopic() {
  const { c } = useTheme();
  const topic = helpTopic(useLocalSearchParams<{ id?: string }>().id ?? '') ?? HELP_TOPICS[0];
  const alreadyTold = useApp((s) => s.helpRequest === topic.chip);
  const [told, setTold] = useState(alreadyTold);

  return (
    <Screen backdrop="help" header={<Header title="Get help" getHelp={false} fallback="/get-help" />}>
      <Appear>
        <View style={{ gap: space.sm }}>
          <T v="caption" tint={c.onHelpTint} style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
            {topic.chip.toUpperCase()}
          </T>
          <T v="title" header>
            {topic.title}
          </T>
          <T v="bodyLg" color="textSecondary">
            {topic.intro}
          </T>
        </View>
      </Appear>

      <Card tone="raised" r={24} padding={space.lg}>
        <View style={{ gap: space.lg }}>
          {topic.steps.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: c.helpTint, alignItems: 'center', justifyContent: 'center' }}>
                <T v="section" tint={c.onHelpTint}>
                  {i + 1}
                </T>
              </View>
              <T v="bodyLg" style={{ flex: 1, paddingTop: 6 }}>
                {s}
              </T>
            </View>
          ))}
        </View>
      </Card>

      {topic.tellGrownUp ? (
        told ? (
          <Appear>
            <Card tone="raised" padding={space.lg}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" style={{ flex: 1 }}>
                  {PARENT.first} has been told. They may get in touch.
                </T>
              </View>
            </Card>
          </Appear>
        ) : (
          <Button
            title={`Let ${PARENT.first} know`}
            iconLeft="bell"
            onPress={() => {
              useApp.getState().requestHelp(topic.chip);
              setTold(true);
            }}
          />
        )
      ) : null}
      {topic.calm ? <Button title="Calm me" variant="outline" iconLeft="wind" onPress={() => router.push('/calm')} /> : null}

      <CallSomeoneCard contacts={topic.contacts} />
    </Screen>
  );
}
