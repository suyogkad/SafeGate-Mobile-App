// Emergency numbers are data, never constants in screens. Each carries its "Checked" line.
// TODO(safegate): re-verify numbers before any real release.

export type ContactAction = 'call' | 'text' | 'chat';

export type Helpline = {
  id: '000' | 'kids-helpline' | 'lifeline';
  name: string;
  detail: string;
  number: string;
  checked?: string;
  actions: ContactAction[];
};

export const HELPLINES: Helpline[] = [
  { id: '000', name: '000', detail: 'Emergency services', number: '000', actions: ['call'] },
  {
    id: 'kids-helpline',
    name: 'Kids Helpline',
    detail: 'Free, 24 hours, for ages 5 to 25.',
    number: '1800 55 1800',
    checked: 'Checked 14 September 2026',
    actions: ['call', 'chat'],
  },
  {
    id: 'lifeline',
    name: 'Lifeline',
    detail: 'Someone to talk to, any time.',
    number: '13 11 14',
    checked: 'Checked 14 September 2026',
    actions: ['call', 'text', 'chat'],
  },
];

export const helpline = (id: Helpline['id']) => HELPLINES.find((h) => h.id === id)!;

export const EMERGENCY_NOTE = 'SafeGate is not an emergency service. If you are in danger, call 000.';
export const EMERGENCY_NOTE_SHORT = 'SafeGate is not an emergency service.';
