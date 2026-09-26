/**
 * P18 A chat, read-only. A summary card (kind, day/time, character circle), the Talk page layout (Conversation:
 * companion navy, child plain, companion card), brand background. "Share with Priya" sits in the sticky bar (easier to
 * reach than a small header action).
 * Calm version: the conversation stops at the divider (nothing from the AI after it) with "Concern: High"
 * (parent-only). No composer, no Answer button. ?id=live builds "Today" from this session's store.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Conversation } from '@/components/Conversation';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FaceCircle } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { THERAPIST } from '@/data/people';
import { KIND_ART, KIND_TAG, transcript, type Transcript } from '@/data/transcripts';
import { liveSections, type LiveSection } from '@/lib/liveTranscript';
import { useApp, useChildName } from '@/store/app';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Section = { kind: Transcript['kind']; day: string; time: string; lines: LiveSection['lines']; calmDivider?: string };

export default function TranscriptScreen() {
  const { c } = useTheme();
  const name = useChildName();
  const id = useLocalSearchParams<{ id?: string }>().id ?? 'live';
  const messages = useApp((s) => s.messages);
  const journal = useApp((s) => s.journal);
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);

  let sections: Section[];
  if (id === 'live') {
    sections = liveSections({ messages, journal, calmMode, calmAt }).map((s) => ({
      kind: s.calmDivider !== undefined ? 'calm' : s.kind,
      day: 'Today',
      time: s.time,
      lines: s.lines,
      calmDivider: s.calmDivider,
    }));
  } else {
    const t = transcript(id);
    sections = t ? [{ kind: t.kind, day: t.day, time: t.time, lines: t.lines, calmDivider: t.calmDivider }] : [];
  }

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`${name}'s chat`} getHelp={false} fallback="/parent/chats" />}
      footer={<Button title={`Share with ${THERAPIST.first}`} variant="outline" iconLeft="send" onPress={() => router.push('/parent/share')} />}
    >
      <Card tone="tint" padding={space.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="eye" size={18} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            You're reading {name}'s chat. {name} knows you can read it.
          </T>
        </View>
      </Card>

      {sections.length === 0 ? (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <FaceCircle face={FACES.monocleWave} tint={artTints.blue} size={80} />
            <T v="bodyLg" color="textSecondary" center>
              Nothing from today yet.
            </T>
          </View>
        </Card>
      ) : (
        <Stagger>
          {sections.map((s, i) => {
            const art = KIND_ART[s.kind];
            return (
              <View key={i} style={{ gap: space.md }}>
                {/* Summary header — check-in card */}
                <Card tone="raised" r={24} padding={space.lg}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1, gap: space.xs }}>
                      <Badge label={KIND_TAG[s.kind]} tone={s.kind === 'calm' ? 'warn' : 'info'} />
                      <T v="heading" header>
                        {s.day}
                      </T>
                      <T v="bodySm" color="textMuted">
                        {s.time}
                      </T>
                    </View>
                    <FaceCircle face={FACES[art.face]} tint={artTints[art.tint]} size={72} />
                  </View>
                </Card>

                {/* The conversation, page-like, read-only */}
                <Card tone="raised" r={24} padding={space.xl}>
                  <Conversation
                    lines={s.lines}
                    childLabel={name}
                    footer={
                      s.calmDivider !== undefined ? (
                        <View style={{ gap: space.md, marginTop: space.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: c.track }} />
                            <T v="caption" color="textMuted">
                              Calm steps started here · {s.calmDivider}
                            </T>
                            <View style={{ flex: 1, height: 1, backgroundColor: c.track }} />
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
                            <T v="bodySm" color="textSecondary">
                              Concern:
                            </T>
                            <Badge label="High" tone="warn" />
                          </View>
                          <T v="bodySm" color="textMuted" center>
                            The AI companion was switched off here. {name} saw calm steps and phone numbers for help.
                          </T>
                        </View>
                      ) : null
                    }
                  />
                </Card>
              </View>
            );
          })}
        </Stagger>
      )}
    </Screen>
  );
}
