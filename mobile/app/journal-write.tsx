/**
 * C20 Journal writing. The prompt is big; the child writes below. Save sends the entry
 * to the backend, where the parent can read it. Ideas = sentence starters. Mic → Speak →
 * Is this right?; the heard words land in the box here. "Your grown-up can read what you
 * write here." is always shown.
 *
 * What the child writes is a child message, so it goes through the safety layer before
 * it is saved (safety rule 2). A flagged entry switches the app to calm steps, and the
 * child is never told why (rule 5).
 *
 * The card after saving is a **fixed written prompt, not an AI reply**, and is not
 * labelled as the companion: nothing unchecked by the reply check may be shown to a
 * child as something the AI said (safety rule 3). Asking the companion for a real reply
 * here would need the whole defence layer, which Talk already is.
 */
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Conversation, type ConvLine } from '@/components/Conversation';
import { Backdrop } from '@/components/Backdrop';
import { Header } from '@/components/Header';
import { StickyBar } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { T } from '@/components/ui/T';
import { COMPANION_REPLY, SMILE_REPLY, TODAYS_IDEAS, WRITING_STARTERS } from '@/data/journal';
import { saveJournalEntry } from '@/lib/child';
import { useApp } from '@/store/app';
import { gutter, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function JournalWrite() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const first = useLocalSearchParams<{ prompt?: string }>().prompt || TODAYS_IDEAS[0];
  const pendingSpeech = useApp((s) => s.pendingSpeech);

  const [prompt, setPrompt] = useState(first);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [lines, setLines] = useState<ConvLine[]>([]);
  const [ideas, setIdeas] = useState(false);
  const input = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);

  // Spoken words come back from Speak → Is this right? and are added to the box.
  useEffect(() => {
    if (pendingSpeech) {
      useApp.getState().setPendingSpeech(null);
      setText((cur) => (cur ? `${cur} ${pendingSpeech}` : pendingSpeech));
    }
  }, [pendingSpeech]);

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(id);
  }, [lines.length]);

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await saveJournalEntry(value, prompt);
      useApp.getState().addJournal({ prompt, text: value });
      useApp.getState().markDone('journal');
      if (result.calm) {
        // Flagged. Calm steps, and nothing about why.
        useApp.getState().setCalmMode('active');
        router.replace('/calm-mode');
        return;
      }
      // A fixed written next prompt, not an AI reply, so it carries no AI label.
      const next = /smile/i.test(prompt) && lines.length === 0 ? SMILE_REPLY : COMPANION_REPLY;
      setLines((l) => [
        ...l,
        { id: `p${l.length}`, from: 'companion', text: prompt },
        { id: `t${l.length}`, from: 'me', text: value },
      ]);
      setPrompt(next);
      setText('');
      setIdeas(false);
    } catch {
      // Nothing is lost: what they wrote stays in the box.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const saved = lines.length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Same branded background as every other child screen, so the writing box and cards stand out. */}
      <Backdrop name="soft" />
      <Header title="Journal" left="close" fallback="/journal" />

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: space.lg, gap: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="eye" size={18} color={c.textMuted} />
          <T v="bodySm" color="textMuted" style={{ flex: 1 }}>
            Your grown-up can read what you write here.
          </T>
        </View>

        {failed ? (
          <T v="bodySm" color="textSecondary" accessibilityLiveRegion="polite">
            That didn't save. What you wrote is still here.
          </T>
        ) : null}

        {saved ? (
          <View style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.xl, gap: space.lg, ...shadow.lift }}>
            {/* "Idea", not "AI companion": these prompts are fixed written text, and
                saying the AI wrote them would be untrue (safety rule 3). */}
            <Conversation lines={lines} companionLabel="Idea" />
            <View style={{ gap: space.sm }}>
              <T v="caption" color="textMuted">
                NEXT IDEA
              </T>
              <T v="bodyLg">{prompt}</T>
              <Button
                title="Keep writing"
                size="small"
                variant="outline"
                iconLeft="corner-down-right"
                onPress={() => input.current?.focus()}
              />
            </View>
          </View>
        ) : null}

        {/* The prompt is big until the first save; after that the card above carries it. */}
        {saved ? null : (
          <Appear>
            <View style={{ gap: space.xs }}>
              <T v="caption" color="textMuted">
                WRITE ABOUT
              </T>
              <T v="title" header>
                {prompt}
              </T>
            </View>
          </Appear>
        )}
      </ScrollView>

      <StickyBar>
        {ideas ? (
          <ChipRow>
            {WRITING_STARTERS.map((s) => (
              <Chip
                key={s}
                label={s}
                onPress={() => {
                  setText((cur) => (cur ? `${cur} ${s}` : s));
                  setIdeas(false);
                  input.current?.focus();
                }}
              />
            ))}
          </ChipRow>
        ) : null}
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={saved ? 'Write your answer' : 'Write here'}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={`Write about: ${prompt}`}
          multiline
          style={[
            t('body'),
            {
              color: c.text,
              backgroundColor: c.bg,
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? c.focus : c.fieldBorder,
              borderRadius: radius.card,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              minHeight: 96,
              maxHeight: 180,
              textAlignVertical: 'top',
              outlineStyle: 'none' as never,
            },
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <IconButton icon="star" label={ideas ? 'Hide ideas' : 'Ideas'} onPress={() => setIdeas((o) => !o)} />
          <IconButton icon="mic" label="Speak" onPress={() => router.push('/speak')} />
          <View style={{ flex: 1 }} />
          <Button title={failed ? 'Try again' : 'Save'} size="small" icon="check" disabled={!text.trim() || busy} onPress={save} />
        </View>
      </StickyBar>
    </KeyboardAvoidingView>
  );
}
