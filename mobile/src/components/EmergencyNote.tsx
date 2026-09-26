import { View } from 'react-native';
import { EMERGENCY_NOTE, EMERGENCY_NOTE_SHORT, helpline } from '../data/helplines';
import { callNumber } from '../lib/call';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { T } from './ui/T';

/** "SafeGate is not an emergency service." — on every screen that offers emergency help. Amber tint, never red. */
export function EmergencyNote({ short, callButton }: { short?: boolean; callButton?: boolean }) {
  const { c } = useTheme();
  const n000 = helpline('000');
  return (
    <Card tone="help" padding={space.lg}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <Icon name="info" size={20} color={c.onHelpTint} />
          <T v="bodySmMedium" tint={c.onHelpTint} style={{ flex: 1 }}>
            {short ? EMERGENCY_NOTE_SHORT : EMERGENCY_NOTE}
          </T>
        </View>
        {callButton ? (
          <Button title="Call 000" variant="help" iconLeft="phone" label="Call 000, emergency services" onPress={() => callNumber(n000.number, 'emergency services')} />
        ) : null}
      </View>
    </Card>
  );
}
