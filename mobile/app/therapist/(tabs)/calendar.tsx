/**
 * T02 Calendar (tab root). Uses the parts of Sessions (navy summary panel + segmented) and Book (day tiles):
 * a navy "This week" panel with the counts, Week | Day, ‹ week ›, a day strip, then each day as a card of
 * TimeBlocks (booked · open · away · off, always in words) with "+ Add time".
 * A 7-column grid doesn't fit a phone at big text sizes, so the week is a list of days; tapping a day tile opens Day.
 * Booked → the session; open → change or remove it; "+ Add time" → Add a time on that day.
 */
import { router, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { DayStrip } from "@/components/DayStrip";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { TimeBlock } from "@/components/TimeBlock";
import { Stagger } from "@/components/ui/Appear";
import { SectionHeader } from "@/components/ui/bits";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { T } from "@/components/ui/T";
import { Tappable } from "@/components/ui/Tappable";
import {
  addDays,
  dayLabel,
  realBlocksForDay,
  todayIso,
  weekDays,
  weekStart,
  type Block,
} from "@/lib/schedule";
import { useApp, useChildName } from "@/store/app";
import { useMyOpenTimes, useTherapistSessions } from "@/lib/clients";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

const VIEWS = ["Week", "Day"] as const;
/** The week containing today, Monday to Sunday. */
const THIS_WEEK = weekStart(todayIso());
const FIRST_WEEK = THIS_WEEK;
const LAST_WEEK = addDays(THIS_WEEK, 21);

/** "12 – 18 October" / "26 October – 1 November" */
const weekRange = (monday: string) => {
  const a = dayLabel(monday).split(" ");
  const b = dayLabel(addDays(monday, 6)).split(" ");
  return a[2] === b[2]
    ? `${a[1]} – ${b[1]} ${b[2]}`
    : `${a[1]} ${a[2]} – ${b[1]} ${b[2]}`;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export default function Calendar() {
  const { c } = useTheme();
  const name = useChildName();
  // Real open times and real sessions, so the calendar and Today cannot disagree.
  const therapistId = useApp((s) => s.account?.id) ?? null;
  const slots = useMyOpenTimes(therapistId);
  const sessions = useTherapistSessions();
  const [view, setView] = useState<(typeof VIEWS)[number]>("Week");
  const [monday, setMonday] = useState(THIS_WEEK);
  const [day, setDay] = useState(THIS_WEEK);

  const days = weekDays(monday);
  const blocks: Record<string, Block[]> = Object.fromEntries(
    days.map((d) => [d, realBlocksForDay(slots, sessions, d)]),
  );
  const all = days.flatMap((d) => blocks[d]);
  const booked = all.filter((b) => b.type === "booked").length;
  const open = all.filter((b) => b.type === "open").length;

  const wordFor = (d: string) => {
    const bs = blocks[d];
    if (bs[0]?.type === "away") return "Away";
    if (bs[0]?.type === "off") return "Off";
    return bs.some((b) => b.type === "open") ? "Open" : "Full";
  };
  const a11yFor = (d: string) => {
    const bs = blocks[d];
    if (bs[0]?.type === "away" || bs[0]?.type === "off") return wordFor(d);
    return `${plural(bs.filter((b) => b.type === "booked").length, "session", "sessions")}, ${plural(bs.filter((b) => b.type === "open").length, "open time", "open times")}`;
  };

  const goWeek = (m: string) => {
    setMonday(m);
    setDay(m);
  };
  const press = (b: Block) => {
    if (b.type === "booked")
      router.push(`/therapist/session?id=${b.booking.id}` as Href);
    else if (b.type === "open")
      router.push(
        `/therapist/slot?date=${b.date}&start=${b.start}${b.extraId ? `&extra=${b.extraId}` : ""}` as Href,
      );
  };

  const dayCard = (d: string) => {
    const bs = blocks[d];
    const away = bs[0]?.type === "away";
    return (
      <View key={d} style={{ gap: space.md }}>
        <SectionHeader title={dayLabel(d)} />
        <Card tone="outlined" padding={space.sm} style={{ gap: space.xs }}>
          {bs.map((b, i) => (
            <TimeBlock
              key={i}
              block={b}
              childName={name}
              onPress={() => press(b)}
            />
          ))}
          {away ? null : (
            <Tappable
              label={`Add a time on ${dayLabel(d)}`}
              onPress={() => router.push(`/therapist/slot?date=${d}` as Href)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
                minHeight: 48,
                paddingHorizontal: space.md,
              }}
            >
              <Icon name="plus" size={18} color={c.brand} />
              <T v="label" color="brand">
                Add time
              </T>
            </Tappable>
          )}
        </Card>
      </View>
    );
  };

  return (
    <Screen
      inTabs
      backdrop="brand"
      header={<Header title="Calendar" left="none" getHelp={false} />}
    >
      <Stagger>
        <View
          style={{
            backgroundColor: c.brand,
            borderRadius: radius.panel,
            padding: space.xl,
            overflow: "hidden",
            gap: space.xs,
          }}
        >
          <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
            {monday === THIS_WEEK
              ? "THIS WEEK"
              : `WEEK OF ${dayLabel(monday).split(" ").slice(1).join(" ").toUpperCase()}`}
          </T>
          <T v="title" color="onBrand">
            {plural(booked, "session", "sessions")} ·{" "}
            {plural(open, "open time", "open times")}
          </T>
          <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
            {weekRange(monday)}
          </T>
        </View>

        <Segmented
          label="Show the calendar by"
          options={VIEWS}
          value={view}
          onChange={setView}
        />

        <View style={{ gap: space.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
            }}
          >
            {monday > FIRST_WEEK ? (
              <IconButton
                icon="chevron-left"
                label="Week before"
                variant="soft"
                onPress={() => goWeek(addDays(monday, -7))}
              />
            ) : (
              <View style={{ width: 48 }} />
            )}
            <T
              v="section"
              center
              style={{ flex: 1 }}
              accessibilityLiveRegion="polite"
            >
              {weekRange(monday)}
            </T>
            {monday < LAST_WEEK ? (
              <IconButton
                icon="chevron-right"
                label="Week after"
                variant="soft"
                onPress={() => goWeek(addDays(monday, 7))}
              />
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>
          {monday !== THIS_WEEK ? (
            <Button
              title="Back to this week"
              variant="text"
              iconLeft="rotate-ccw"
              style={{ alignSelf: "center" }}
              onPress={() => goWeek(THIS_WEEK)}
            />
          ) : null}
          <DayStrip
            days={days}
            selected={view === "Day" ? day : null}
            onSelect={(d) => {
              setDay(d);
              setView("Day");
            }}
            wordFor={wordFor}
            a11yFor={a11yFor}
          />
        </View>

        {view === "Week" ? (
          <View style={{ gap: space.xl }}>{days.map(dayCard)}</View>
        ) : (
          dayCard(day)
        )}
      </Stagger>
    </Screen>
  );
}
