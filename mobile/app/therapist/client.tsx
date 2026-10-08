/**
 * T06 Client. The navy header (large initial + the child's character, no photos) with
 * "Message <parent>", then Overview | Shared | Sessions:
 *  - Overview: goals (therapist-written, editable, saved on the server), what the child's
 *    record actually holds, and the current "Things to try at home" from the last notes shared.
 *  - Shared: only what the family shared (rule 19). Sharing a week is not built on the
 *    server yet, so that section says so; safety alerts are real, because the therapist is told.
 *  - Sessions: upcoming and past, with where the notes are (NOTES SHARED / WRITE NOTES / DRAFT).
 * ?id=<child id>  &tab=Overview|Shared|Sessions
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SessionCard, withComma } from '@/components/SessionCard';
import { Stagger } from '@/components/ui/Appear';
import { Avatar, FaceCircle, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { clientArt } from '@/data/practice';
import type { ApiSession } from '@/api/therapist';
import { contact } from '@/lib/call';
import { useClients, useTherapistAlerts, useTherapistSessions, type ClientSummary } from '@/lib/clients';
import { dayLabel, localDateIso, localStartMinutes, timeLabel } from '@/lib/schedule';
import { useGoals, useLastSuggestions } from '@/lib/therapist';
import { gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TABS = ['Overview', 'Shared', 'Sessions'] as const;
type Tab = (typeof TABS)[number];

/** Anything a family did not give us says so, rather than carrying a placeholder
 * that reads like real data to whoever needs it most. */
const recorded = (v: string | null | undefined) => (v && v.trim() ? v : 'Not recorded');

const ALERT_AT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** A label/value pair, as in the Alert's facts card. */
function Fact({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.xs, paddingVertical: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.divider }}>
      <T v="bodySm" color="textMuted">
        {label}
      </T>
      <T v="bodyLg">{value}</T>
    </View>
  );
}

/** A numbered row, as in the parent's "Things to try at home". */
function Numbered({ n, title, line }: { n: number; title: string; line?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.sm }}>
      <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
        <T v="section" color="brand">
          {n}
        </T>
      </View>
      <View style={{ flex: 1, gap: 2, paddingTop: 4 }}>
        <T v="bodyLg">{title}</T>
        {line ? (
          <T v="body" color="textSecondary">
            {line}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/** One quiet row with an icon (alerts, chats). */
function InfoRow({ icon, title, sub, onPress, tint }: { icon: IconName; title: string; sub?: string; onPress?: () => void; tint?: 'warn' }) {
  const { c } = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: tint ? c.warnTint : c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={tint ? c.onWarnTint : c.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="bodyLg">{title}</T>
        {sub ? (
          <T v="bodySm" color="textMuted">
            {sub}
          </T>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-right" size={20} color={c.textMuted} /> : null}
    </View>
  );
  return onPress ? (
    <Tappable label={[title, sub].filter(Boolean).join('. ')} onPress={onPress}>
      {body}
    </Tappable>
  ) : (
    body
  );
}

export default function Client() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; tab?: string }>();
  const id = params.id ?? '';
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t === params.tab) ?? 'Overview');
  const clients = useClients();
  const summary = clients.find((cl) => cl.id === id);
  const art = clientArt(id);

  if (!summary) {
    return (
      <Screen backdrop="brand" header={<Header title="Client" left="back" getHelp={false} fallback="/therapist/clients" />}>
        <T v="body" color="textMuted">
          {clients.length === 0 ? 'Loading…' : 'This client is not in your list.'}
        </T>
      </Screen>
    );
  }

  const name = summary.name;
  const parentFirst = summary.parentFirst || 'the family';

  return (
    <Screen padded={false} edgeToEdge backdrop="brand">
      <StatusBar style="light" />
      <View style={{ backgroundColor: c.brand, paddingTop: insets.top, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Image
          source={art.face}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ position: 'absolute', right: -40, top: insets.top + 10, width: 200, height: 200, opacity: 0.95, transform: [{ rotate: '-10deg' }] }}
        />
        <View style={{ paddingHorizontal: gutter - space.sm, paddingTop: space.sm }}>
          <IconButton icon="chevron-left" label="Back" variant="soft" onPress={() => goBack('/therapist/clients')} />
        </View>
        <View style={{ padding: gutter, paddingTop: space.xl, gap: space.md }}>
          <Avatar initials={name.charAt(0)} size={80} />
          <View style={{ gap: space.xs, paddingRight: 96 }}>
            <T v="title" color="onBrand" header>
              {name}
            </T>
            <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
              {[summary.age, summary.parent ? `Parent: ${summary.parent}` : null].filter(Boolean).join(' · ') || 'No details yet'}
            </T>
            <T v="bodySm" color="onBrand" style={{ opacity: 0.9 }}>
              {summary.next ? `Next: ${summary.next}` : 'No session booked'}
            </T>
          </View>
          {summary.parent ? (
            <Button
              title={`Message ${summary.parentFirst}`}
              size="small"
              variant="onBrand"
              iconLeft="message-square"
              onPress={() => contact('message', summary.parent)}
            />
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <Segmented label={`About ${name}`} options={TABS} value={tab} onChange={setTab} />
        <Stagger key={tab}>
          {tab === 'Overview' ? <Overview summary={summary} parentFirst={parentFirst} /> : null}
          {tab === 'Shared' ? <Shared id={id} name={name} parentFirst={parentFirst} /> : null}
          {tab === 'Sessions' ? <Sessions id={id} name={name} /> : null}
        </Stagger>
      </View>
    </Screen>
  );
}

function Overview({ summary, parentFirst }: { summary: ClientSummary; parentFirst: string }) {
  const { goals, save } = useGoals(summary.id);
  const [editing, setEditing] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tryAtHome = useLastSuggestions(summary.id, new Date().toISOString()) ?? [];
  const name = summary.name;
  const record = summary.record;

  const done = async () => {
    if (!editing) {
      setEditing([...goals]);
      return;
    }
    const failed = await save(editing.map((g) => g.trim()).filter(Boolean));
    if (failed) {
      setError(failed);
      return;
    }
    setError(null);
    setEditing(null);
  };

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.md }}>
        <SectionHeader title="Goals" action={editing ? 'Done' : 'Edit goals'} onAction={done} />
        <Card tone="raised" padding={space.lg}>
          {editing ? (
            <View style={{ gap: space.md }}>
              {editing.map((g, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <Input a11yLabel={`Goal ${i + 1}`} value={g} onChangeText={(v) => setEditing(editing.map((x, j) => (j === i ? v : x)))} />
                  </View>
                  <IconButton icon="x" label={`Remove goal ${i + 1}`} variant="plain" onPress={() => setEditing(editing.filter((_, j) => j !== i))} />
                </View>
              ))}
              {editing.length < 4 ? <Button title="Add a goal" variant="text" iconLeft="plus" onPress={() => setEditing([...editing, ''])} /> : null}
              <T v="bodySm" color="textMuted">
                Write goals the family would recognise: plain words, no scores.
              </T>
              {error ? (
                <T v="bodySm" color="onWarnTint" accessibilityLiveRegion="polite">
                  {error}
                </T>
              ) : null}
            </View>
          ) : goals.length ? (
            goals.map((g, i) => <Numbered key={g} n={i + 1} title={g} />)
          ) : (
            <T v="body" color="textMuted">
              No goals yet.
            </T>
          )}
        </Card>
        {!editing && goals.length ? (
          <T v="bodySm" color="textMuted">
            {parentFirst} can read these too.
          </T>
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title={`${name}’s record`} />
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <Fact label="Age" value={summary.age || 'Not recorded'} />
          <Fact label="Parent" value={recorded(record.parent_name)} />
          <Fact label="Emergency contact" value={recorded(record.emergency_contact_name)} />
          <Fact label="Emergency phone" value={recorded(record.emergency_contact_phone)} />
          <Fact label="Home address" value={recorded(record.home_address)} last />
        </Card>
        <T v="bodySm" color="textMuted">
          {/* Setup asks only for a name, so most of this is usually blank. Saying
              "Not recorded" is the point: a placeholder here would mislead whoever
              needs an emergency contact most. */}
          Only {parentFirst} can fill these in, in their own app.
        </T>
      </View>

      {tryAtHome.length ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Things to try at home" />
          <Card tone="raised" padding={space.lg}>
            {tryAtHome.map((t, i) => (
              <Numbered key={t.title} n={i + 1} title={t.title} line={t.line} />
            ))}
          </Card>
          <T v="bodySm" color="textMuted">
            From the notes you last shared.
          </T>
        </View>
      ) : null}
    </View>
  );
}

function Shared({ id, name, parentFirst }: { id: string; name: string; parentFirst: string }) {
  const { c } = useTheme();
  const { alerts } = useTherapistAlerts(false);
  const mine = alerts.filter((a) => a.child_id === id);
  const art = clientArt(id);

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Icon name="info" size={18} color={c.textSecondary} />
        <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
          You only see what {parentFirst} chooses to share. Safety alerts always reach you.
        </T>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="This week" />
        {/* Sharing a week is not built on the server yet. An empty state is the
            honest answer; invented check-ins would be read as real. */}
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <FaceCircle face={art.face} tint={art.tint} size={72} />
            <T v="heading" center>
              Nothing shared yet
            </T>
            <T v="body" color="textSecondary" center>
              Check-ins and {parentFirst}’s summary of {name}’s week will show here once families can share them.
            </T>
          </View>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Chats" />
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <InfoRow icon="message-circle" title="No chats shared" sub={`${parentFirst} chooses chats one at a time.`} />
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Alerts" />
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          {mine.length ? (
            mine.slice(0, 5).map((a) => (
              <InfoRow
                key={a.id}
                icon="bell"
                tint="warn"
                title={`Calm steps · ${ALERT_AT.format(new Date(a.timestamp))}`}
                sub={a.parent_seen_at ? `${parentFirst} has seen it` : `Not seen by ${parentFirst} yet`}
                onPress={() => router.push(`/therapist/alert?id=${a.id}` as Href)}
              />
            ))
          ) : (
            <InfoRow icon="check-circle" title="No alerts" sub={`You’re told straight away if ${name}’s app switches to calm steps.`} />
          )}
        </Card>
      </View>
    </View>
  );
}

/** How a past session's notes stand, for the card's tag. */
function notesTag(s: ApiSession) {
  if (s.notes_shared_at) return { tag: 'NOTES SHARED', tone: 'success' as const, line: 'Shared with the family' };
  if (s.notes_written) return { tag: 'DRAFT', tone: 'neutral' as const, line: 'Notes not shared yet' };
  return { tag: 'WRITE NOTES', tone: 'warn' as const, line: 'No notes yet' };
}

function Sessions({ id, name }: { id: string; name: string }) {
  const sessions = useTherapistSessions();
  const now = Date.now();
  const mine = sessions.filter((s) => s.child_id === id && s.status !== 'cancelled');
  const upcoming = mine
    .filter((s) => s.status === 'booked' && new Date(s.start_time).getTime() > now)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const past = mine
    .filter((s) => !upcoming.includes(s))
    .sort((a, b) => b.start_time.localeCompare(a.start_time));

  const card = (s: ApiSession, tag: string, tone: 'info' | 'success' | 'neutral' | 'warn', line: string) => {
    const date = localDateIso(new Date(s.start_time));
    const start = localStartMinutes(new Date(s.start_time));
    return (
      <SessionCard
        key={s.id}
        date={date}
        start={start}
        initials={name.charAt(0)}
        tag={tag}
        tone={tone}
        line={line}
        label={`${withComma(dayLabel(date))}, ${timeLabel(start)}. ${tag.toLowerCase()}. Open the session`}
        onPress={() => router.push(`/therapist/session?id=${s.id}` as Href)}
      />
    );
  };

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.md }}>
        <SectionHeader title="Upcoming" />
        {upcoming.length ? (
          upcoming.map((s) =>
            card(s, s.meeting_kind === 'video' ? 'VIDEO CALL' : 'IN PERSON', 'info', s.meeting_kind === 'video' ? 'Video call' : 'In person'),
          )
        ) : (
          <T v="body" color="textMuted">
            No sessions booked.
          </T>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Past" />
        {past.length ? (
          past.map((s) => {
            const n = notesTag(s);
            return card(s, n.tag, n.tone, `${s.meeting_kind === 'video' ? 'Video call' : 'In person'} · ${n.line}`);
          })
        ) : (
          <T v="body" color="textMuted">
            Past sessions with {name} show here.
          </T>
        )}
      </View>
    </View>
  );
}
