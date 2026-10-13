/** What a parent's own screens read from the backend. */
import { useCallback, useEffect, useState } from 'react';
import {
  acknowledgeAlert,
  getNotifyPrefs,
  getSharedNotes,
  getTherapist,
  listChildAlerts,
  listFamilySessions,
  listOpenTimes,
  listTherapists,
  readChildConversations,
  readGoals,
  recordEmergencyRequest,
  saveNotifyPrefs,
  type ApiConversationTurn,
  type ApiParentNotify,
  type ApiParentAlert,
  type ApiSharedNotes,
  type ApiTherapistPublic,
} from '../api/family';
import { listChildDevices, listChildren, type ApiChild } from '../api/children';
import type { ApiSession, ApiSlot } from '../api/therapist';
import { useApp } from '../store/app';

export function useFamilySessions(): ApiSession[] {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  useEffect(() => {
    let alive = true;
    listFamilySessions()
      .then((s) => alive && setSessions(s))
      .catch(() => {
        /* offline or signed out: the screen shows its empty state */
      });
    return () => {
      alive = false;
    };
  }, []);
  return sessions;
}

/**
 * The notes a therapist shared for one session. `notes` stays null until they
 * share, which the screen shows as "notes coming" rather than as an error --
 * nothing has gone wrong, the therapist simply has not written them yet.
 */
export function useSharedNotes(sessionId: string | undefined) {
  const [notes, setNotes] = useState<ApiSharedNotes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getSharedNotes(sessionId)
      .then((n) => alive && setNotes(n))
      .catch(() => alive && setNotes(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  return { notes, loading };
}

/** The children on this parent's account, and the one the app is showing. */
export function useMyChildren(): ApiChild[] {
  const [children, setChildren] = useState<ApiChild[]>([]);
  useEffect(() => {
    let alive = true;
    listChildren()
      .then((c) => alive && setChildren(c.filter((x) => !x.archived_at)))
      .catch(() => {
        /* offline or no child added yet: the screen shows its own state */
      });
    return () => {
      alive = false;
    };
  }, []);
  return children;
}

export function useMyChild(): ApiChild | null {
  const childId = useApp((s) => s.childId);
  const children = useMyChildren();
  return children.find((c) => c.id === childId) ?? children[0] ?? null;
}

/**
 * Safety alerts about this child, and the two actions open to the parent.
 *
 * `acknowledge` is what makes the child's screen able to say someone who looks
 * after them has seen it. `askEmergencyServices` records that this parent asked --
 * **SafeGate contacts nobody**, and the screen says so.
 */
export function useChildAlerts(childId: string | null | undefined) {
  const [alerts, setAlerts] = useState<ApiParentAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    listChildAlerts(childId)
      .then(setAlerts)
      .catch(() => {
        /* offline: Home says nothing needs you, which is the safe wording */
      })
      .finally(() => setLoading(false));
  }, [childId]);
  useEffect(reload, [reload]);

  const apply = (updated: ApiParentAlert) =>
    setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

  const acknowledge = useCallback(
    async (alertId: string): Promise<string | null> => {
      if (!childId) return 'No child on this account yet.';
      try {
        apply(await acknowledgeAlert(childId, alertId));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not mark this as seen.';
      }
    },
    [childId],
  );

  const askEmergencyServices = useCallback(
    async (alertId: string): Promise<string | null> => {
      if (!childId) return 'No child on this account yet.';
      try {
        apply(await recordEmergencyRequest(childId, alertId));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not record that.';
      }
    },
    [childId],
  );

  /** What Home shows under "Needs you": nobody has said they have seen it yet. */
  const open = alerts.filter((a) => !a.acknowledged_at);
  return { alerts, open, loading, reload, acknowledge, askEmergencyServices };
}

/** The child's chats. The child is told their grown-up can read these (rule 3). */
export function useChildChats(childId: string | null | undefined) {
  const [turns, setTurns] = useState<ApiConversationTurn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    readChildConversations(childId)
      .then((t) => alive && setTurns(t))
      .catch(() => {
        /* offline: the screen shows its empty state */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [childId]);

  return { turns, loading };
}

/** Therapists a parent can choose from. Approved ones only; the backend decides. */
export function useTherapistDirectory() {
  const [therapists, setTherapists] = useState<ApiTherapistPublic[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    listTherapists()
      .then((t) => alive && setTherapists(t))
      .catch(() => {
        /* offline: Find a therapist shows its empty state */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  return { therapists, loading };
}

export function useTherapistProfile(therapistId: string | undefined) {
  const [therapist, setTherapist] = useState<ApiTherapistPublic | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!therapistId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getTherapist(therapistId)
      .then((t) => alive && setTherapist(t))
      .catch(() => {
        /* gone, or not approved: the screen says so */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [therapistId]);
  return { therapist, loading };
}

/** A therapist's open times. Already filtered by their notice period and booking
 * window on the server, so whatever comes back is genuinely bookable. */
export function useOpenTimes(therapistId: string | undefined) {
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    if (!therapistId) {
      setLoading(false);
      return;
    }
    listOpenTimes(therapistId)
      .then((s) => setSlots(s.filter((x) => !x.is_booked).sort((a, b) => a.start_time.localeCompare(b.start_time))))
      .catch(() => {
        /* offline: Book says there are no times */
      })
      .finally(() => setLoading(false));
  }, [therapistId]);
  useEffect(reload, [reload]);
  return { slots, loading, reload };
}

/** The goals this child's therapist is working towards, in their own words. */
export function useChildGoals(childId: string | null | undefined) {
  const [goals, setGoals] = useState<string[]>([]);
  useEffect(() => {
    if (!childId) return;
    let alive = true;
    readGoals(childId)
      .then((g) => alive && setGoals(g.goals))
      .catch(() => {
        /* no goals yet, or offline: the section stays hidden */
      });
    return () => {
      alive = false;
    };
  }, [childId]);
  return goals;
}

/** What this parent hears about. Safety alerts are not one of these. */
export function useNotifyPrefs() {
  const [prefs, setPrefs] = useState<ApiParentNotify>({ sessions: true, each_activity: false, digest: true });
  useEffect(() => {
    let alive = true;
    getNotifyPrefs()
      .then((p) => alive && setPrefs(p))
      .catch(() => {
        /* offline: the switches show the defaults until it loads */
      });
    return () => {
      alive = false;
    };
  }, []);

  const set = useCallback(async (patch: Partial<ApiParentNotify>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      setPrefs(await saveNotifyPrefs(next));
    } catch {
      // Put the switch back rather than showing a setting that did not save.
      setPrefs(prefs);
    }
  }, [prefs]);

  return { prefs, set };
}

/**
 * Whether this child has a phone of their own paired right now.
 *
 * The real signal is the device list, not a flag in this app's own memory: a parent
 * who paired their child's phone on another device would otherwise be told "not
 * linked yet". A parent-hosted sitting is not a linked phone.
 */
export function useChildLinked(childId: string | null | undefined) {
  const [linked, setLinked] = useState<boolean | null>(null);
  useEffect(() => {
    if (!childId) {
      setLinked(null);
      return;
    }
    let alive = true;
    listChildDevices(childId)
      .then((devices) => alive && setLinked(devices.some((d) => d.kind === 'linked' && !d.revoked_at)))
      .catch(() => {
        /* offline: the row shows nothing rather than a wrong answer */
      });
    return () => {
      alive = false;
    };
  }, [childId]);
  return linked;
}
