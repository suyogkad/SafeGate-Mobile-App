/**
 * P14 Session notes. A header card (initials + name + meta), emoji highlight rows, the
 * "What <therapist> shared" paragraph, raised cards for "Things to try at home", and a
 * sticky action.
 *
 * These are the notes the therapist chose to share. They come from the family's own
 * endpoint, which has no working-notes field at all, so the therapist's private notes
 * can never appear here (rule 21). A session whose notes aren't shared yet says so --
 * nothing has gone wrong, the therapist simply hasn't written them.
 * ?id=<session id> (default: the newest shared notes).
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
import { contact } from '@/lib/call';
import { useFamilySessions, useSharedNotes } from '@/lib/family';
import { dayLabel, localDateIso } from '@/lib/schedule';
import { firstName, initialsOf } from '@/lib/time';
import { space } from '@/theme/tokens';

export default function SessionNotes() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sessions = useFamilySessions();

  // Without an id, show the newest notes the therapist has shared.
  const newestShared = sessions
    .filter((s) => s.notes_shared_at)
    .sort((a, b) => b.start_time.localeCompare(a.start_time))[0];
  const id = params.id || newestShared?.id;
  const session = sessions.find((s) => s.id === id) ?? newestShared;

  const { notes, loading } = useSharedNotes(id);
  // Only run a real name through firstName: "your therapist" would come back "your".
  const therapistFull = notes?.therapist_name ?? session?.therapist_name ?? null;
  const therapistFirst = (therapistFull && firstName(therapistFull)) || 'your therapist';
  const shared = !!notes;

  return (
    <Screen
      backdrop="brand"
      header={<Header title="Session notes" left="close" getHelp={false} fallback="/parent/sessions" />}
      footer={
        <Button
          title={`Send ${therapistFirst} a note`}
          variant="outline"
          iconLeft="send"
          onPress={() => contact('message', therapistFull ?? 'your therapist')}
        />
      }
    >
      <Appear>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar initials={initialsOf(therapistFull)} size={64} tone="brand" />
            <View style={{ flex: 1, gap: space.xs }}>
              <Badge label={shared ? 'NOTES SHARED' : 'NOTES COMING'} tone={shared ? 'success' : 'neutral'} />
              <T v="heading" header>
                Notes from {therapistFirst}
              </T>
              {session ? (
                <T v="bodySm" color="textMuted">
                  {dayLabel(localDateIso(new Date(session.start_time))).replace(/^(\w+) /, '$1, ')} ·{' '}
                  {session.meeting_kind === 'video' ? 'Video call' : 'In person'}
                </T>
              ) : null}
            </View>
          </View>
        </Card>
      </Appear>

      {loading ? (
        <Card tone="raised" r={24} padding={space.xl}>
          <T v="bodyLg" color="textSecondary">
            Loading…
          </T>
        </Card>
      ) : notes ? (
        <>
          {notes.highlights.length ? (
            <View style={{ gap: space.md }}>
              <T v="section" header>
                Highlights
              </T>
              <Highlights items={notes.highlights} />
            </View>
          ) : null}
          {notes.shared ? (
            <View style={{ gap: space.md }}>
              <T v="section" header>
                What {therapistFirst} shared
              </T>
              <SharedMessage text={notes.shared} />
            </View>
          ) : null}
          {notes.try_at_home.length ? (
            <View style={{ gap: space.md }}>
              <T v="section" header>
                Things to try at home
              </T>
              <TryAtHome items={notes.try_at_home} />
            </View>
          ) : null}
        </>
      ) : (
        <Card tone="raised" r={24} padding={space.xl}>
          <T v="bodyLg" color="textSecondary">
            {session
              ? `${therapistFirst} will share notes from this session here. You’ll see them as soon as they do.`
              : 'Notes from your sessions will show here.'}
          </T>
        </Card>
      )}
    </Screen>
  );
}
