import { View } from 'react-native';
import type { SessionNotes } from '../data/practice';
import { space } from '../theme/tokens';
import { Highlights, SharedMessage, TryAtHome, WorkingNotesCard } from './NotesParts';
import { SectionHeader } from './ui/bits';
import { Badge } from './ui/Badge';
import { T } from './ui/T';

/**
 * Written notes on the therapist's Session screen, in their two parts: what the family sees (exactly as the parent's
 * Session notes shows it) and the working notes only the therapist sees.
 */
export function NotesPreview({ notes, parentFirst, name }: { notes: SessionNotes; parentFirst: string; name: string }) {
  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.md }}>
        <SectionHeader title={`Shared with ${parentFirst}`} />
        {notes.sharedAt ? <Badge label={`${parentFirst.toUpperCase()} CAN SEE THIS · SHARED ${notes.sharedAt.toUpperCase()}`} tone="success" /> : <Badge label="DRAFT · NOT SHARED YET" tone="neutral" />}
        {notes.highlights.length ? <Highlights items={notes.highlights} /> : null}
        {notes.shared ? <SharedMessage text={notes.shared} /> : null}
        {notes.tryAtHome.length ? (
          <>
            <T v="section" header>
              Things to try at home
            </T>
            <TryAtHome items={notes.tryAtHome} />
          </>
        ) : null}
      </View>
      <View style={{ gap: space.md }}>
        <SectionHeader title="My working notes" />
        <WorkingNotesCard parentFirst={parentFirst} name={name}>
          <T v="body">{notes.working || 'Nothing written.'}</T>
        </WorkingNotesCard>
      </View>
    </View>
  );
}
