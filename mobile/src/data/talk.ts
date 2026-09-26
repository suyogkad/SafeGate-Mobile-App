export const greeting = (name: string) => `Hi ${name}. What would you like to talk about?`;

/** The steps in the homework companion card; "Open as a checklist" opens exactly these (HOMEWORK_TASK below). */
const HOMEWORK_STEPS = ['Put the sheet and a pencil on the desk.', 'Do the first question only.', 'Take a short break.'];

export const IDEAS = ['Break it into steps', 'Explain it simply', 'Tell me a joke'];

/**
 * DEMO ONLY: scripted companion replies, picked by simple matching so the demo has variety (the idea chips each get
 * their own answer, a follow-up is understood, jokes take turns). A real build gets replies from the AI, only after
 * the safety check, and never decides safety here. The wording follows the product rules: the companion never
 * claims to be a person or to have feelings, and points to grown-ups and the therapist for the hard things.
 */
export type Reply = { text: string; card?: boolean; taskId?: TaskId };

/** What the last reply asked about, so a short answer ("Maths", "my room") makes sense. */
type Topic = 'homeworkSubject' | 'stepsWhat' | 'explainWhat' | 'joke' | null;
let topic: Topic = null;
let jokeTurn = 0;
let fallbackTurn = 0;

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

const JOKES = [
  'Why did the maths book look sad? It had too many problems.',
  'What do you call a sleeping dinosaur? A dino-snore!',
  'Why can’t a bicycle stand up on its own? It’s two tired.',
  'What do you call a bear with no teeth? A gummy bear!',
];

const EXPLAIN: { words: string[]; text: string }[] = [
  {
    words: ['fraction'],
    text: 'A fraction is a part of something whole. If you cut a pizza into 4 equal slices and eat 1, you ate one quarter, written 1/4. The bottom number is how many parts there are. The top number is how many you have.',
  },
  {
    words: ['sky', 'blue'],
    text: 'Sunlight has all the colours mixed together. When it comes through the air, the blue part bounces around the most, so blue light reaches your eyes from every part of the sky.',
  },
  {
    words: ['plant', 'photosynthesis', 'grow'],
    text: 'Plants make their own food. Their leaves use sunlight, water and air to make sugar, and that sugar helps them grow. It’s a bit like a tiny kitchen inside every leaf.',
  },
  {
    words: ['rain', 'cloud'],
    text: 'Clouds are made of tiny drops of water. When lots of drops join together they get too heavy to float, so they fall as rain.',
  },
];

const cardFor = (id: TaskId, lead: string): Reply => ({
  text: `${lead} ${TASKS[id].steps.map((step, i) => `${i + 1}. ${step.charAt(0).toUpperCase()}${step.slice(1)}.`).join(' ')}`,
  card: true,
  taskId: id,
});

/** Which checklist a "break it into steps" request is about, if we have one for it. */
function stepsTopic(t: string): TaskId | null {
  if (has(t, ['school', 'morning', 'ready'])) return 'school';
  if (has(t, ['room', 'tidy', 'clean', 'mess'])) return 'room';
  if (has(t, ['homework', 'maths', 'math', 'reading', 'spelling', 'writing', 'science', 'sheet'])) return 'homework';
  if (has(t, ['bed', 'sleep', 'night'])) return 'bedtime';
  return null;
}

export function replyTo(raw: string): Reply {
  const t = raw.trim().toLowerCase();
  const was = topic;
  topic = null;

  // The three idea chips
  if (t === 'break it into steps') {
    topic = 'stepsWhat';
    return { text: 'Sure. What would you like to break into steps? For example: getting ready for school, tidying your room, or homework.' };
  }
  if (t === 'explain it simply') {
    topic = 'explainWhat';
    return { text: 'Okay. What would you like explained? You can ask things like “What are fractions?” or “Why is the sky blue?”' };
  }
  if (t === 'tell me a joke' || (was === 'joke' && has(t, ['yes', 'another', 'more', 'again', 'one more']))) {
    const joke = JOKES[jokeTurn++ % JOKES.length];
    topic = 'joke';
    return { text: `${joke} Want another one?` };
  }

  // Follow-ups to what was just asked
  if (was === 'homeworkSubject') {
    return cardFor('homework', 'Here’s one way to start.');
  }
  if (was === 'stepsWhat') {
    const id = stepsTopic(t);
    if (id) return cardFor(id, 'Here are some small steps.');
    return { text: 'Let’s try: 1. Say what the first tiny step is. 2. Do only that. 3. Take a short break. Then tell me how it went.' };
  }
  if (was === 'explainWhat' || has(t, ['what is', 'what are', 'why is', 'why do', 'how do', 'explain'])) {
    const hit = EXPLAIN.find((e) => has(t, e.words));
    if (hit) return { text: hit.text };
    if (was === 'explainWhat') return { text: 'That’s a good question. I don’t have a simple answer for that one yet. You could ask your teacher or your grown-up, or try another question.' };
  }

  // Things children often start with
  if (has(t, ['homework', 'don’t know where to start', "don't know where to start", 'stuck'])) {
    topic = 'homeworkSubject';
    return { text: 'That happens to lots of people. What subject is it?' };
  }
  const steps = has(t, ['steps', 'how do i', 'help me']) ? stepsTopic(t) : null;
  if (steps) return cardFor(steps, 'Here are some small steps.');
  if (/^(hi|hello|hey)\b/.test(t) && t.length < 16) return { text: 'Hi! What’s on your mind today?' };
  if (has(t, ['thank'])) return { text: 'You’re welcome. You can come back any time.' };
  if (has(t, ['sad', 'worried', 'scared', 'angry', 'upset', 'nervous', 'lonely'])) {
    return { text: 'Thanks for telling me. That sounds hard. Do you want to keep talking, try one calm step, or tell a grown-up you trust?' };
  }
  if (has(t, ['bored'])) return { text: 'Here are some ideas: draw something you can see, stretch like a cat for ten seconds, or ask me for a joke.' };
  if (has(t, ['joke', 'funny'])) {
    const joke = JOKES[jokeTurn++ % JOKES.length];
    topic = 'joke';
    return { text: `${joke} Want another one?` };
  }

  // Otherwise, take turns between a few gentle replies
  const FALLBACKS = [
    'Thanks for telling me. Do you want to keep talking, or try one calm step?',
    'Can you tell me a bit more about that?',
    'Okay. What would help most right now: some steps, a simple explanation, or a short break?',
  ];
  return { text: FALLBACKS[fallbackTurn++ % FALLBACKS.length] };
}

/** What Speak "heard" in the demo. */
export const SPOKEN_TEXT = "I have homework and I don't know where to start";

// DEMO ONLY. A real build decides this on the server, never with a keyword check in the app.
export const DEMO_TRIGGERS = {
  calm: ['calm', 'calm mode'],
  offline: ['offline'],
  notSent: ['not sent'],
  blocked: ['blocked'],
} as const;

export type DemoTrigger = keyof typeof DEMO_TRIGGERS;

// DEMO ONLY. Exact match after trim + lowercase.
export function matchTrigger(text: string): DemoTrigger | null {
  const t = text.trim().toLowerCase();
  for (const key of Object.keys(DEMO_TRIGGERS) as DemoTrigger[]) {
    if ((DEMO_TRIGGERS[key] as readonly string[]).includes(t)) return key;
  }
  return null;
}

export type Task = { title: string; steps: string[] };
export type TaskId = 'school' | 'homework' | 'room' | 'bedtime';

/** C21 My task. `school` is the spec's default task; the others are what a Talk card's "Open as a checklist" opens. */
export const TASKS: Record<TaskId, Task> = {
  school: {
    title: 'Get ready for school',
    steps: ['put on your school clothes', 'eat breakfast', 'pack your bag', 'brush your teeth', 'put your shoes on'],
  },
  homework: {
    title: 'Start my homework',
    steps: HOMEWORK_STEPS.map((step) => step.charAt(0).toLowerCase() + step.slice(1, -1)),
  },
  room: {
    title: 'Tidy my room',
    steps: ['put clothes in the basket', 'put books back on the shelf', 'put toys in their box', 'make the bed'],
  },
  bedtime: {
    title: 'Get ready for bed',
    steps: ['have a bath or shower', 'put on pyjamas', 'brush your teeth', 'read a short book', 'lights out'],
  },
};
