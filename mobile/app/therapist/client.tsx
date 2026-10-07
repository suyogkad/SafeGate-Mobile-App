/**
 * T06 Client. The therapist profile's navy header (large initial + the child's character, no photos) with
 * "Message Jordan", then Overview | Shared | Sessions:
 *  - Overview: goals (therapist-written, editable), the parent's "About your child" answers, Comfort settings
 *    (read-only) and the current "Things to try at home" (from the last shared notes).
 *  - Shared: only what the family shared (rule 19). The week's check-ins (the same interactive chart as the parent's
 *    Check-ins) and summary appear only after "Share with Priya"; calm-step alerts always show (the therapist is told).
 *  - Sessions: upcoming and past, with where the notes are (NOTES SHARED / WRITE NOTES / DRAFT).
 * ?id=alex|mia|leo  &tab=Overview|Shared|Sessions
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack, Header } from '@/components/Header';
import { MoodChart } from '@/components/MoodChart';
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
import { WEEK, SHARED } from '@/data/insights';
import { ALEX_PAST, clientArt, CLIENTS, OTHER_CLIENT_SHARING, type ClientId } from '@/data/practice';
import { contact } from '@/lib/call';
import { latestShared, useClients } from '@/lib/clients';
import { dayLabel, DEMO_TODAY, timeLabel } from '@/lib/schedule';
import { useApp, useBookings, useChildName } from '@/store/app';
import { gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TABS = ['Overview', 'Shared', 'Sessions'] as const;
type Tab = (typeof TABS)[number];

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
  const id: ClientId = params.id ?? '';
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t === params.tab) ?? 'Overview');
  const clients = useClients();
  const summary = clients.find((cl) => cl.id === id);
  const art = clientArt(id);
  const childName = useChildName();

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
  const parentFirst = summary.parentFirst || 'The family';

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
              {[summary.age, summary.parent ? `Parent: ${summary.parent}` : null].filter(Boolean).join(' · ') ||
                'No details yet'}
            </T>
            <T v="bodySm" color="onBrand" style={{ opacity: 0.9 }}>
              {summary.next ? `Next: ${summary.next}` : 'No session booked'}
            </T>
          </View>
          <Button
            title={`Message ${summary.parentFirst || 'the family'}`}
            size="small"
            variant="onBrand"
            iconLeft="message-square"
            onPress={() => contact('message', summary.parent)}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <Segmented label={`About ${name}`} options={TABS} value={tab} onChange={setTab} />
        <Stagger key={tab}>
          {tab === 'Overview' ? <Overview id={id} name={name} parentFirst={parentFirst} /> : null}
          {tab === 'Shared' ? <Shared id={id} name={name} childName={childName} parentFirst={parentFirst} /> : null}
          {tab === 'Sessions' ? <Sessions id={id} name={name} /> : null}
        </Stagger>
      </View>
    </Screen>
  );
}

function Overview({ id, name, parentFirst }: { id: ClientId; name: string; parentFirst: string }) {
  const { c } = useTheme();
  const goals = useApp((s) => s.goals[id]) ?? [];
  const child = useApp((s) => s.child);
  const comfort = useApp((s) => s.comfort);
  const notes = useApp((s) => s.sessionNotes);
  const [editing, setEditing] = useState<string[] | null>(null);
  const alex = id === 'alex';
  const tryAtHome = alex ? (latestShared(notes)?.tryAtHome ?? []) : [];
  const answer = (v: string | string[] | null) => (Array.isArray(v) ? (v.length ? v.join(', ') : null) : v) ?? 'Not answered yet';

  const comfortLine = [
    `${comfort.textSize} text`,
    comfort.readAloud ? 'reads things aloud' : null,
    comfort.simpleWords ? 'simple words' : null,
    comfort.fewerChoices ? 'fewer choices' : null,
    comfort.movement ? 'movement on' : 'movement off',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Goals"
          action={editing ? 'Done' : 'Edit goals'}
          onAction={() => {
            if (editing) {
              useApp.getState().setGoals(id, editing.map((g) => g.trim()).filter(Boolean));
              setEditing(null);
            } else setEditing([...goals]);
          }}
        />
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
            </View>
          ) : goals.length ? (
            goals.map((g, i) => <Numbered key={g} n={i + 1} title={g} />)
          ) : (
            <T v="body" color="textMuted">
              No goals yet.
            </T>
          )}
        </Card>
      </View>

      {alex ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title={`About ${name}`} />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            <Fact label="Age" value={answer(child.age)} />
            <Fact label="Lately" value={answer(child.feeling)} />
            <Fact label="What tends to be hard" value={answer(child.hard)} />
            <Fact label="What would help most" value={answer(child.help)} />
            <Fact label={`How ${name} communicates best`} value={answer(child.communicate)} last />
          </Card>
          <T v="bodySm" color="textMuted">
            From {parentFirst}’s answers when setting up SafeGate.
          </T>
        </View>
      ) : (
        <Card tone="raised" padding={space.lg}>
          <T v="body" color="textSecondary">
            {parentFirst}’s answers about {name} show here once the family joins SafeGate.
          </T>
        </Card>
      )}

      {alex ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Comfort settings" />
          <Card tone="raised" padding={space.lg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} accessible accessibilityLabel={`Comfort settings: ${comfortLine}. Only ${name} and ${parentFirst} can change these.`}>
              <Icon name="sliders" size={22} color={c.text} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyLg">{comfortLine.charAt(0).toUpperCase() + comfortLine.slice(1)}</T>
                <T v="bodySm" color="textMuted">
                  Only {name} and {parentFirst} can change these.
                </T>
              </View>
              <Icon name="lock" size={16} color={c.textMuted} />
            </View>
          </Card>
        </View>
      ) : null}

      {tryAtHome.length ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Things to try at home" />
          <Card tone="raised" padding={space.lg}>
            {tryAtHome.map((t, i) => (
              <Numbered key={t.title} n={i + 1} title={t.title} line={t.line} />
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

function Shared({ id, name, childName, parentFirst }: { id: ClientId; name: string; childName: string; parentFirst: string }) {
  const { c } = useTheme();
  // Looking at what the family shared is reading it: "Jordan shared Alex's week" leaves Needs attention.
  useEffect(() => {
    useApp.getState().markReadWhere((n) => n.audience === 'therapist' && n.type === 'shared' && n.childId === id);
  }, [id]);
  const sharedWeek = useApp((s) => s.sharedWeek);
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);
  const calmSeenAt = useApp((s) => s.calmSeenAt);
  const emergency = useApp((s) => s.emergency);
  const alex = id === 'alex';
  const other = alex ? null : (OTHER_CLIENT_SHARING[id] ?? null);
  const weekShared = alex ? sharedWeek : !!other?.sharedThisWeek;

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Icon name="info" size={18} color={c.textSecondary} />
        <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
          {parentFirst} shares check-ins each week. Chats and the journal only when {parentFirst} chooses.
        </T>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="This week" />
        {weekShared && alex ? (
          <>
            <Card tone="raised" padding={space.lg}>
              <MoodChart points={WEEK} />
            </Card>
            <Card tone="tint" r={24} padding={space.xl}>
              <View style={{ gap: space.sm }}>
                <T v="bodySm" color="brand">
                  {parentFirst}’s summary
                </T>
                <T v="bodyLg" color="brand">
                  {SHARED.replace(/Alex/g, childName)}
                </T>
              </View>
            </Card>
          </>
        ) : weekShared && other?.summary ? (
          <Card tone="tint" r={24} padding={space.xl}>
            <T v="bodyLg" color="brand">
              {other.summary}
            </T>
          </Card>
        ) : (
          <Card tone="raised" r={24} padding={space.xl}>
            <View style={{ alignItems: 'center', gap: space.md }}>
              <FaceCircle face={clientArt(id).face} tint={clientArt(id).tint} size={72} />
              <T v="heading" center>
                {parentFirst} hasn’t shared this week yet
              </T>
              <T v="body" color="textSecondary" center>
                Check-ins show here when {parentFirst} shares {name}’s week.
              </T>
            </View>
          </Card>
        )}
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
          {alex && calmMode !== 'off' ? (
            <InfoRow
              icon="bell"
              tint="warn"
              title={`Calm steps · Today, ${calmAt ?? ''}`}
              sub={emergency ? `${emergency.by} asked emergency services at ${emergency.at}` : calmSeenAt ? `${parentFirst} saw it at ${calmSeenAt}` : `Not seen by ${parentFirst} yet`}
              onPress={() => router.push('/therapist/alert?id=calm' as Href)}
            />
          ) : (
            <InfoRow icon="check-circle" title="No alerts" sub={`You’re told straight away if ${name}’s app switches to calm steps.`} />
          )}
        </Card>
      </View>
    </View>
  );
}

function Sessions({ id, name }: { id: ClientId; name: string }) {
  const bookings = useBookings();
  const notes = useApp((s) => s.sessionNotes);
  const upcoming = bookings.filter((b) => b.clientId === id && b.date > DEMO_TODAY);
  const past = id === 'alex' ? ALEX_PAST : [];

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.md }}>
        <SectionHeader title="Upcoming" />
        {upcoming.length ? (
          upcoming.map((b) => (
            <SessionCard
              key={b.id}
              date={b.date}
              start={b.start}
              initials={name.charAt(0)}
              tag={b.kind.toUpperCase()}
              line={b.kind === 'In person' ? 'Parramatta clinic' : 'Video call'}
              label={`${withComma(dayLabel(b.date))}, ${timeLabel(b.start)}, ${b.kind.toLowerCase()}. Open the session`}
              onPress={() => router.push(`/therapist/session?id=${b.id}` as Href)}
            />
          ))
        ) : (
          <T v="body" color="textMuted">
            No sessions booked.
          </T>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Past" />
        {past.length ? (
          past.map((b) => {
            const n = notes[b.id];
            const status = n?.sharedAt ? { tag: 'NOTES SHARED', tone: 'success' as const } : n ? { tag: 'DRAFT', tone: 'neutral' as const } : { tag: 'WRITE NOTES', tone: 'warn' as const };
            return (
              <SessionCard
                key={b.id}
                date={b.date}
                start={b.start}
                initials={name.charAt(0)}
                tag={status.tag}
                tone={status.tone}
                line={`${b.kind} · ${n?.sharedAt ? `Shared ${n.sharedAt}` : n ? 'Notes not shared yet' : 'No notes yet'}`}
                label={`${withComma(dayLabel(b.date))}, ${timeLabel(b.start)}. ${status.tag.toLowerCase()}. Open the session`}
                onPress={() => router.push(`/therapist/session?id=${b.id}` as Href)}
              />
            );
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
