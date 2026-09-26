/**
 * P25 Help lines. Helpline cards (icon in the help tint, number, Call / Text / Chat, "Checked …") and the
 * emergency note, on the help background. Parent copy for 000.
 * Numbers are data (src/data/helplines.ts), never generated; every call/text/chat is a demo alert.
 */
import { View } from 'react-native';
import { EmergencyNote } from '@/components/EmergencyNote';
import { Header } from '@/components/Header';
import { HelplineCard } from '@/components/HelplineCard';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { T } from '@/components/ui/T';
import { HELPLINES } from '@/data/helplines';
import { useChildName } from '@/store/app';
import { space } from '@/theme/tokens';

export default function HelpLines() {
  const name = useChildName();
  return (
    <Screen backdrop="help" header={<Header title="Help lines" getHelp={false} fallback="/parent/account" />}>
      <T v="bodyLg" color="textSecondary">
        People you or {name} can call, text or chat with.
      </T>
      <View style={{ gap: space.md }}>
        <Stagger>
          {HELPLINES.map((h) => (
            <HelplineCard key={h.id} h={h} note={h.id === '000' ? `If ${name} is in danger right now` : undefined} />
          ))}
        </Stagger>
      </View>
      <EmergencyNote short />
    </Screen>
  );
}
