// TODO(safegate): placeholder wording — needs a clinician's review before real use.

export type HelpContact = '000' | 'grown-up' | 'kids-helpline';

export type HelpTopic = {
  id: 'unsafe' | 'hurting' | 'scared' | 'hurts';
  chip: string;
  title: string;
  intro: string;
  steps: string[];
  contacts: HelpContact[];
  /** "Let Jordan know". Never true for "Someone is hurting me" (the grown-up could be the person). */
  tellGrownUp: boolean;
  calm: boolean;
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'unsafe',
    chip: "I don't feel safe",
    title: "Let's get you somewhere safe.",
    intro: 'You did the right thing by looking for help.',
    steps: [
      'If you are in danger right now, call 000.',
      'Go to a place with people you trust.',
      'Tell a grown-up near you how you feel.',
    ],
    contacts: ['000', 'grown-up', 'kids-helpline'],
    tellGrownUp: true,
    calm: false,
  },
  {
    id: 'hurting',
    chip: 'Someone is hurting me',
    title: 'It is not your fault.',
    intro: 'Nobody is allowed to hurt you. You can get help, even if someone said not to tell.',
    steps: [
      'If you are in danger right now, call 000.',
      'Kids Helpline is free and there any time. They will listen.',
      'You can tell Priya in your session, or a teacher you trust.',
    ],
    contacts: ['000', 'kids-helpline'],
    tellGrownUp: false,
    calm: false,
  },
  {
    id: 'scared',
    chip: "I'm scared",
    title: 'Being scared is hard. You are not alone.',
    intro: 'Try one small thing at a time.',
    steps: [
      'Press your feet into the floor. Breathe out slowly.',
      'Tell a grown-up you trust how you feel.',
      'If you are in danger right now, call 000.',
    ],
    contacts: ['grown-up', 'kids-helpline', '000'],
    tellGrownUp: true,
    calm: true,
  },
  {
    id: 'hurts',
    chip: 'Something hurts',
    title: "Let's get someone to help.",
    intro: 'A grown-up can check what hurts and help it feel better.',
    steps: ['Tell a grown-up near you now.', 'If it hurts a lot, or it is hard to breathe, call 000.'],
    contacts: ['grown-up', '000'],
    tellGrownUp: true,
    calm: false,
  },
];

export const helpTopic = (id: string) => HELP_TOPICS.find((t) => t.id === id);
