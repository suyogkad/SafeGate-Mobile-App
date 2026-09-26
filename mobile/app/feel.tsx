/**
 * C12 Today I feel. A mood band in the chosen mood's tint (character + big mood word), the five-mood picker, and
 * feeling bubbles for the words. Soft branded background, sticky actions.
 * Picking a mood changes the word, the character and the band colour together: colour is never the only signal.
 * Default mood: Ok. Saving calls setCheckin() and markDone('checkin').
 */
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { FeelingBubbles } from '@/components/FeelingBubbles';
import { Header } from '@/components/Header';
import { MoodBand } from '@/components/MoodBand';
import { MoodPicker } from '@/components/MoodPicker';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/T';
import { DEFAULT_MOOD, mood as moodById, type MoodId } from '@/data/moods';
import { useApp } from '@/store/app';
import { gutter, space } from '@/theme/tokens';

export default function Feel() {
  const [mood, setMood] = useState<MoodId>(DEFAULT_MOOD);
  const [feelings, setFeelings] = useState<string[]>([]);
  const m = moodById(mood);

  const pick = (id: MoodId) => {
    setMood(id);
    setFeelings([]); // the words change with the mood
  };

  const saveNow = () => {
    useApp.getState().setCheckin({ mood, feelings, topics: [] });
    useApp.getState().markDone('checkin');
    router.replace(`/checkin-saved?mood=${mood}` as Href);
  };

  const addDetails = () => router.push(`/whats-going-on?mood=${mood}&feelings=${encodeURIComponent(feelings.join('|'))}` as Href);

  return (
    <Screen
      edgeToEdge
      padded={false}
      footer={
        <View style={{ gap: space.xs }}>
          <Button title="Add details" icon="arrow-right" onPress={addDetails} />
          <Button title="Save without details" variant="text" style={{ alignSelf: 'center' }} onPress={saveNow} />
        </View>
      }
    >
      <MoodBand mood={mood} header={<Header title="Today I feel" fallback="/home" />}>
        <View style={{ marginTop: space.md }}>
          <MoodPicker value={mood} onChange={pick} />
        </View>
      </MoodBand>

      <View style={{ paddingHorizontal: gutter, gap: space.lg }}>
        <Stagger>
          <View style={{ gap: space.xs }}>
            <T v="section" header>
              Which words fit?
            </T>
            <T v="bodySm" color="textMuted">
              Pick as many as you like, or none.
            </T>
          </View>
          <FeelingBubbles
            key={mood}
            options={m.feelings}
            selected={feelings}
            onToggle={(f) => setFeelings((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]))}
          />
        </Stagger>
      </View>
    </Screen>
  );
}
