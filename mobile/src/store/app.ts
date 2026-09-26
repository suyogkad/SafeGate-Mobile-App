import { create } from 'zustand';
import { CHILD_DEFAULT_NAME } from '../data/people';
import { DEFAULT_SESSION, type Session } from '../data/sessions';
import { DEFAULT_DAY, type DayItemId, type DaySettings } from '../data/day';
import { mood as moodById, type MoodId } from '../data/moods';
import { SEED_NOTIFICATIONS, SEED_THERAPIST_NOTIFICATIONS, type Notification, type NotificationAudience } from '../data/notifications';
import { clockTime } from '../lib/time';
import { moodColors } from '../theme/tokens';
import { TASKS, type TaskId } from '../data/talk';
import { DIRECTORY_HOURS, SEED_AVAILABILITY, SEED_GOALS, SEED_NOTES, type Availability, type ClientId, type MeetKind, type SessionNotes, type TimeRange, type Weekday } from '../data/practice';
import { bookingsFor, nextFree, sessionTherapistId } from '../lib/schedule';
import { THERAPISTS, type Therapist } from '../data/therapists';

/** In-memory demo state. A restart or page reload resets everything (no persistence, on purpose). */

export type CalmMode = 'off' | 'active' | 'seen';

export type ChatMessage = { id: number; from: 'companion' | 'me'; text: string; card?: boolean; /** the checklist a steps card opens */ taskId?: TaskId };

export type Checkin = { mood: MoodId; feelings: string[]; topics: string[]; at: string };

export type ChildProfile = {
  name: string;
  age: string | null;
  feeling: string | null;
  hard: string[];
  help: string | null;
  communicate: string[];
};

export type JournalEntry = { prompt: string; text: string; at: string };

export type Comfort = {
  textSize: 'Normal' | 'Bigger' | 'Biggest';
  readingSpeed: 'Slower' | 'Normal' | 'Faster';
  country: 'Australia';
  simpleWords: boolean;
  readAloud: boolean;
  speak: boolean;
  pictures: boolean;
  fewerChoices: boolean;
  strongerColours: boolean;
  movement: boolean;
  sounds: boolean;
  letterSpacing: boolean;
};

export const DEFAULT_COMFORT: Comfort = {
  textSize: 'Bigger',
  readingSpeed: 'Normal',
  country: 'Australia',
  simpleWords: true,
  readAloud: true,
  speak: true,
  pictures: true,
  fewerChoices: false,
  strongerColours: false,
  movement: false,
  sounds: false,
  letterSpacing: false,
};

type DoneItem = 'checkin' | 'chat' | 'calm' | 'journal' | 'tasks';

/** Account → Alerts. "Needs you" (calm mode, help requests) is always on and has no switch. */
export type AlertPrefs = { sessions: boolean; eachActivity: boolean; digest: boolean };

/** Therapist Account → Alerts. "Needs attention" (calm mode, emergency) is always on. */
export type TherapistPrefs = { bookings: boolean; sharing: boolean; notesReminders: boolean };

/** The parts of a therapist's profile they can edit themselves (T11 → Your profile). */
export type ProfileEdit = Partial<Pick<Therapist, 'role' | 'years' | 'tagline' | 'about' | 'blurb' | 'goodFor' | 'clinic'>>;

type NewNotification = Omit<Notification, 'id' | 'childId' | 'read' | 'day' | 'when'> & { childId?: string };

interface AppState {
  childLinked: boolean;
  parentSignedIn: boolean;
  /** The signed-in adult, from the backend. Null in the demo or before sign-in. */
  account: { id: string; name: string; email: string; role: 'parent' | 'therapist' } | null;
  /** The real child this device is acting for; the companion and check-ins need it. */
  childId: string | null;
  calmMode: CalmMode;
  calmAt: string | null;
  /** when the parent tapped I've seen this (the therapist's alert shows it) */
  calmSeenAt: string | null;
  afterCalm: boolean;
  doneToday: Record<DoneItem, boolean>;
  messages: ChatMessage[];
  pendingSpeech: string | null;
  /** which task My task shows; the Talk card switches it to its own steps */
  taskId: TaskId;
  taskDone: boolean[];
  checkin: Checkin | null;
  helpRequest: string | null;
  helpRequestAt: string | null;
  /** parent tapped I've seen this on a Let Jordan know request */
  helpSeen: boolean;
  comfort: Comfort;
  journal: JournalEntry[];
  child: ChildProfile;
  emergency: { by: string; at: string } | null;
  session: Session;
  sharedWeek: boolean;
  day: DaySettings;
  notifications: Notification[];
  alertPrefs: AlertPrefs;
  therapistSignedIn: boolean;
  therapistPrefs: TherapistPrefs;
  /** Priya's hours (the demo has one working therapist). Families' Book reads open times from it. */
  availability: Availability;
  /** by booking id; the shared part is the parent's Session notes */
  sessionNotes: Record<string, SessionNotes>;
  goals: Record<ClientId, string[]>;
  /** what a therapist changed on their profile (merged over the directory data; families see it at once) */
  profileEdits: Partial<Record<Therapist['id'], ProfileEdit>>;

  setAccount(a: AppState['account']): void;
  setChildId(id: string | null): void;
  linkChild(): void;
  signInParent(): void;
  signInTherapist(): void;
  signOut(): void;
  setCalmMode(mode: CalmMode): void;
  setAfterCalm(b: boolean): void;
  markDone(item: DoneItem): void;
  addMessage(msg: Omit<ChatMessage, 'id'>): void;
  setPendingSpeech(t: string | null): void;
  openTask(id: TaskId): void;
  toggleStep(i: number): void;
  resetTask(): void;
  setCheckin(c: Omit<Checkin, 'at'>): void;
  requestHelp(topic: string): void;
  ackHelp(): void;
  setComfort<K extends keyof Comfort>(key: K, value: Comfort[K]): void;
  addJournal(entry: Omit<JournalEntry, 'at'>): void;
  updateChild(patch: Partial<ChildProfile>): void;
  requestEmergency(by: string): void;
  bookSession(s: Session): void;
  shareWeek(): void;
  setDay(patch: Partial<Omit<DaySettings, 'on'>>): void;
  toggleDayItem(id: DayItemId): void;
  notify(n: NewNotification): void;
  markRead(id: string): void;
  markAllRead(audience: NotificationAudience): void;
  /** opening what an item is about counts as reading it (e.g. a client's Shared tab clears "Jordan shared Alex's week") */
  markReadWhere(match: (n: Notification) => boolean): void;
  /** the therapist's "Noted" on an alert: it leaves Needs attention, nobody else is told */
  resolveNotification(id: string): void;
  setAlertPref(key: keyof AlertPrefs, value: boolean): void;
  setTherapistPref(key: keyof TherapistPrefs, value: boolean): void;
  setAvailability(patch: Partial<Omit<Availability, 'weekly' | 'timeOff' | 'extra' | 'removed'>>): void;
  setDayHours(day: Weekday, ranges: TimeRange[]): void;
  addExtraTime(t: { date: string; start: number; lengthMin: number; kind: MeetKind | null }): void;
  /** takes one open time away: a one-off time is deleted, a weekly one is skipped on that date */
  removeOpenTime(date: string, start: number, extraId?: string): void;
  addTimeOff(t: { from: string; to: string; label: string }): void;
  removeTimeOff(id: string): void;
  /** saves a draft, or shares the family part (the parent is told, and "Write notes" leaves Needs attention) */
  saveNotes(bookingId: string, notes: Omit<SessionNotes, 'sharedAt'>, share: boolean, when: string): void;
  setGoals(client: ClientId, goals: string[]): void;
  /** the child's message to their therapist from Get help (the therapist is told) */
  messageTherapist(text: string): void;
  updateProfile(id: Therapist['id'], patch: ProfileEdit): void;
}

export type AppStateSnapshot = AppState;

let nextId = 1;
let nextNotification = 1;

/** A live notification: today, now, unread. Newest first. */
const withNotification = (list: Notification[], n: NewNotification): Notification[] => [
  { childId: 'alex', ...n, id: `live-${nextNotification++}`, day: 'today', when: clockTime(), read: false },
  ...list,
];

/** Marks the urgent items of one type as dealt with, and so read (they leave "Needs you" but stay in the list). */
const resolve = (list: Notification[], type: Notification['type'], audience?: NotificationAudience) =>
  list.map((n) => (n.type === type && n.urgent && !n.resolved && (!audience || n.audience === audience) ? { ...n, resolved: true, read: true } : n));

/** "THU 15 OCT" → "Thu 15 Oct" */
const shortDate = (short: string) => short.toLowerCase().replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

export const useApp = create<AppState>((set) => ({
  childLinked: false,
  parentSignedIn: false,
  account: null,
  childId: null,
  calmMode: 'off',
  calmAt: null,
  calmSeenAt: null,
  afterCalm: false,
  doneToday: { checkin: false, chat: false, calm: false, journal: false, tasks: false },
  messages: [],
  pendingSpeech: null,
  taskId: 'school',
  taskDone: TASKS.school.steps.map(() => false),
  checkin: null,
  helpRequest: null,
  helpRequestAt: null,
  helpSeen: false,
  comfort: DEFAULT_COMFORT,
  journal: [],
  child: { name: CHILD_DEFAULT_NAME, age: '9 to 12', feeling: null, hard: [], help: null, communicate: [] },
  emergency: null,
  session: DEFAULT_SESSION,
  sharedWeek: false,
  day: DEFAULT_DAY,
  notifications: [...SEED_NOTIFICATIONS, ...SEED_THERAPIST_NOTIFICATIONS],
  alertPrefs: { sessions: true, eachActivity: false, digest: true },
  therapistSignedIn: false,
  therapistPrefs: { bookings: true, sharing: true, notesReminders: true },
  availability: SEED_AVAILABILITY,
  sessionNotes: SEED_NOTES,
  goals: SEED_GOALS,
  profileEdits: {},

  setAccount: (account) => set({ account }),
  setChildId: (childId) => set({ childId }),

  // The first link tells the parent once; Alt+C (demo) links again without repeating it.
  linkChild: () =>
    set((s) =>
      s.childLinked || s.notifications.some((n) => n.type === 'linked')
        ? { childLinked: true }
        : {
            childLinked: true,
            notifications: withNotification(s.notifications, {
              audience: 'parent',
              type: 'linked',
              title: `${s.child.name}’s phone is linked`,
              detail: 'You can change their comfort settings any time.',
              href: '/parent/child-comfort?from=home',
              opens: 'Open comfort settings',
              urgent: false,
              push: false,
            }),
          },
    ),
  signInParent: () => set({ parentSignedIn: true }),
  signInTherapist: () => set({ therapistSignedIn: true }),
  // Only the "who is signed in" flags reset, so the demo can switch sides without losing the story.
  signOut: () => set({ childLinked: false, parentSignedIn: false, therapistSignedIn: false }),

  setCalmMode: (mode) =>
    set((s) => {
      const starts = s.calmMode === 'off' && mode === 'active';
      return {
        calmMode: mode,
        calmAt: starts ? clockTime() : mode === 'off' ? null : s.calmAt,
        calmSeenAt: mode === 'seen' && s.calmMode !== 'seen' ? clockTime() : mode === 'seen' ? s.calmSeenAt : null,
        emergency: mode === 'off' ? null : s.emergency,
        // The parent and the therapist are both told. The parent's "I've seen this" clears only the parent's item;
        // the therapist clears theirs with "Noted".
        notifications: starts
          ? withNotification(
              withNotification(s.notifications, {
                audience: 'therapist',
                type: 'calm',
                title: `${s.child.name}’s app switched to calm steps`,
                detail: 'Jordan was told too',
                href: '/therapist/alert?id=calm',
                opens: 'Open the alert',
                urgent: true,
                push: true,
              }),
              {
                audience: 'parent',
                type: 'calm',
                title: `${s.child.name}’s app switched to calm steps`,
                detail: 'Priya was told too',
                href: '/parent/alert?kind=calm',
                opens: 'Open the alert',
                urgent: true,
                push: true,
              },
            )
          : mode === 'active'
            ? s.notifications
            : mode === 'seen'
              ? resolve(s.notifications, 'calm', 'parent')
              : resolve(s.notifications, 'calm'),
      };
    }),
  setAfterCalm: (b) => set({ afterCalm: b }),
  markDone: (item) => set((s) => ({ doneToday: { ...s.doneToday, [item]: true } })),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, { ...msg, id: nextId++ }] })),
  setPendingSpeech: (t) => set({ pendingSpeech: t }),
  // Opening the same task keeps its ticks; switching tasks starts the new one fresh.
  openTask: (id) => set((s) => (s.taskId === id ? {} : { taskId: id, taskDone: TASKS[id].steps.map(() => false) })),
  toggleStep: (i) => set((s) => ({ taskDone: s.taskDone.map((d, j) => (j === i ? !d : d)) })),
  resetTask: () => set((s) => ({ taskDone: s.taskDone.map(() => false) })),

  setCheckin: (c) =>
    set((s) => ({
      checkin: { ...c, at: clockTime() },
      notifications: withNotification(s.notifications, {
        audience: 'parent',
        type: 'checkin',
        title: `${s.child.name} checked in: ${moodById(c.mood).label}`,
        detail:
          [c.feelings.length ? `Words: ${c.feelings.join(', ')}` : '', c.topics.length ? `About: ${c.topics.join(', ')}` : '']
            .filter(Boolean)
            .join(' · ') || 'No words picked',
        href: '/parent/checkins?range=Day',
        opens: 'Open check-ins',
        urgent: false,
        push: s.alertPrefs.eachActivity,
        face: moodById(c.mood).face,
        tint: moodColors[c.mood].tint,
      }),
    })),
  requestHelp: (topic) =>
    set((s) => ({
      helpRequest: topic,
      helpRequestAt: clockTime(),
      helpSeen: false,
      notifications: withNotification(resolve(s.notifications, 'help'), {
        audience: 'parent',
        type: 'help',
        title: `${s.child.name} asked for you`,
        detail: `“${topic}” · From Get help`,
        href: '/parent/alert?kind=help',
        opens: 'Open the alert',
        urgent: true,
        push: true,
      }),
    })),
  ackHelp: () => set((s) => ({ helpSeen: true, notifications: resolve(s.notifications, 'help') })),
  setComfort: (key, value) => set((s) => ({ comfort: { ...s.comfort, [key]: value } })),
  addJournal: (entry) =>
    set((s) => ({
      journal: [...s.journal, { ...entry, at: clockTime() }],
      notifications: withNotification(s.notifications, {
        audience: 'parent',
        type: 'journal',
        title: `${s.child.name} wrote in the journal`,
        detail: entry.prompt,
        href: '/parent/transcript?id=live',
        opens: 'Open the journal entry',
        urgent: false,
        push: s.alertPrefs.eachActivity,
      }),
    })),
  updateChild: (patch) => set((s) => ({ child: { ...s.child, ...patch } })),
  requestEmergency: (by) =>
    set((s) => ({
      emergency: { by, at: clockTime() },
      notifications: withNotification(s.notifications, {
        audience: 'therapist',
        type: 'emergency',
        title: `${by} asked emergency services to help ${s.child.name}`,
        detail: 'From the calm-steps alert',
        href: '/therapist/alert?id=calm',
        opens: 'Open the alert',
        urgent: true,
        push: true,
      }),
    })),
  bookSession: (session) =>
    set((s) => {
      const detail = `${shortDate(session.short)} · ${session.time} · ${session.kind}`;
      const parentList = withNotification(s.notifications, {
        audience: 'parent',
        type: 'booking',
        title: `Session booked with ${session.therapistFirst}`,
        detail,
        href: '/parent/sessions',
        opens: 'Open sessions',
        urgent: false,
        push: s.alertPrefs.sessions,
      });
      // Only Priya signs in to the demo's therapist area, so only her bookings reach a therapist's bell.
      const withPriya = sessionTherapistId(session) === 'priya';
      return {
        session,
        notifications: withPriya
          ? withNotification(parentList, {
              audience: 'therapist',
              type: 'booking',
              title: `New booking: ${s.child.name}`,
              detail,
              href: '/therapist/session?id=alex-next',
              opens: 'Open the session',
              urgent: false,
              push: s.therapistPrefs.bookings,
            })
          : parentList,
      };
    }),
  shareWeek: () =>
    set((s) => ({
      sharedWeek: true,
      notifications: withNotification(s.notifications, {
        audience: 'therapist',
        type: 'shared',
        title: `Jordan shared ${s.child.name}’s week`,
        detail: 'Check-ins and the week’s summary',
        href: '/therapist/client?id=alex&tab=Shared',
        opens: 'Open what Jordan shared',
        urgent: false,
        push: s.therapistPrefs.sharing,
      }),
    })),
  setDay: (patch) => set((s) => ({ day: { ...s.day, ...patch } })),
  toggleDayItem: (id) => set((s) => ({ day: { ...s.day, on: { ...s.day.on, [id]: !s.day.on[id] } } })),

  notify: (n) => set((s) => ({ notifications: withNotification(s.notifications, n) })),
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: (audience) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.read || n.audience !== audience ? n : { ...n, read: true })) })),
  markReadWhere: (match) =>
    set((s) => (s.notifications.some((n) => !n.read && match(n)) ? { notifications: s.notifications.map((n) => (!n.read && match(n) ? { ...n, read: true } : n)) } : {})),
  resolveNotification: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true, resolved: true } : n)) })),
  setAlertPref: (key, value) => set((s) => ({ alertPrefs: { ...s.alertPrefs, [key]: value } })),
  setTherapistPref: (key, value) => set((s) => ({ therapistPrefs: { ...s.therapistPrefs, [key]: value } })),
  setAvailability: (patch) => set((s) => ({ availability: { ...s.availability, ...patch } })),
  setDayHours: (day, ranges) =>
    set((s) => ({ availability: { ...s.availability, weekly: { ...s.availability.weekly, [day]: [...ranges].sort((a, b) => a.start - b.start) } } })),
  addExtraTime: (t) =>
    set((s) => ({
      availability: {
        ...s.availability,
        extra: [...s.availability.extra, { ...t, id: `extra-${nextNotification++}` }],
        // adding a time back where one was taken away brings it back
        removed: s.availability.removed.filter((k) => k !== `${t.date}@${t.start}`),
      },
    })),
  removeOpenTime: (date, start, extraId) =>
    set((s) => ({
      availability: extraId
        ? { ...s.availability, extra: s.availability.extra.filter((e) => e.id !== extraId) }
        : { ...s.availability, removed: [...s.availability.removed, `${date}@${start}`] },
    })),
  addTimeOff: (t) => set((s) => ({ availability: { ...s.availability, timeOff: [...s.availability.timeOff, { ...t, id: `off-${nextNotification++}` }] } })),
  saveNotes: (bookingId, notes, share, when) =>
    set((s) => {
      const before = s.sessionNotes[bookingId];
      const sharedAt = share ? when : (before?.sharedAt ?? null);
      const next = { ...s.sessionNotes, [bookingId]: { ...notes, sharedAt } };
      if (!share) return { sessionNotes: next };
      const first = notes.highlights[0]?.text || notes.shared.split('. ')[0];
      return {
        sessionNotes: next,
        notifications: withNotification(
          // "Write notes for Alex" is done
          s.notifications.map((n) => (n.type === 'notesDue' && n.href.includes(bookingId) ? { ...n, read: true, resolved: true } : n)),
          {
            audience: 'parent',
            type: 'notes',
            title: `Priya shared notes from the ${when} session`,
            detail: first,
            href: `/parent/session-notes?id=${bookingId}`,
            opens: 'Open session notes',
            urgent: false,
            push: s.alertPrefs.sessions,
          },
        ),
      };
    }),
  setGoals: (client, goals) => set((s) => ({ goals: { ...s.goals, [client]: goals } })),
  messageTherapist: (text) =>
    set((s) => ({
      notifications: withNotification(s.notifications, {
        audience: 'therapist',
        type: 'childNote',
        title: `${s.child.name} sent you a message`,
        detail: text,
        href: '/therapist/client?id=alex',
        opens: `Open ${s.child.name}’s page`,
        urgent: false,
        push: true,
      }),
    })),
  updateProfile: (id, patch) => set((s) => ({ profileEdits: { ...s.profileEdits, [id]: { ...s.profileEdits[id], ...patch } } })),
  removeTimeOff: (id) => set((s) => ({ availability: { ...s.availability, timeOff: s.availability.timeOff.filter((t) => t.id !== id) } })),
}));

/** The therapist directory with each therapist's own edits applied (what families see). */
export const useTherapists = (): Therapist[] => {
  const edits = useApp((s) => s.profileEdits);
  return THERAPISTS.map((t) => ({ ...t, ...edits[t.id] }));
};
export const useTherapist = (id: string): Therapist => {
  const all = useTherapists();
  return all.find((t) => t.id === id) ?? all[0];
};

/** A therapist's hours: Priya's are edited in the therapist area; Sam's and Mei's are fixed directory data. */
export const useAvailabilityOf = (id: Therapist['id'] = 'priya') => {
  const priya = useApp((s) => s.availability);
  return id === 'priya' ? priya : DIRECTORY_HOURS[id];
};

/** A therapist's bookings (Priya's by default). Alex's next one follows the parent's booking live. */
export const useBookings = (id: Therapist['id'] = 'priya') => {
  const session = useApp((s) => s.session);
  const lengthMin = useAvailabilityOf(sessionTherapistId(session)).lengthMin;
  return bookingsFor(session, lengthMin, id);
};

/** "THU 15 OCT": the first time a family could book, from the therapist's hours and bookings. */
export const useNextFree = (t: Therapist) => {
  const availability = useAvailabilityOf(t.id);
  const bookings = useBookings(t.id);
  return nextFree(availability, bookings);
};

/** Needs the parent: urgent and not dealt with yet. */
export const isOpenUrgent = (n: Notification) => n.urgent && !n.resolved;

/** The bell and Home/Today tab count: unread items + urgent items not dealt with yet (each counted once). */
export const useUnreadCount = (audience: NotificationAudience = 'parent') =>
  useApp((s) => s.notifications.filter((n) => n.audience === audience && (!n.read || isOpenUrgent(n))).length);

/** Child's display name everywhere ("Alex" by default). */
export const useChildName = () => useApp((s) => s.child.name || CHILD_DEFAULT_NAME);

// Dev only: lets the browser console / preview tooling drive the demo state (window.__safegate.getState()).
if (__DEV__ && typeof window !== 'undefined') {
  (window as unknown as { __safegate: typeof useApp }).__safegate = useApp;
}
