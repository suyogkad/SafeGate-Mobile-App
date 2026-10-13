/**
 * P13 Sessions (tab root). A navy "Next session" summary, then session cards under a
 * segmented Upcoming | Past.
 *
 * All real. A past session says where its notes are — NOTES COMING until the therapist
 * shares them, then NOTES SHARED and the card opens them. The parent is never told that
 * a draft exists: whether the therapist has started writing is their own business, and
 * the backend does not tell a family either way.
 *
 * A video session also offers Join, but only inside its own window: the link is issued
 * per participant by the backend and refused outside it, so the button follows that
 * rather than pretending.
 */
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { cancelSession, type ApiSession } from '@/api/family';
import { FACES } from '@/data/faces';
import { useFamilySessions, useMyChild } from '@/lib/family';
import { dayLabel, localDateIso } from '@/lib/schedule';
import { firstName, initialsOf, clockOf } from '@/lib/time';
import { callIsOpen, joinCall, JOIN_EARLY_MINUTES } from '@/lib/video';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TABS = ['Upcoming', 'Past'] as const;
const SHORT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** "Thursday 15 October" → "Thursday, 15 October" */
const withComma = (d: string) => d.replace(/^(\w+) /, '$1, ');

/** When the join link opens, in the parent's own words. */
const opensAt = (startTime: string) =>
  clockOf(new Date(startTime).getTime() - JOIN_EARLY_MINUTES * 60_000);

export default function Sessions() {
  const { c } = useTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming');
  const child = useMyChild();
  const sessions = useFamilySessions();
  const [list, setList] = useState<ApiSession[] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ApiSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const all = list ?? sessions;
  const now = Date.now();
  const upcoming = all
    .filter((s) => s.status === 'booked' && new Date(s.start_time).getTime() > now)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const past = all
    .filter((s) => !upcoming.includes(s))
    .sort((a, b) => b.start_time.localeCompare(a.start_time));
  const rows = tab === 'Upcoming' ? upcoming : past;
  const next = upcoming[0];

  const join = async (s: ApiSession) => {
    setError(await joinCall(s.id));
  };

  const doCancel = async () => {
    if (!confirmCancel) return;
    setBusy(true);
    try {
      const updated = await cancelSession(confirmCancel.id);
      setList(all.map((s) => (s.id === updated.id ? updated : s)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel that session.');
    } finally {
      setBusy(false);
      setConfirmCancel(null);
    }
  };

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Sessions" left="none" getHelp={false} />}>
      <Appear>
        <View style={{ backgroundColor: c.brand, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', gap: space.md }}>
          <Image
            source={FACES.smileFlower}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -20, bottom: -24, width: 120, height: 120, transform: [{ rotate: '-8deg' }] }}
          />
          <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
            NEXT SESSION
          </T>
          {next ? (
            <View style={{ gap: 2, paddingRight: 80 }}>
              <T v="title" color="onBrand">
                {SHORT.format(new Date(next.start_time))} · {clockOf(next.start_time)}
              </T>
              <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
                {next.therapist_name ?? 'Your therapist'} · {next.meeting_kind === 'video' ? 'Video call' : 'In person'}
              </T>
            </View>
          ) : (
            <View style={{ gap: 2, paddingRight: 80 }}>
              <T v="title" color="onBrand">
                No session booked yet
              </T>
              <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
                Find a practitioner to book your first session.
              </T>
            </View>
          )}
          <Button
            title={next ? 'Book another' : 'Book a session'}
            size="small"
            variant="onBrand"
            iconLeft="plus"
            onPress={() => router.push('/parent/find-therapist')}
          />
        </View>
      </Appear>

      <Segmented label="Sessions" options={TABS} value={tab} onChange={setTab} />

      {error ? (
        <T v="bodySm" color="onWarnTint" accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : null}

      <View style={{ gap: space.md }} key={tab}>
        {rows.length > 0 ? (
          <Stagger>
            {rows.map((s) => {
              const at = new Date(s.start_time);
              const date = withComma(dayLabel(localDateIso(at)));
              const video = s.meeting_kind === 'video';
              const notes = s.notes_shared_at
                ? { tag: 'NOTES SHARED', tone: 'success' as BadgeTone }
                : { tag: 'NOTES COMING', tone: 'neutral' as BadgeTone };
              const upcomingRow = tab === 'Upcoming';
              const cancelled = s.status === 'cancelled';
              const tag = cancelled ? 'CANCELLED' : upcomingRow ? (video ? 'VIDEO CALL' : 'IN PERSON') : notes.tag;
              const tone: BadgeTone = cancelled ? 'neutral' : upcomingRow ? 'info' : notes.tone;
              const who = s.therapist_name ?? 'your therapist';
              const line = cancelled
                ? 'This session was cancelled.'
                : upcomingRow
                  ? video
                    ? `The join link opens at ${opensAt(s.start_time)}.`
                    : 'In person'
                  : s.notes_shared_at
                    ? `${firstName(who)} shared notes from this session.`
                    : `${firstName(who)} will share notes here.`;
              const openNotes = !upcomingRow && !!s.notes_shared_at;

              const body = (
                <View style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', gap: space.lg }}>
                    <Avatar initials={initialsOf(who) || '?'} size={52} />
                    <View style={{ flex: 1, gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                        <Badge label={tag} tone={tone} />
                        <T v="caption" color="textMuted">
                          {clockOf(at)}
                        </T>
                      </View>
                      <T v="section">{date}</T>
                      <T v="bodySm" color="textSecondary">
                        With {who}
                      </T>
                      <T v="bodySm" color="textMuted">
                        {line}
                      </T>
                    </View>
                    {openNotes ? <Icon name="chevron-right" size={20} color={c.textMuted} /> : null}
                  </View>
                  {upcomingRow && !cancelled ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                      {video ? (
                        <Button
                          title="Join video call"
                          size="small"
                          iconLeft="video"
                          disabled={!callIsOpen(s.start_time, s.end_time)}
                          onPress={() => join(s)}
                        />
                      ) : null}
                      <Button title="Cancel session" size="small" variant="outline" onPress={() => setConfirmCancel(s)} />
                    </View>
                  ) : null}
                </View>
              );

              const style = { backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, ...shadow.lift };
              return openNotes ? (
                <Tappable
                  key={s.id}
                  label={`${date}, ${clockOf(at)}. With ${who}. Open notes`}
                  onPress={() => router.push(`/parent/session-notes?id=${s.id}` as Href)}
                  style={style}
                >
                  {body}
                </Tappable>
              ) : (
                <View key={s.id} style={style}>
                  {body}
                </View>
              );
            })}
          </Stagger>
        ) : (
          <Card tone="outlined" padding={space.xl} style={{ alignItems: 'center', gap: space.md }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={26} color={c.brand} />
            </View>
            <T v="heading" center>
              {tab === 'Upcoming' ? 'No upcoming sessions' : 'No past sessions'}
            </T>
            <T v="bodySm" color="textMuted" center>
              {tab === 'Upcoming'
                ? 'Your booked sessions will appear here.'
                : 'Past sessions and the notes your therapist shares will show here.'}
            </T>
            {tab === 'Upcoming' ? (
              <Button title="Find a therapist" icon="arrow-right" onPress={() => router.push('/parent/find-therapist')} />
            ) : null}
          </Card>
        )}
      </View>

      <Dialog
        visible={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title="Cancel this session?"
      >
        <T v="body" color="textSecondary" center>
          {confirmCancel
            ? `${withComma(dayLabel(localDateIso(new Date(confirmCancel.start_time))))}, ${clockOf(confirmCancel.start_time)} with ${confirmCancel.therapist_name ?? 'your therapist'}.`
            : ''}
        </T>
        <T v="bodySm" color="textMuted" center>
          {child?.full_name ?? 'Your child'} will see it come off their phone. The time goes back to your
          therapist, so you can book another.
        </T>
        <Button title="Yes, cancel it" disabled={busy} onPress={doCancel} />
        <Button title="Keep the session" variant="outline" onPress={() => setConfirmCancel(null)} />
      </Dialog>
    </Screen>
  );
}
