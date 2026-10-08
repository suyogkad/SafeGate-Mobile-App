/**
 * T08 Write session notes, in two clearly separate parts (rule 21):
 *  - "Shared with <parent>" (marked <PARENT> WILL SEE THIS): up to 3 highlights (a picture + one line),
 *    "What I'd like <parent> to know", up to 3 things to try at home. This becomes the parent's Session notes.
 *  - "My working notes" (grey, with a lock): only the therapist sees them; the family and the child never do.
 *
 * The separation is the server's, not this screen's: the family's endpoint has no
 * working-notes field at all, and nothing reaches them until Share is tapped. Save
 * draft keeps everything for later without sharing any of it.
 * ?session=<session id>
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { goBack, Header } from '@/components/Header';
import { EmojiCircle, NumberCircle, WorkingNotesCard } from '@/components/NotesParts';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { SectionHeader } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import type { SessionNotesDraft } from '@/api/therapist';
import { useClients } from '@/lib/clients';
import { dayShort, localDateIso } from '@/lib/schedule';
import { draftOf, useSession, useSessionNotes } from '@/lib/therapist';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Pictures a highlight can have (tap to change). */
const PICTURES = ['⭐', '🦶', '🏫', '💬', '🧩', '🌿', '🎨', '📝'];

/** An empty row each, so the form starts ready to type into. */
const blank = (d: SessionNotesDraft): SessionNotesDraft => ({
  ...d,
  highlights: d.highlights.length ? d.highlights : [{ emoji: '⭐', text: '' }],
  try_at_home: d.try_at_home.length ? d.try_at_home : [{ title: '', line: '' }],
});

export default function WriteNotes() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ session?: string }>();
  const { session } = useSession(params.session);
  const { notes, loading, save, share } = useSessionNotes(params.session);
  const clients = useClients();

  const [d, setD] = useState<SessionNotesDraft>(() => blank(draftOf(null)));
  const [started, setStarted] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill the form once, when what is already written arrives: refilling it later
  // would throw away whatever the therapist had typed in the meantime.
  useEffect(() => {
    if (!started && notes) {
      setD(blank(draftOf(notes)));
      setStarted(true);
    }
  }, [notes, started]);

  const name = session?.child_name ?? 'this child';
  const parentFirst = clients.find((cl) => cl.id === session?.child_id)?.parentFirst || 'the family';
  const when = session ? dayShort(localDateIso(new Date(session.start_time))) : '';
  const alreadyShared = !!notes?.shared_at;
  const back = `/therapist/session?id=${params.session ?? ''}` as Href;

  const clean = (x: SessionNotesDraft): SessionNotesDraft => ({
    highlights: x.highlights.map((h) => ({ ...h, text: h.text.trim() })).filter((h) => h.text),
    shared: x.shared.trim(),
    try_at_home: x.try_at_home.map((t) => ({ title: t.title.trim(), line: t.line.trim() })).filter((t) => t.title),
    working: x.working.trim(),
  });
  const edit = (patch: Partial<SessionNotesDraft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(null);
  };

  const askToShare = () => {
    const x = clean(d);
    if (!x.highlights.length && !x.shared && !x.try_at_home.length) {
      setError(`Add a highlight or a few words for ${parentFirst} first.`);
      return;
    }
    setConfirm(true);
  };

  const doShare = async () => {
    setBusy(true);
    const failed = await share(clean(d));
    setBusy(false);
    setConfirm(false);
    if (failed) {
      setError(failed);
      return;
    }
    router.replace(back);
  };

  const saveDraft = async () => {
    setBusy(true);
    const failed = await save(clean(d));
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    goBack(back);
  };

  if (!session && !loading) {
    return (
      <Screen backdrop="brand" header={<Header title="Notes" left="close" getHelp={false} fallback="/therapist/calendar" />}>
        <Card tone="raised" padding={space.lg}>
          <T v="bodyLg" color="textSecondary">
            This session isn’t on your calendar any more.
          </T>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      backdrop="brand"
      header={<Header title={when ? `Notes · ${when}` : 'Notes'} left="close" getHelp={false} fallback={back} />}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? (
            <T v="bodySm" color="onWarnTint" accessibilityLiveRegion="polite">
              {error}
            </T>
          ) : null}
          <Button
            title={alreadyShared ? 'Share the changes' : `Share with ${parentFirst}`}
            icon="send"
            disabled={busy}
            onPress={askToShare}
          />
          <Button
            title={alreadyShared ? 'Save without sharing the changes' : 'Save draft'}
            variant="text"
            style={{ alignSelf: 'center' }}
            disabled={busy}
            onPress={saveDraft}
          />
        </View>
      }
    >
      <Stagger>
        <Card tone="tint" padding={space.lg}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Icon name="info" size={18} color={c.brand} />
            <T v="bodySm" color="brand" style={{ flex: 1 }}>
              Write for {parentFirst}: plain words, no scores.
            </T>
          </View>
        </Card>

        <View style={{ gap: space.md }}>
          <SectionHeader title={`Shared with ${parentFirst}`} />
          <Badge label={`${parentFirst.toUpperCase()} WILL SEE THIS`} tone="brand" />
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ gap: space.lg }}>
              <View style={{ gap: space.sm }}>
                <T v="label">Highlights</T>
                {d.highlights.map((h, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Tappable
                      label={`Picture for highlight ${i + 1}: ${h.emoji}. Change`}
                      visualHeight={48}
                      onPress={() =>
                        edit({
                          highlights: d.highlights.map((x, j) =>
                            j === i ? { ...x, emoji: PICTURES[(PICTURES.indexOf(x.emoji) + 1) % PICTURES.length] } : x,
                          ),
                        })
                      }
                    >
                      <EmojiCircle emoji={h.emoji} i={i} />
                    </Tappable>
                    <View style={{ flex: 1 }}>
                      <Input
                        a11yLabel={`Highlight ${i + 1}`}
                        placeholder="Practised feet on the floor"
                        value={h.text}
                        onChangeText={(v) => edit({ highlights: d.highlights.map((x, j) => (j === i ? { ...x, text: v } : x)) })}
                      />
                    </View>
                    {d.highlights.length > 1 ? (
                      <IconButton
                        icon="x"
                        label={`Remove highlight ${i + 1}`}
                        variant="plain"
                        onPress={() => edit({ highlights: d.highlights.filter((_, j) => j !== i) })}
                      />
                    ) : null}
                  </View>
                ))}
                {d.highlights.length < 3 ? (
                  <Button
                    title="Add a highlight"
                    variant="text"
                    iconLeft="plus"
                    onPress={() =>
                      edit({ highlights: [...d.highlights, { emoji: PICTURES[d.highlights.length % PICTURES.length], text: '' }] })
                    }
                  />
                ) : null}
              </View>

              <Input
                label={`What I’d like ${parentFirst} to know`}
                area
                multiline
                placeholder={`How ${name} got on, in a few short sentences.`}
                value={d.shared}
                onChangeText={(v) => edit({ shared: v })}
                style={{ minHeight: 120 }}
              />

              <View style={{ gap: space.sm }}>
                <T v="label">Things to try at home</T>
                {d.try_at_home.map((t, i) => (
                  <Card key={i} tone="outlined" padding={space.md}>
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                      <View style={{ paddingTop: space.sm }}>
                        <NumberCircle n={i + 1} />
                      </View>
                      <View style={{ flex: 1, gap: space.sm }}>
                        <Input
                          a11yLabel={`Thing to try ${i + 1}: title`}
                          placeholder="Same order every morning"
                          value={t.title}
                          onChangeText={(v) => edit({ try_at_home: d.try_at_home.map((x, j) => (j === i ? { ...x, title: v } : x)) })}
                        />
                        <Input
                          a11yLabel={`Thing to try ${i + 1}: one line`}
                          placeholder="One short line about how"
                          value={t.line}
                          onChangeText={(v) => edit({ try_at_home: d.try_at_home.map((x, j) => (j === i ? { ...x, line: v } : x)) })}
                        />
                      </View>
                      {d.try_at_home.length > 1 ? (
                        <IconButton
                          icon="x"
                          label={`Remove thing to try ${i + 1}`}
                          variant="plain"
                          onPress={() => edit({ try_at_home: d.try_at_home.filter((_, j) => j !== i) })}
                        />
                      ) : null}
                    </View>
                  </Card>
                ))}
                {d.try_at_home.length < 3 ? (
                  <Button
                    title="Add something to try"
                    variant="text"
                    iconLeft="plus"
                    onPress={() => edit({ try_at_home: [...d.try_at_home, { title: '', line: '' }] })}
                  />
                ) : null}
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="My working notes" />
          <WorkingNotesCard parentFirst={parentFirst} name={name}>
            <Input
              a11yLabel="My working notes. Only you can see these."
              area
              multiline
              placeholder="Your own notes"
              value={d.working}
              onChangeText={(v) => edit({ working: v })}
              style={{ minHeight: 120 }}
            />
          </WorkingNotesCard>
        </View>
      </Stagger>

      <Dialog
        visible={confirm}
        onClose={() => setConfirm(false)}
        title={alreadyShared ? `Share the changes with ${parentFirst}?` : `Share these notes with ${parentFirst}?`}
      >
        <T v="body" color="textSecondary" center>
          {parentFirst} can read them in Session notes. Your working notes stay with you.
        </T>
        <Button title="Share" icon="send" disabled={busy} onPress={doShare} />
        <Button title="Not yet" variant="outline" onPress={() => setConfirm(false)} />
      </Dialog>
    </Screen>
  );
}
