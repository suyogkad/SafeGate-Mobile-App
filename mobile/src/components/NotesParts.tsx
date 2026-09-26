import { View } from 'react-native';
import type { SessionNotes } from '../data/practice';
import { artTints, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Stagger } from './ui/Appear';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { T } from './ui/T';

/**
 * The parts of session notes, one look everywhere: the parent's Session notes (P14), and the therapist's Session
 * and Write notes. Highlights = emoji in tinted circles; the message = the blue tint card; things to try = numbered
 * raised cards.
 */

const TINTS = [artTints.lavender, artTints.cyan, artTints.yellow];

export function EmojiCircle({ emoji, i }: { emoji: string; i: number }) {
  return (
    <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: TINTS[i % 3], alignItems: 'center', justifyContent: 'center' }}>
      <T v="heading" allowFontScaling={false} style={{ fontSize: 22, lineHeight: 28 }}>
        {emoji}
      </T>
    </View>
  );
}

export function Highlights({ items }: { items: SessionNotes['highlights'] }) {
  return (
    <Stagger>
      {items.map((h, i) => (
        <View key={h.text + i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <EmojiCircle emoji={h.emoji} i={i} />
          <T v="bodyLg" style={{ flex: 1 }}>
            {h.text}
          </T>
        </View>
      ))}
    </Stagger>
  );
}

export function SharedMessage({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <Card tone="tint" r={24} padding={space.xl}>
      <View style={{ gap: space.sm }}>
        <Icon name="message-square" size={20} color={c.brand} />
        <T v="bodyLg" color="brand">
          {text}
        </T>
      </View>
    </Card>
  );
}

export function NumberCircle({ n }: { n: number }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
      <T v="section" color="brand">
        {n}
      </T>
    </View>
  );
}

export function TryAtHome({ items }: { items: SessionNotes['tryAtHome'] }) {
  return (
    <Stagger>
      {items.map((t, i) => (
        <Card key={t.title + i} tone="raised" padding={space.lg}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <NumberCircle n={i + 1} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="section">{t.title}</T>
              <T v="body" color="textSecondary">
                {t.line}
              </T>
            </View>
          </View>
        </Card>
      ))}
    </Stagger>
  );
}

/** "Only you can see these": the therapist's working notes, grey with a lock so the difference is in words too. */
export function WorkingNotesCard({ children, parentFirst, name }: { children: React.ReactNode; parentFirst: string; name: string }) {
  const { c } = useTheme();
  return (
    <Card tone="surface" r={24} padding={space.lg}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="lock" size={18} color={c.textSecondary} />
          <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
            Only you can see these. {parentFirst} and {name} never see them.
          </T>
        </View>
        {children}
      </View>
    </Card>
  );
}
