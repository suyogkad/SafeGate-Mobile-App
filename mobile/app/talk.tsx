/**
 * C08–C09 Talk (all states). Reads like a page, not chat bubbles (Conversation). Header with close, title and Get
 * help; the "grown-up can read" line; a sticky composer (Ideas, Speak, Send).
 * States: empty · conversation · waiting ("Thinking…") · offline · after calm mode (pinned card).
 * Tapping an idea chip sends it; each gets its own scripted reply (DEMO ONLY, `replyTo()` in src/data/talk.ts).
 */
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Conversation } from '@/components/Conversation';
import { Backdrop } from '@/components/Backdrop';
import { Header } from '@/components/Header';
import { StickyBar } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { T } from '@/components/ui/T';
import { EMERGENCY_NOTE_SHORT, helpline } from '@/data/helplines';
import { greeting, IDEAS, type TaskId } from '@/data/talk';
import { companionReply } from '@/api/children';
import { ApiError, OfflineError } from '@/lib/api';
import { callNumber } from '@/lib/call';
import { readAloud } from '@/lib/speak';
import { useApp, useChildName } from '@/store/app';
import { gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Talk() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const name = useChildName();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const messages = useApp((s) => s.messages);
  const afterCalm = useApp((s) => s.afterCalm);
  const pendingSpeech = useApp((s) => s.pendingSpeech);

  const [text, setText] = useState(params.prompt ?? '');
  const [thinking, setThinking] = useState(false);
  const [focused, setFocused] = useState(false);
  const [offline, setOffline] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (raw: string) => {
    const value = raw.trim();
    if (!value || thinking) return;
    const store = useApp.getState();
    const childId = store.childId;

    if (!childId) {
      // No linked child on this device: nothing can be sent safely.
      router.push('/talk-error?kind=notSent');
      return;
    }

    const isFirst = store.messages.length === 0;
    if (isFirst) store.addMessage({ from: 'companion', text: greeting(name) });
    store.addMessage({ from: 'me', text: value });
    store.markDone('chat');
    setText('');
    setIdeasOpen(false);
    setThinking(true);

    // The safety engine runs on the server, before any AI is called. The app never
    // decides this (rule 9) and is never told a risk level it could show (rule 5).
    const history = useApp
      .getState()
      .messages.map((m) => ({ role: m.from === 'me' ? ('user' as const) : ('assistant' as const), content: m.text }));

    try {
      const res = await companionReply(childId, history);

      if (res.risk_level !== 'none') {
        // The AI is locked out: no reply is shown. The grown-ups are alerted server-side.
        store.setCalmMode('active');
        setThinking(false);
        router.replace('/calm-mode');
        return;
      }

      useApp.getState().addMessage({ from: 'companion', text: res.reply });
      setThinking(false);

      // If the child spoke, answer out loud. Typing gets a typed answer, so the
      // app never starts talking unprompted. "Read things aloud" can turn it off.
      if (useApp.getState().spokeLast && useApp.getState().comfort.readAloud) {
        readAloud(res.reply);
      }
      useApp.getState().setSpokeLast(false);
    } catch (e) {
      setThinking(false);
      if (e instanceof OfflineError) {
        // Keep what was typed: the message never left the phone (checklist 1.6.4).
        setText(value);
        setOffline(true);
        return;
      }
      // Anything the server refused to answer safely shows the calm "didn't come through"
      // screen, never a code or a raw message (rule 15).
      router.push(e instanceof ApiError && e.status < 500 ? '/talk-error?kind=blocked' : '/talk-error?kind=notSent');
    }
  };

  // Coming back from Speak → Is this right? → Send.
  useEffect(() => {
    if (pendingSpeech) {
      useApp.getState().setPendingSpeech(null);
      void send(pendingSpeech);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSpeech]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(id);
  }, [messages.length, thinking]);

  // The checklist is the card's own steps (homework, getting ready for school, tidying a room, bedtime).
  const openChecklist = (taskId: TaskId = 'homework') => {
    useApp.getState().openTask(taskId);
    router.push('/my-task');
  };

  const empty = messages.length === 0;
  const kidsHelpline = helpline('kids-helpline');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Same branded background as every other child screen, so the writing box and cards stand out. */}
      <Backdrop name="soft" />
      <Header title="Talk" left="close" fallback="/home" />

      <View style={{ paddingHorizontal: gutter, paddingBottom: space.sm, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="eye" size={18} color={c.textMuted} />
          <T v="bodySm" color="textMuted" style={{ flex: 1 }}>
            Your grown-up can read what you write here.
          </T>
        </View>
        {afterCalm ? (
          // Pinned after calm mode; can't be dismissed.
          <Card tone="help" padding={space.lg}>
            <View style={{ gap: space.md }}>
              <T v="bodyLg" tint={c.onHelpTint}>
                If things get hard again, you can call someone.
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Button
                  title="Call Kids Helpline"
                  size="small"
                  iconLeft="phone"
                  label={`Call Kids Helpline on ${kidsHelpline.number}`}
                  onPress={() => callNumber(kidsHelpline.number, kidsHelpline.name)}
                />
                <Button title="Get help" size="small" variant="help" iconLeft="life-buoy" onPress={() => router.push('/get-help')} />
              </View>
              {/* Rule 4: this card offers a helpline call, so it carries the note like every other help card. */}
              <T v="bodySm" tint={c.onHelpTint}>
                {EMERGENCY_NOTE_SHORT}
              </T>
            </View>
          </Card>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: space.lg, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {empty ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
            <T v="display" header>
              Say anything you like.
            </T>
            <T v="bodySm" color="textMuted">
              This chat isn't kept on this phone. Your grown-up can still read it.
            </T>
          </View>
        ) : (
          <Conversation
            lines={messages}
            cardActions={(line) => (
              <>
                <Button title="Open as a checklist" size="small" icon="check-square" onPress={() => openChecklist(line.taskId as TaskId | undefined)} />
                <Button title="Answer" size="small" variant="outline" onTint onPress={() => inputRef.current?.focus()} />
              </>
            )}
            footer={
              thinking ? (
                <T v="bodySm" color="textMuted" accessibilityLiveRegion="polite">
                  Thinking…
                </T>
              ) : null
            }
          />
        )}
      </ScrollView>

      {offline ? (
        <StickyBar>
          <Card tone="surface" padding={space.lg}>
            <View style={{ gap: space.md }} accessibilityLiveRegion="polite">
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                <Icon name="wifi-off" size={20} color={c.textSecondary} />
                <T v="bodyLg" style={{ flex: 1 }}>
                  Talk isn't available right now because there's no connection. You can still:
                </T>
              </View>
              <Button title="Calm me" variant="outline" onPress={() => router.push('/calm')} />
              <Button title="Get help — calling works without internet" variant="help" onPress={() => router.push('/get-help')} />
            </View>
          </Card>
        </StickyBar>
      ) : (
        <StickyBar>
          {ideasOpen ? (
            <ChipRow>
              {IDEAS.map((idea) => (
                <Chip
                  key={idea}
                  label={idea}
                  a11yLabel={`Send: ${idea}`}
                  onPress={() => void send(idea)}
                />
              ))}
            </ChipRow>
          ) : null}
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Type here"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Type your message"
            multiline
            onKeyPress={(e) => {
              // Web: Enter sends, Shift+Enter adds a line.
              const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                (e as unknown as { preventDefault: () => void }).preventDefault();
                void send(text);
              }
            }}
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
                minHeight: 56,
                maxHeight: 140,
                outlineStyle: 'none' as never,
              },
            ]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconButton icon="star" label={ideasOpen ? 'Hide ideas' : 'Ideas'} onPress={() => setIdeasOpen((o) => !o)} />
            <IconButton icon="mic" label="Speak" onPress={() => router.push('/speak')} />
            <View style={{ flex: 1 }} />
            <Button title="Send" size="small" icon="arrow-up" disabled={!text.trim() || thinking} onPress={() => void send(text)} />
          </View>
        </StickyBar>
      )}
    </KeyboardAvoidingView>
  );
}
