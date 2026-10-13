/**
 * P18 A chat, read-only. A summary card, then the conversation in the Talk layout.
 * No composer, no Answer button.
 *
 * The real exchanges from the conversation log: what the child wrote and what the
 * companion said back. The child is told their grown-up can read this (rule 3), and the
 * banner says the same thing to the parent.
 *
 * A flagged message is where the AI was switched off. The divider says so, with the
 * concern level — **parent side only**: the child's app is never told a level (rule 5).
 *
 * ?day=YYYY-MM-DD (defaults to the most recent day with anything in it).
 */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Conversation, type ConvLine } from '@/components/Conversation';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FaceCircle } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import type { ApiConversationTurn } from '@/api/family';
import { useChildChats, useMyChild } from '@/lib/family';
import { localDateIso, todayIso } from '@/lib/schedule';
import { clockOf } from '@/lib/time';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const DAY = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** The turns of one day as conversation lines, in the order they happened. */
function linesOf(turns: ApiConversationTurn[]): ConvLine[] {
  const lines: ConvLine[] = [];
  for (const t of turns) {
    if (t.child_message) lines.push({ id: `${t.id}-c`, from: 'me', text: t.child_message });
    if (t.reply) lines.push({ id: `${t.id}-r`, from: 'companion', text: t.reply });
  }
  return lines;
}

export default function TranscriptScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ day?: string }>();
  const child = useMyChild();
  const name = child?.full_name || 'your child';
  const { turns, loading } = useChildChats(child?.id);

  const byDay = new Map<string, ApiConversationTurn[]>();
  for (const t of turns) {
    const day = localDateIso(new Date(t.timestamp));
    byDay.set(day, [...(byDay.get(day) ?? []), t]);
  }
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
  const day = params.day && byDay.has(params.day) ? params.day : days[0];
  const items = day ? (byDay.get(day) ?? []) : [];

  // Everything up to and including the first flagged message. After that the AI was
  // switched off, so there is nothing of its to show.
  const flaggedAt = items.findIndex((t) => t.flagged);
  const upToCalm = flaggedAt >= 0 ? items.slice(0, flaggedAt + 1) : items;
  const calm = flaggedAt >= 0;
  const calmTime = calm ? clockOf(items[flaggedAt].timestamp) : null;
  const urgent = calm && items[flaggedAt].risk_level === 'urgent';
  const lines = linesOf(upToCalm);

  return (
    <Screen backdrop="brand" header={<Header title={`${name}'s chat`} getHelp={false} fallback="/parent/chats" />}>
      <Card tone="tint" padding={space.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="eye" size={18} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            You’re reading {name}’s chat. {name} knows you can read it.
          </T>
        </View>
      </Card>

      {lines.length === 0 ? (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <FaceCircle face={FACES.monocleWave} tint={artTints.blue} size={80} />
            <T v="bodyLg" color="textSecondary" center>
              {loading ? 'Loading…' : `Nothing from ${name} yet.`}
            </T>
          </View>
        </Card>
      ) : (
        <Stagger>
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: space.xs }}>
                <Badge label={calm ? 'CALM STEPS' : 'TALK'} tone={calm ? 'warn' : 'info'} />
                <T v="heading" header>
                  {day === todayIso() ? 'Today' : day ? DAY.format(new Date(`${day}T12:00:00`)) : ''}
                </T>
                <T v="bodySm" color="textMuted">
                  {clockOf(items[0].timestamp)} – {clockOf(items[items.length - 1].timestamp)}
                </T>
              </View>
              <FaceCircle
                face={calm ? FACES.calmHexagon : FACES.monocleWave}
                tint={calm ? artTints.cyan : artTints.blue}
                size={72}
              />
            </View>
          </Card>

          <Card tone="raised" r={24} padding={space.xl}>
            <Conversation
              lines={lines}
              childLabel={name}
              footer={
                calm ? (
                  <View style={{ gap: space.md, marginTop: space.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: c.track }} />
                      <T v="caption" color="textMuted">
                        Calm steps started here · {calmTime}
                      </T>
                      <View style={{ flex: 1, height: 1, backgroundColor: c.track }} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
                      <T v="bodySm" color="textSecondary">
                        Concern:
                      </T>
                      <Badge label={urgent ? 'High' : 'Medium'} tone={urgent ? 'warn' : 'neutral'} />
                    </View>
                    <T v="bodySm" color="textMuted" center>
                      The AI companion was switched off here. {name} saw calm steps and phone numbers for help.
                    </T>
                  </View>
                ) : null
              }
            />
          </Card>
        </Stagger>
      )}
    </Screen>
  );
}
