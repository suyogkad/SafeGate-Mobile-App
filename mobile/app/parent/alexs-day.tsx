/**
 * P23 Alex's day. A navy plan panel ("Change" cycles the plan presets), setting rows that cycle on tap, switch rows
 * for the items, and the child's Home plan cards as a live preview of what Alex sees.
 * Changes show on Alex's Home (C06) immediately (shared store). Breathing, Sounds and Kind words have no Home row yet.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { Header } from '@/components/Header';
import { NavyPanel } from '@/components/NavyPanel';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { FaceCircle } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { SwitchRow } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { DAY_COUNTS, DAY_FOCUS, DAY_ITEMS, DAY_PLANS, HOME_ROWS, homeRows } from '@/data/day';
import { FACES } from '@/data/faces';
import { AudienceProvider } from '@/lib/motion';
import { useApp, useChildName } from '@/store/app';
import { artTints, space } from '@/theme/tokens';

export default function AlexsDay() {
  const name = useChildName();
  const day = useApp((s) => s.day);
  const setDay = useApp((s) => s.setDay);
  const toggle = useApp((s) => s.toggleDayItem);
  const plan = DAY_PLANS[day.plan];
  const rows = homeRows(day);
  const nextCount = DAY_COUNTS[(DAY_COUNTS.indexOf(day.count) + 1) % DAY_COUNTS.length];
  const maxCount = DAY_COUNTS[DAY_COUNTS.length - 1];
  const [note, setNote] = useState<string | null>(null);

  // Turning on something that belongs on Home when the day is already full would do nothing visible, so make room
  // (up to the maximum) and say so — otherwise explain why it isn't showing.
  const onToggle = (id: (typeof DAY_ITEMS)[number]['id']) => {
    const item = DAY_ITEMS.find((i) => i.id === id)!;
    const turningOn = !day.on[id];
    setNote(null);
    if (turningOn && item.row && rows.length >= day.count) {
      if (day.count < maxCount) {
        setDay({ count: day.count + 1 });
        setNote(`${item.label} added. ${name}'s day now has ${day.count + 1} things.`);
      } else {
        setNote(`${name}'s day already has ${maxCount} things. Turn one off to make room for ${item.label}.`);
      }
    }
    toggle(id);
  };

  return (
    <Screen
      backdrop="brand"
      header={
        <Header
          title={`${name}'s day`}
          getHelp={false}
          fallback="/parent/home"
          right={<Button title="Change" variant="text" label="Change the plan" onPress={() => setDay({ plan: (day.plan + 1) % DAY_PLANS.length })} />}
        />
      }
    >
      <T v="bodyLg" color="textSecondary">
        Choose what shows on {name}'s home screen each day.
      </T>

      <Stagger>
        <NavyPanel caption="ABOUT 5 MIN A DAY" title={plan.title} face={FACES.smileFlowerAmber}>
          <T v="bodyLg" color="onBrand" style={{ opacity: 0.92, paddingRight: 56 }}>
            {plan.text}
          </T>
        </NavyPanel>

        <View style={{ gap: space.sm }}>
          <T v="section" header>
            Settings
          </T>
          <T v="bodySm" color="textMuted">
            Keep it short and the same each day.
          </T>
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            <ListRow
              title="Focus"
              value={DAY_FOCUS[day.focus]}
              onPress={() => setDay({ focus: (day.focus + 1) % DAY_FOCUS.length })}
              label={`Focus, ${DAY_FOCUS[day.focus]}. Tap to change`}
              divider
            />
            <ListRow
              title={`Things in ${name}'s day`}
              value={`${day.count} things`}
              onPress={() => setDay({ count: nextCount })}
              label={`Things in ${name}'s day, ${day.count}. Tap to change`}
            />
          </Card>
        </View>

        <View style={{ gap: space.sm }}>
          <T v="section" header>
            What's in {name}'s day
          </T>
          <T v="bodySm" color="textMuted">
            Turn things on or off. {name} sees them in this order.
          </T>
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {DAY_ITEMS.map((it, i) => (
              <SwitchRow
                key={it.id}
                title={it.label}
                subtitle={it.row ? undefined : 'Not on the home screen yet'}
                on={day.on[it.id]}
                onToggle={() => onToggle(it.id)}
                divider={i < DAY_ITEMS.length - 1}
              />
            ))}
          </Card>
          {note ? (
            <T v="bodySm" color="brand" accessibilityLiveRegion="polite">
              {note}
            </T>
          ) : null}
        </View>

        {/* Live preview — exactly the cards Alex sees on Home, in the child's styling */}
        <View style={{ gap: space.sm }}>
          <T v="section" header>
            On {name}'s home today
          </T>
          <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
            <AudienceProvider value="child">
              {rows.length ? (
                rows.map((id) => {
                  const r = HOME_ROWS[id];
                  return <CheckinCard key={id} caption={r.tag} title={r.title} right={<FaceCircle face={FACES[r.face]} tint={artTints[r.tint]} size={56} />} />;
                })
              ) : (
                <Card tone="raised" padding={space.lg}>
                  <T v="body" color="textSecondary">
                    Only the next session shows. Turn something on to add it.
                  </T>
                </Card>
              )}
            </AudienceProvider>
          </View>
        </View>
      </Stagger>
    </Screen>
  );
}
