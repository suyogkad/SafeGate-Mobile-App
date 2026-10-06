/**
 * P09 Parent Home (tab root). A full-bleed hero (bell with the unread count + avatar top-right; the pill button opens
 * Find a therapist), "Needs you", "Updates" (the 3 newest notifications → View all), chips, the upcoming session
 * card, the "Today with Alex" timeline and quick-action tiles.
 * "Needs you" is live from the shared store: calm mode and "Let Jordan know" requests show up here. Calm, never red.
 * Urgent items stay in "Needs you" only, so nothing shows twice on Home.
 */
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, type ImageSourcePropType } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { HeroBand } from '@/components/HeroBand';
import { NotificationRow } from '@/components/NotificationRow';
import { QuickTile, TileGrid } from '@/components/QuickTile';
import { Screen } from '@/components/Screen';
import { Timeline } from '@/components/Timeline';
import { Appear } from '@/components/ui/Appear';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Avatar, FaceCircle, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CountBadge } from '@/components/ui/CountBadge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { FACES } from '@/data/faces';
import { TODAY_WITH_ALEX } from '@/data/insights';
import { mood as moodById } from '@/data/moods';
import { greeting } from '@/lib/time';
import { useApp, useChildName, useUnreadCount } from '@/store/app';
import { artTints, gutter, moodColors, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type TodayItem = {
  key: string;
  caption: string;
  label?: string;
  title: string;
  titleColor?: string;
  href: Href;
  face: ImageSourcePropType;
  tint: string;
};

export default function ParentHome() {
  const { c } = useTheme();
  const name = useChildName() || 'Alex';
  const account = useApp((s) => s.account);
  const parentFirstName = account?.name ? account.name.split(' ')[0] : 'there';
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);
  const helpRequest = useApp((s) => s.helpRequest);
  const helpRequestAt = useApp((s) => s.helpRequestAt);
  const helpSeen = useApp((s) => s.helpSeen);
  const session = useApp((s) => s.session);
  const checkin = useApp((s) => s.checkin);
  const messages = useApp((s) => s.messages);
  const journal = useApp((s) => s.journal);
  const notifications = useApp((s) => s.notifications);
  const unread = useUnreadCount();
  const updates = notifications.filter((n) => n.audience === 'parent' && !n.urgent).slice(0, 3);

  // Today with Alex: live items from this session replace the matching demo ones.
  const today: TodayItem[] = [];
  if (calmMode !== 'off') {
    today.push({
      key: 'calm',
      caption: `Today · ${calmAt ?? ''}`,
      title: 'calm steps started',
      href: '/parent/transcript?id=live',
      face: FACES.calmHexagon,
      tint: artTints.cyan,
    });
  }
  const m = moodById(checkin ? checkin.mood : 'ok');
  today.push({
    key: 'checkin',
    caption: `Today · ${checkin ? checkin.at : TODAY_WITH_ALEX[0].time}`,
    label: 'Checked in',
    title: m.label,
    titleColor: moodColors[m.id].word,
    href: '/parent/checkins',
    face: m.face,
    tint: moodColors[m.id].tint,
  });
  today.push({
    key: 'chat',
    caption: messages.length ? 'Today' : `Today · ${TODAY_WITH_ALEX[1].time}`,
    label: 'Chatted with',
    title: 'the AI companion',
    href: messages.length ? '/parent/transcript?id=live' : '/parent/transcript?id=homework',
    face: FACES.monocleWave,
    tint: artTints.blue,
  });
  const lastJournal = journal[journal.length - 1];
  today.push({
    key: 'journal',
    caption: lastJournal ? `Today · ${lastJournal.at}` : 'Yesterday',
    label: 'Wrote in',
    title: 'the journal',
    href: lastJournal ? '/parent/transcript?id=live' : '/parent/transcript?id=smile',
    face: FACES.smilePillPink,
    tint: artTints.yellow,
  });

  const needs: { key: string; href: Href; title: string; meta: string; tag: string; tone: BadgeTone }[] = [];
  if (calmMode !== 'off') {
    needs.push({
      key: 'calm',
      href: '/parent/alert?kind=calm',
      title: `${name}'s app switched to calm steps`,
      meta: `Today, ${calmAt ?? ''}`.trim(),
      tag: calmMode === 'seen' ? 'SEEN' : 'NEEDS YOU',
      tone: calmMode === 'seen' ? 'neutral' : 'warn',
    });
  }
  if (helpRequest) {
    needs.push({
      key: 'help',
      href: '/parent/alert?kind=help',
      title: `${name} tapped “Let ${parentFirstName} know”`,
      meta: `“${helpRequest}” · Today, ${helpRequestAt ?? ''}`.trim(),
      tag: helpSeen ? 'SEEN' : 'NEEDS YOU',
      tone: helpSeen ? 'neutral' : 'warn',
    });
  }

  const chips: { label: string; icon: IconName; href: Href }[] = [
    { label: 'Sessions', icon: 'calendar', href: '/parent/sessions' },
    { label: 'Chats', icon: 'message-circle', href: '/parent/chats' },
    { label: 'Journal', icon: 'book-open', href: '/parent/journal' },
    { label: 'Insights', icon: 'bar-chart-2', href: '/parent/insights' },
    { label: 'Help lines', icon: 'phone', href: '/parent/help-lines' },
  ];

  const actions: { title: string; icon: IconName; href: Href }[] = [
    { title: 'Book a session', icon: 'plus-circle', href: '/parent/find-therapist' },
    { title: 'Read chats', icon: 'message-circle', href: '/parent/chats' },
    { title: 'Share with Priya', icon: 'send', href: '/parent/share' },
    { title: `${name}'s day`, icon: 'sun', href: '/parent/alexs-day' },
    { title: 'Comfort settings', icon: 'sliders', href: '/parent/child-comfort?from=home' },
    { title: 'Link code', icon: 'link', href: '/parent/link-child' },
  ];

  const initials = session?.therapist
    ? session.therapist
        .split(' ')
        .map((w) => w[0])
        .join('')
    : 'PS';

  return (
    <Screen inTabs padded={false} edgeToEdge>
      <StatusBar style="light" />
      <HeroBand
        topRight={
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Tappable
              label={`Notifications, ${unread ? `${unread} new` : 'none new'}`}
              onPress={() => router.push('/parent/notifications')}
              visualHeight={44}
            >
              <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={22} color={c.brand} />
                <CountBadge count={unread} ring={c.brand} />
              </View>
            </Tappable>
            <Tappable label={`${name}. Open account`} onPress={() => router.push('/parent/account')} visualHeight={44}>
              <Avatar initials={name.charAt(0).toUpperCase()} size={44} />
            </Tappable>
          </View>
        }
      >
        <View style={{ gap: space.sm }}>
          <T v="heading" color="onBrand" header>
            {greeting(parentFirstName)}
          </T>
          <T v="bodyLg" color="onBrand">
            Here’s {name}’s day.
          </T>
        </View>
        <Button title="Find a therapist" size="small" icon="arrow-right" onPress={() => router.push('/parent/find-therapist')} />
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Needs you" />
          {needs.length ? (
            needs.map((n, i) => (
              <Appear key={n.key} delay={i * 60}>
                <Card tone="outlined" padding={space.lg} onPress={() => router.push(n.href)} label={`${n.title}. ${n.meta}. ${n.tag}. Open`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radius.pill,
                        backgroundColor: n.tone === 'warn' ? c.warnTint : c.chip,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="bell" size={22} color={n.tone === 'warn' ? c.onWarnTint : c.textSecondary} />
                    </View>
                    <View style={{ flex: 1, gap: space.xs }}>
                      <T v="section">{n.title}</T>
                      <T v="bodySm" color="textMuted">
                        {n.meta}
                      </T>
                      <Badge label={n.tag} tone={n.tone} />
                    </View>
                    <Icon name="chevron-right" size={20} color={c.textMuted} />
                  </View>
                </Card>
              </Appear>
            ))
          ) : (
            <Card padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" color="textSecondary">
                  Nothing needs you right now
                </T>
              </View>
            </Card>
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Updates" action="View all" actionLabel="View all notifications" onAction={() => router.push('/parent/notifications')} />
          <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {updates.length ? (
              updates.map((n, i) => <NotificationRow key={n.id} n={n} childName={name} divider={i < updates.length - 1} />)
            ) : (
              <T v="bodyLg" color="textSecondary" style={{ paddingVertical: space.md }}>
                Nothing new about {name}.
              </T>
            )}
          </Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: gutter }}>
          {chips.map((ch) => (
            <Chip key={ch.label} label={ch.label} icon={ch.icon} onPress={() => router.push(ch.href)} />
          ))}
        </ScrollView>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Coming up" />
          {session ? (
            <Card
              tone="outlined"
              padding={space.lg}
              onPress={() => router.push('/parent/sessions')}
              label={`Session with ${session.therapist}, ${session.short}, ${session.time}. Open sessions`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
                <Avatar initials={initials} size={64} />
                <View style={{ flex: 1, gap: space.xs }}>
                  <T v="heading">Upcoming session</T>
                  <T v="section">{session.therapist}</T>
                  <T v="bodySm" color="textMuted">
                    {session.short} · {session.time}
                  </T>
                  <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                    <Badge label={session.kind} />
                  </View>
                </View>
              </View>
            </Card>
          ) : (
            <Card tone="outlined" padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar" size={22} color={c.brand} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="section">No upcoming sessions</T>
                  <T v="bodySm" color="textMuted">
                    Book a time with a therapist anytime
                  </T>
                </View>
                <Button title="Book" size="small" onPress={() => router.push('/parent/find-therapist')} />
              </View>
            </Card>
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title={`Today with ${name}`} />
          <Timeline>
            {today.map((it) => (
              <CheckinCard
                key={it.key}
                caption={it.caption}
                label={it.label}
                title={it.title}
                titleColor={it.titleColor}
                right={<FaceCircle face={it.face} tint={it.tint} size={72} />}
                onPress={() => router.push(it.href)}
              />
            ))}
          </Timeline>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Quick actions" />
          <TileGrid>
            {actions.map((a) => (
              <QuickTile key={a.title} title={a.title} icon={a.icon} onPress={() => router.push(a.href)} />
            ))}
          </TileGrid>
        </View>
      </View>
    </Screen>
  );
}
