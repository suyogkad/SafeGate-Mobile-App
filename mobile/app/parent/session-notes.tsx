/**
 * P14 Session notes. A header card (initials + name + meta), emoji highlight rows, the "What Priya shared"
 * paragraph, raised cards for "Things to try at home", and a sticky action. "Send Priya a note" is a demo alert.
 * The notes are the part the therapist shared (Write notes, rule 21); the therapist's working notes never show here.
 * ?id=<session> (default: the newest shared notes). A session whose notes aren't shared yet says so.
 */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Highlights, SharedMessage, TryAtHome } from '@/components/NotesParts';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { T } from '@/components/ui/T';
import { THERAPIST } from '@/data/people';
import { ALEX_PAST } from '@/data/practice';
import { contact } from '@/lib/call';
import { latestSharedId } from '@/lib/clients';
import { dayLabel } from '@/lib/schedule';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';

/** Older links used the first demo id for the Tue 6 Oct notes. */
const ALIASES: Record<string, string> = { sep16: 'oct6', sep4: 'sep24' };

export default function SessionNotes() {
  const params = useLocalSearchParams<{ id?: string }>();
  const notes = useApp((s) => s.sessionNotes);
  const id = (params.id && (ALIASES[params.id] ?? params.id)) || latestSharedId(notes) || 'oct6';
  const session = ALEX_PAST.find((b) => b.id === id) ?? ALEX_PAST[1];
  const n = notes[id];
  const shared = !!n?.sharedAt;

  return (
    <Screen
      backdrop="brand"
      header={<Header title="Session notes" left="close" getHelp={false} fallback="/parent/sessions" />}
      footer={<Button title={`Send ${THERAPIST.first} a note`} variant="outline" iconLeft="send" onPress={() => contact('message', THERAPIST.name)} />}
    >
      <Appear>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar initials={THERAPIST.initials} size={64} tone="brand" />
            <View style={{ flex: 1, gap: space.xs }}>
              <Badge label={shared ? 'NOTES SHARED' : 'NOTES COMING'} tone={shared ? 'success' : 'neutral'} />
              <T v="heading" header>
                Notes from {THERAPIST.first}
              </T>
              <T v="bodySm" color="textMuted">
                {dayLabel(session.date).replace(/^(\w+) /, '$1, ')} · {session.kind}
              </T>
            </View>
          </View>
        </Card>
      </Appear>

      {shared && n ? (
        <>
          {n.highlights.length ? (
            <View style={{ gap: space.md }}>
              <T v="section" header>
                Highlights
              </T>
              <Highlights items={n.highlights} />
            </View>
          ) : null}
          {n.shared ? (
            <View style={{ gap: space.md }}>
              <T v="section" header>
                What {THERAPIST.first} shared
              </T>
              <SharedMessage text={n.shared} />
            </View>
          ) : null}
          {n.tryAtHome.length ? (
            <View style={{ gap: space.md }}>
              <T v="section" header>
                Things to try at home
              </T>
              <TryAtHome items={n.tryAtHome} />
            </View>
          ) : null}
        </>
      ) : (
        <Card tone="raised" r={24} padding={space.xl}>
          <T v="bodyLg" color="textSecondary">
            {THERAPIST.first} will share notes from this session here. You’ll get a notification when they’re ready.
          </T>
        </Card>
      )}
    </Screen>
  );
}
