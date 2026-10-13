/**
 * C13 What's going on? A compact band tinted with the chosen mood, step dashes (2 of 2),
 * and a multi-select tile grid. "Pick as many as you like, or none.": Save works with
 * nothing picked.
 *
 * Saving sends the check-in to the backend, where the parent reads it in these same
 * words. If it comes back flagged the app switches to calm steps -- the child is never
 * told why (rule 5). If it cannot be saved the child is told plainly and nothing is
 * lost: Try again keeps what they picked.
 */
import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { MoodBand } from '@/components/MoodBand';
import { OptionTile, TileRows } from '@/components/Options';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { StepDashes } from '@/components/ui/bits';
import { T } from '@/components/ui/T';
import { MOODS, TOPICS, type MoodId } from '@/data/moods';
import { saveCheckin } from '@/lib/child';
import { useApp } from '@/store/app';
import { gutter, space } from '@/theme/tokens';

export default function WhatsGoingOn() {
  const params = useLocalSearchParams<{ mood?: string; feelings?: string }>();
  const mood: MoodId = MOODS.some((m) => m.id === params.mood) ? (params.mood as MoodId) : 'ok';
  const feelings = params.feelings ? decodeURIComponent(params.feelings).split('|').filter(Boolean) : [];
  const [topics, setTopics] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const saved = await saveCheckin({ mood, words: feelings, topics });
      useApp.getState().setCheckin({ mood, feelings, topics });
      useApp.getState().markDone('checkin');
      if (saved.calm) {
        // Flagged. The child goes to calm steps and is not told why.
        useApp.getState().setCalmMode('active');
        router.replace('/calm-mode');
        return;
      }
      router.replace(`/checkin-saved?mood=${mood}` as Href);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      edgeToEdge
      padded={false}
      footer={
        <View style={{ gap: space.sm }}>
          {failed ? (
            <T v="bodySm" color="textSecondary" accessibilityLiveRegion="polite">
              That didn't send. Your picks are still here.
            </T>
          ) : null}
          <Button title={failed ? 'Try again' : 'Save'} icon="check" disabled={busy} onPress={save} />
        </View>
      }
    >
      <MoodBand mood={mood} compact header={<Header fallback="/feel" />}>
        <StepDashes step={2} total={2} />
      </MoodBand>

      <View style={{ paddingHorizontal: gutter, gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <T v="title" header>
            What's going on?
          </T>
          <T v="body" color="textSecondary">
            Pick as many as you like, or none.
          </T>
        </View>
        <Appear>
          <TileRows>
            {TOPICS.map((t) => (
              <OptionTile
                key={t.id}
                label={t.label}
                emoji={t.emoji}
                selected={topics.includes(t.label)}
                onPress={() => setTopics((list) => (list.includes(t.label) ? list.filter((x) => x !== t.label) : [...list, t.label]))}
              />
            ))}
          </TileRows>
        </Appear>
      </View>
    </Screen>
  );
}
