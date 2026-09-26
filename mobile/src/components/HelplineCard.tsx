import { View } from 'react-native';
import type { Helpline } from '../data/helplines';
import { callNumber, contact } from '../lib/call';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Icon, type IconName } from './ui/Icon';
import { T } from './ui/T';

const ICON: Record<Helpline['id'], IconName> = { '000': 'alert-circle', 'kids-helpline': 'smile', lifeline: 'heart' };

/**
 * A help line as a raised card (Get help, Help lines): icon in the help tint, name, what it's for, the number,
 * Call / Text / Chat (all demo alerts — nothing dials), and its "Checked …" line. Written contact is first-class.
 * 000 gets the solid amber Call and an optional line ("If Alex is in danger right now").
 */
export function HelplineCard({ h, note }: { h: Helpline; note?: string }) {
  const { c } = useTheme();
  const emergency = h.id === '000';
  return (
    <Card tone="raised" padding={space.lg}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: c.helpTint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={ICON[h.id]} size={22} color={c.onHelpTint} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="heading">{h.name}</T>
            <T v="bodySm" color="textSecondary">
              {note ?? h.detail}
            </T>
            {!emergency ? (
              <T v="bodyLg" color="brand" style={{ marginTop: space.xs }}>
                {h.number}
              </T>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {h.actions.map((a) =>
            a === 'call' ? (
              <Button
                key={a}
                title={emergency ? 'Call 000' : 'Call'}
                size="small"
                variant={emergency ? 'help' : 'primary'}
                iconLeft="phone"
                label={emergency ? 'Call 000, emergency services' : `Call ${h.name} on ${h.number}`}
                onPress={() => callNumber(h.number, emergency ? 'emergency services' : h.name)}
              />
            ) : (
              <Button
                key={a}
                title={a === 'chat' ? 'Chat' : 'Text'}
                size="small"
                variant="outline"
                iconLeft={a === 'chat' ? 'message-circle' : 'message-square'}
                label={`${a === 'chat' ? 'Chat with' : 'Text'} ${h.name}`}
                onPress={() => contact(a, h.name)}
              />
            ),
          )}
        </View>
        {h.checked ? (
          <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
            <Icon name="check" size={14} color={c.textMuted} />
            <T v="caption" color="textMuted">
              {h.checked}
            </T>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
