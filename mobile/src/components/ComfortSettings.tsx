import { View } from 'react-native';
import { useApp, type Comfort } from '../store/app';
import { space } from '../theme/tokens';
import { Card } from './ui/Card';
import { ListRow } from './ui/ListRow';
import { SwitchRow } from './ui/Switch';
import { T } from './ui/T';

const CYCLES = {
  textSize: ['Normal', 'Bigger', 'Biggest'],
  readingSpeed: ['Slower', 'Normal', 'Faster'],
  country: ['Australia'],
} as const;

const TOGGLES: { key: keyof Comfort; title: string }[] = [
  { key: 'simpleWords', title: 'Simple words' },
  { key: 'readAloud', title: 'Read things aloud' },
  { key: 'speak', title: 'Speak to SafeGate' },
  { key: 'pictures', title: 'Show pictures with words' },
  { key: 'fewerChoices', title: 'Fewer choices' },
  { key: 'strongerColours', title: 'Stronger colours' },
  { key: 'movement', title: 'Movement' },
  { key: 'sounds', title: 'Sounds' },
  { key: 'letterSpacing', title: 'More space between letters' },
];

/**
 * The shared Comfort settings (C23 child "You" and P07 parent "Alex's comfort" edit the same store values).
 * Label/value rows (value cycles on tap, shown in blue) + switch rows, in white cards
 * lifted off the branded background.
 */
export function ComfortSettings() {
  const comfort = useApp((s) => s.comfort);
  const set = useApp((s) => s.setComfort);

  const cycle = <K extends keyof typeof CYCLES>(key: K) => {
    const list = CYCLES[key] as readonly string[];
    const i = list.indexOf(comfort[key] as string);
    set(key, list[(i + 1) % list.length] as Comfort[K]);
  };

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.sm }}>
        <T v="section" header>
          Reading
        </T>
        <T v="bodySm" color="textMuted">
          How words look and sound.
        </T>
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <ListRow title="Text size" value={comfort.textSize} onPress={() => cycle('textSize')} label={`Text size, ${comfort.textSize}. Tap to change`} divider />
          <ListRow title="Reading speed" value={comfort.readingSpeed} onPress={() => cycle('readingSpeed')} label={`Reading speed, ${comfort.readingSpeed}. Tap to change`} divider />
          <ListRow title="Country" value={comfort.country} label={`Country, ${comfort.country}`} />
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <T v="section" header>
          Turn on what helps
        </T>
        <T v="bodySm" color="textMuted">
          Switch things on or off.
        </T>
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          {TOGGLES.map((t, i) => (
            <SwitchRow key={t.key} title={t.title} on={!!comfort[t.key]} onToggle={() => set(t.key, !comfort[t.key] as never)} divider={i < TOGGLES.length - 1} />
          ))}
        </Card>
      </View>
    </View>
  );
}
