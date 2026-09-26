/**
 * T08 Write session notes. The parent's Session notes laid out as a form, in two clearly separate parts (rule 21):
 *  - "Shared with Jordan" (marked JORDAN WILL SEE THIS): up to 3 highlights (a picture + one line), "What I'd like
 *    Jordan to know", up to 3 things to try at home. This becomes the parent's Session notes.
 *  - "My working notes" (grey, with a lock): only the therapist sees them; the family and the child never do.
 * A hint keeps the shared part plain ("Write for Jordan: plain words, no scores"). Share asks first, then tells the
 * parent (a notification) and clears "Write notes for Alex". Save draft keeps it for later without sharing.
 * Once shared, changes are shared again with "Share the changes"; working notes can be saved on their own.
 * ?session=<booking id>
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
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
import { ALEX_PAST, CLIENTS, type SessionNotes } from '@/data/practice';
import { dayShort } from '@/lib/schedule';
import { useApp, useChildName } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Pictures a highlight can have (tap to change). */
const PICTURES = ['⭐', '🦶', '🏫', '💬', '🧩', '🌿', '🎨', '📝'];

type Draft = Omit<SessionNotes, 'sharedAt'>;

export default function WriteNotes() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ session?: string }>();
  const session = ALEX_PAST.find((b) => b.id === params.session) ?? ALEX_PAST[0];
  const saved = useApp((s) => s.sessionNotes[session.id]);
  const name = useChildName();
  const parentFirst = CLIENTS.alex.parentFirst;
  const when = dayShort(session.date);

  const [d, setD] = useState<Draft>(() =>
    saved
      ? { highlights: saved.highlights, shared: saved.shared, tryAtHome: saved.tryAtHome, working: saved.working }
      : { highlights: [{ emoji: '⭐', text: '' }], shared: '', tryAtHome: [{ title: '', line: '' }], working: '' },
  );
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyShared = !!saved?.sharedAt;

  const clean = (x: Draft): Draft => ({
    highlights: x.highlights.map((h) => ({ ...h, text: h.text.trim() })).filter((h) => h.text),
    shared: x.shared.trim(),
    tryAtHome: x.tryAtHome.map((t) => ({ title: t.title.trim(), line: t.line.trim() })).filter((t) => t.title),
    working: x.working.trim(),
  });
  const edit = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(null);
  };

  const askToShare = () => {
    const x = clean(d);
    if (!x.highlights.length && !x.shared) {
      setError(`Add a highlight or a few words for ${parentFirst} first.`);
      return;
    }
    setConfirm(true);
  };
  const share = () => {
    useApp.getState().saveNotes(session.id, clean(d), true, when);
    setConfirm(false);
    router.replace(`/therapist/session?id=${session.id}` as Href);
  };
  const saveDraft = () => {
    // Once shared, only the working notes change here: the family's part changes only with "Share the changes".
    const x = clean(d);
    useApp.getState().saveNotes(session.id, alreadyShared && saved ? { ...saved, working: x.working } : x, false, when);
    goBack(`/therapist/session?id=${session.id}` as Href);
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`Notes · ${when}`} left="close" getHelp={false} fallback={`/therapist/session?id=${session.id}` as Href} />}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? (
            <T v="bodySm" color="onWarnTint" accessibilityLiveRegion="polite">
              {error}
            </T>
          ) : null}
          <Button title={alreadyShared ? 'Share the changes' : `Share with ${parentFirst}`} icon="send" onPress={askToShare} />
          <Button title={alreadyShared ? 'Save my working notes only' : 'Save draft'} variant="text" style={{ alignSelf: 'center' }} onPress={saveDraft} />
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
                      onPress={() => edit({ highlights: d.highlights.map((x, j) => (j === i ? { ...x, emoji: PICTURES[(PICTURES.indexOf(x.emoji) + 1) % PICTURES.length] } : x)) })}
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
                      <IconButton icon="x" label={`Remove highlight ${i + 1}`} variant="plain" onPress={() => edit({ highlights: d.highlights.filter((_, j) => j !== i) })} />
                    ) : null}
                  </View>
                ))}
                {d.highlights.length < 3 ? (
                  <Button title="Add a highlight" variant="text" iconLeft="plus" onPress={() => edit({ highlights: [...d.highlights, { emoji: PICTURES[d.highlights.length % PICTURES.length], text: '' }] })} />
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
                {d.tryAtHome.map((t, i) => (
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
                          onChangeText={(v) => edit({ tryAtHome: d.tryAtHome.map((x, j) => (j === i ? { ...x, title: v } : x)) })}
                        />
                        <Input
                          a11yLabel={`Thing to try ${i + 1}: one line`}
                          placeholder="One short line about how"
                          value={t.line}
                          onChangeText={(v) => edit({ tryAtHome: d.tryAtHome.map((x, j) => (j === i ? { ...x, line: v } : x)) })}
                        />
                      </View>
                      {d.tryAtHome.length > 1 ? (
                        <IconButton icon="x" label={`Remove thing to try ${i + 1}`} variant="plain" onPress={() => edit({ tryAtHome: d.tryAtHome.filter((_, j) => j !== i) })} />
                      ) : null}
                    </View>
                  </Card>
                ))}
                {d.tryAtHome.length < 3 ? (
                  <Button title="Add something to try" variant="text" iconLeft="plus" onPress={() => edit({ tryAtHome: [...d.tryAtHome, { title: '', line: '' }] })} />
                ) : null}
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="My working notes" />
          <WorkingNotesCard parentFirst={parentFirst} name={name}>
            <Input a11yLabel="My working notes. Only you can see these." area multiline placeholder="Your own notes" value={d.working} onChangeText={(v) => edit({ working: v })} style={{ minHeight: 120 }} />
          </WorkingNotesCard>
        </View>
      </Stagger>

      <Dialog visible={confirm} onClose={() => setConfirm(false)} title={alreadyShared ? `Share the changes with ${parentFirst}?` : `Share these notes with ${parentFirst}?`}>
        <T v="body" color="textSecondary" center>
          {parentFirst} will be told and can read them in Session notes. Your working notes stay with you.
        </T>
        <Button title="Share" icon="send" onPress={share} />
        <Button title="Not yet" variant="outline" onPress={() => setConfirm(false)} />
      </Dialog>
    </Screen>
  );
}
