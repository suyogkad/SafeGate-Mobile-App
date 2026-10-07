/**
 * "Where Alex is signed in": the parent sees each phone their child is using and can end it.
 *
 * Ending a sitting signs the child out of that phone immediately. It never deletes the
 * conversation -- the parent still needs to be able to read it (HANDOFF rule 3), and the
 * dialog says so, because "end session" otherwise reads like "erase".
 */
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { endAllChildSessions, listChildDevices, revokeChildDevice, type ApiChildDevice } from '@/api/children';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ListRow } from '@/components/ui/ListRow';
import { T } from '@/components/ui/T';
import { OfflineError } from '@/lib/api';
import { space } from '@/theme/tokens';

function lastUsed(device: ApiChildDevice): string {
  if (!device.last_seen_at) return 'Not used yet';
  const minutes = Math.round((Date.now() - new Date(device.last_seen_at).getTime()) / 60000);
  if (minutes < 2) return 'In use now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return new Date(device.last_seen_at).toLocaleDateString();
}

const phoneName = (device: ApiChildDevice, childName: string) =>
  device.kind === 'linked' ? `${childName}'s phone` : 'This phone';

export function EndSessions({ childId, childName }: { childId: string; childName: string }) {
  const [devices, setDevices] = useState<ApiChildDevice[]>([]);
  const [confirm, setConfirm] = useState<ApiChildDevice | 'all' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices((await listChildDevices(childId)).filter((d) => !d.revoked_at));
      setError(null);
    } catch (e) {
      setError(e instanceof OfflineError ? "We couldn't reach SafeGate." : "We couldn't load this just now.");
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const end = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === 'all') await endAllChildSessions(childId);
      else await revokeChildDevice(childId, confirm.id);
      setConfirm(null);
      await load();
    } catch (e) {
      setError(e instanceof OfflineError ? "We couldn't reach SafeGate." : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      {devices.length === 0 ? (
        <T v="bodySm" color="textMuted">
          {childName} is not signed in on any phone right now.
        </T>
      ) : (
        <>
          {devices.map((d, i) => (
            <ListRow
              key={d.id}
              title={phoneName(d, childName)}
              value={lastUsed(d)}
              icon={d.kind === 'linked' ? 'smartphone' : 'user'}
              divider={i < devices.length - 1}
              right={<Badge label="End" tone="warn" />}
              onPress={() => setConfirm(d)}
              label={`${phoneName(d, childName)}, last used ${lastUsed(d)}. End this session`}
            />
          ))}
          {devices.length > 1 ? (
            <Button title="End every session" variant="outline" iconLeft="log-out" onPress={() => setConfirm('all')} />
          ) : null}
        </>
      )}

      {error ? (
        <View accessibilityLiveRegion="polite">
          <T v="bodySm" color="textSecondary">
            {error}
          </T>
        </View>
      ) : null}

      <Dialog
        visible={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm === 'all' ? 'End every session?' : 'End this session?'}
      >
        <T v="body" color="textSecondary" center>
          {childName} will be signed out{confirm === 'all' ? ' everywhere' : ' on that phone'} straight away, and will
          need a new code from you to use SafeGate again. Nothing {childName} has written is deleted — you can still
          read it.
        </T>
        <View style={{ gap: space.sm }}>
          <Button title={busy ? 'Ending…' : 'End session'} disabled={busy} onPress={end} />
          <Button title="Not now" variant="text" style={{ alignSelf: 'center' }} onPress={() => setConfirm(null)} />
        </View>
      </Dialog>
    </View>
  );
}
