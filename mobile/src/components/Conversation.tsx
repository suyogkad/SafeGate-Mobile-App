import type { ReactNode } from 'react';
import { View } from 'react-native';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { T } from './ui/T';

export type ConvLine = { id?: number | string; from: 'companion' | 'me'; text: string; card?: boolean; taskId?: string };

/**
 * Talk / transcript layout (HANDOFF.md §6.7) — reads like a page, not chat bubbles.
 * Companion lines in bodyLg navy, the child's lines in plain body text.
 * A small speaker caption appears whenever the speaker changes, so colour is never the only signal.
 * The companion card is a blue50 card with an "AI companion" badge. Plain text only: no links, avatars or reactions.
 */
export function Conversation({
  lines,
  childLabel = 'You',
  companionLabel = 'AI companion',
  cardActions,
  footer,
}: {
  lines: ConvLine[];
  /** caption for the child's lines: "You" in Talk, the child's name in the parent's transcript */
  childLabel?: string;
  /**
   * Caption for the other side. "AI companion" is right in Talk, where the words
   * really came from the companion through the reply check. The journal's prompts are
   * fixed written ideas, so calling them the AI there would say something untrue
   * about where they came from (safety rule 3).
   */
  companionLabel?: string;
  /** buttons under a companion card (child's Talk only) */
  cardActions?: (line: ConvLine) => ReactNode;
  footer?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.lg }}>
      {lines.map((l, i) => {
        const showSpeaker = !l.card && (i === 0 || lines[i - 1].from !== l.from || lines[i - 1].card);
        if (l.card) {
          return (
            <Card key={l.id ?? i} tone="tint" padding={space.lg}>
              <View style={{ gap: space.md }} accessible accessibilityLabel={`AI companion: ${l.text}`}>
                <Badge label="AI companion" tone="brand" />
                {/* "Here's one way to start. 1. … 2. … 3. …" reads better as a list (checklist 1.1.3). */}
                {l.text.split(/\s(?=\d\.\s)/).map((part, j) => (
                  <T key={j} v="bodyLg" color="brand" selectable dataDetectorType="none">
                    {part}
                  </T>
                ))}
              </View>
              {cardActions ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>{cardActions(l)}</View> : null}
            </Card>
          );
        }
        const companion = l.from === 'companion';
        return (
          <View key={l.id ?? i} style={{ gap: 2 }} accessible accessibilityLabel={`${companion ? companionLabel : childLabel}: ${l.text}`}>
            {showSpeaker ? (
              <T v="caption" color="textMuted">
                {companion ? companionLabel : childLabel}
              </T>
            ) : null}
            <T v={companion ? 'bodyLg' : 'body'} tint={companion ? c.brand : c.text} selectable dataDetectorType="none">
              {l.text}
            </T>
          </View>
        );
      })}
      {footer}
    </View>
  );
}
