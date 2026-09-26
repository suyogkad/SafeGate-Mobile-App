import { useState } from 'react';
import { Image, Platform, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import type { MoodPoint } from '../data/insights';
import { mood as moodById, type MoodId } from '../data/moods';
import { gutter, moodColors, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

const LEVEL: Record<MoodId, number> = { bad: 0, notGreat: 1, ok: 2, good: 3, great: 4 };
const H = 200;
const TOP = 34; // room for the face + word above labelled points
const BOTTOM = 36; // day labels (clear of the lowest dot)
const PAD_X = 22;

/**
 * Parent-only mood chart (Insights / Check-ins). In Alex's words, never scores: each point is a dot in its mood
 * colour, and labelled points carry the mood's character and the mood word ("Bad", "Ok", "Great"). A navy line with
 * a soft blue50 fill underneath. No numbers, no percentages, no red.
 *
 * Interactive: every day (or week) is a tappable column. Tapping one rings its point and opens a card under the chart
 * with what Alex shared then (check-in time, feeling words, what it was about, a short note). Tap it again to close.
 */
export function MoodChart({ points }: { points: MoodPoint[] }) {
  const { c } = useTheme();
  const win = useWindowDimensions();
  // Start from an estimate of the chart's width (screen minus page gutters and card padding) so the chart draws on the
  // very first frame instead of appearing a frame later; onLayout then sets the exact width.
  const [w, setW] = useState(() => Math.max(0, Math.min(win.width, Platform.OS === 'web' ? 430 : win.width) - gutter * 2 - space.lg * 2));
  const [sel, setSel] = useState<number | null>(null);
  const picked = sel !== null ? points[sel] : null;
  const n = points.length;
  const plotH = H - TOP - BOTTOM;
  const x = (i: number) => PAD_X + (n === 1 ? 0 : (i * (w - PAD_X * 2)) / (n - 1));
  const y = (m: MoodId) => TOP + ((4 - LEVEL[m]) * plotH) / 4;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.mood).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${TOP + plotH} L${x(0).toFixed(1)},${TOP + plotH} Z`;

  const summary = points.map((p) => `${p.day}: ${moodById(p.mood).label}`).join(', ');

  const colW = n > 1 ? (w - PAD_X * 2) / (n - 1) : w;

  return (
    <View style={{ gap: space.lg }}>
    <View accessibilityLabel={`Mood chart. ${summary}`} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
      {w > 0 ? (
        <>
          <Svg width={w} height={H}>
            <Defs>
              <LinearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.surfaceTint} stopOpacity={0.9} />
                <Stop offset="1" stopColor={c.surfaceTint} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 1, 2, 3, 4].map((l) => (
              <Line key={l} x1={PAD_X} x2={w - PAD_X} y1={TOP + (l * plotH) / 4} y2={TOP + (l * plotH) / 4} stroke={c.divider} strokeWidth={1} />
            ))}
            <Path d={area} fill="url(#moodFill)" />
            <Path d={line} stroke={c.brand} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {sel !== null ? (
              <Line x1={x(sel)} x2={x(sel)} y1={TOP - 6} y2={TOP + plotH} stroke={c.brand} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            ) : null}
            {points.map((p, i) => (
              <Circle
                key={p.day}
                cx={x(i)}
                cy={y(p.mood)}
                r={sel === i ? 9 : p.label ? 7 : 5}
                fill={moodColors[p.mood].tint}
                stroke={sel === i ? c.brand : moodColors[p.mood].word}
                strokeWidth={sel === i ? 3 : 2}
              />
            ))}
          </Svg>
          {points.map((p, i) =>
            p.label ? (
              <View key={`l${p.day}`} style={{ position: 'absolute', left: x(i) - 36, top: y(p.mood) - 34, width: 72, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Image source={moodById(p.mood).face} resizeMode="contain" style={{ width: 16, height: 16 }} />
                  <T v="caption" tint={moodColors[p.mood].word} allowFontScaling={false} style={{ fontSize: 11, lineHeight: 14, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {moodById(p.mood).label}
                  </T>
                </View>
              </View>
            ) : null,
          )}
          {points.map((p, i) => (
            <View key={`d${p.day}`} style={{ position: 'absolute', left: x(i) - 30, top: H - BOTTOM + space.xs, width: 60, alignItems: 'center' }}>
              <T v="caption" tint={sel === i ? c.brand : c.textMuted} allowFontScaling={false} style={{ fontSize: 11, lineHeight: 14, fontFamily: sel === i ? 'PlusJakartaSans_700Bold' : undefined }}>
                {p.day}
              </T>
            </View>
          ))}
          {/* One tap column per point: the whole height of the chart, at least 56 dp wide with the hit layer. */}
          {points.map((p, i) => (
            <Tappable
              key={`t${p.day}`}
              label={`${p.detail?.title ?? p.day}: ${moodById(p.mood).label}. ${sel === i ? 'Hide details' : 'Show what Alex shared'}`}
              selected={sel === i}
              onPress={() => setSel(sel === i ? null : i)}
              style={{ position: 'absolute', left: x(i) - colW / 2, width: colW, top: 0, height: H }}
            />
          ))}
        </>
      ) : null}
    </View>
    {picked ? <MoodDetailCard point={picked} /> : (
      <T v="bodySm" color="textSecondary" center>
        Tap a {points[0]?.day.startsWith('WEEK') ? 'week' : 'day'} to see what Alex shared.
      </T>
    )}
    </View>
  );
}

function MoodDetailCard({ point }: { point: MoodPoint }) {
  const { c } = useTheme();
  const m = moodById(point.mood);
  const d = point.detail;
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: moodColors[point.mood].tint, borderRadius: radius.card, padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={m.face} resizeMode="contain" style={{ width: 34, height: 34 }} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="section">{d?.title ?? point.day}</T>
          <T v="bodySm" color="textSecondary">
            {d?.when ?? ''}
          </T>
        </View>
        <T v="mood" tint={moodColors[point.mood].word} style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          {m.label}
        </T>
      </View>
      {d?.feelings?.length ? (
        <View style={{ gap: space.xs }}>
          <T v="caption" color="textSecondary">
            Words Alex picked
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {d.feelings.map((f) => (
              <View key={f} style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs }}>
                <T v="bodySmMedium">{f}</T>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {d?.topics?.length ? (
        <T v="bodySm" color="textSecondary">
          About: {d.topics.join(', ')}
        </T>
      ) : null}
      {d?.note ? <T v="body">{d.note}</T> : null}
    </View>
  );
}
