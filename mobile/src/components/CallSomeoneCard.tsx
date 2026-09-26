import { View } from 'react-native';
import type { HelpContact } from '../data/helpTopics';
import { EMERGENCY_NOTE_SHORT, helpline } from '../data/helplines';
import { PARENT } from '../data/people';
import { callNumber } from '../lib/call';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Divider } from './ui/bits';
import { T } from './ui/T';

/**
 * "If you need help right now, you can call someone:" — 000 · Kids Helpline · Lifeline, each with Call.
 * Calls go through callNumber() (demo alert, never dials).
 */
export function CallSomeoneCard({
  contacts = ['000', 'kids-helpline', 'lifeline'],
  intro = 'If you need help right now, you can call someone:',
}: {
  contacts?: (HelpContact | 'lifeline')[];
  intro?: string;
}) {
  const { c } = useTheme();
  const rows = contacts.map((id) => {
    if (id === 'grown-up') return { key: id, name: PARENT.first, detail: 'Your grown-up', number: PARENT.phone, emergency: false };
    const h = helpline(id);
    return { key: id, name: h.name, detail: id === '000' ? 'If you are in danger' : h.number, number: h.number, emergency: id === '000' };
  });
  return (
    <Card tone="raised" padding={space.lg}>
      <View style={{ gap: space.md }}>
        <T v="bodyLg">{intro}</T>
        {rows.map((r, i) => (
          <View key={r.key} style={{ gap: space.md }}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <T v="section">{r.name}</T>
                <T v="bodySm" color="textMuted">
                  {r.detail}
                </T>
              </View>
              <Button
                title="Call"
                size="small"
                iconLeft="phone"
                variant={r.emergency ? 'help' : 'primary'}
                label={`Call ${r.name}${r.number !== r.name ? ` on ${r.number}` : ''}`}
                onPress={() => callNumber(r.number, r.name)}
              />
            </View>
          </View>
        ))}
        <T v="caption" tint={c.textMuted}>
          {EMERGENCY_NOTE_SHORT}
        </T>
      </View>
    </Card>
  );
}
