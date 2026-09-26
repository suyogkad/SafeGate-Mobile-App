/**
 * C11 Is this right? The heard words in an editable text area, then Send / Edit / Record again / Cancel.
 * The child always sees and can fix what was heard before it's sent.
 * ?unsure=1 = the "not sure it heard right" variant.
 */
import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { TextInput, View } from 'react-native';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { SPOKEN_TEXT } from '@/data/talk';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';

export default function IsThisRight() {
  const unsure = useLocalSearchParams<{ unsure?: string }>().unsure === '1';
  const [text, setText] = useState(SPOKEN_TEXT);
  const inputRef = useRef<TextInput>(null);

  const send = () => {
    if (!text.trim()) return;
    useApp.getState().setPendingSpeech(text.trim());
    goBack('/talk');
  };

  return (
    <Screen
      header={<Header title="Talk" left="close" fallback="/talk" />}
      footer={
        <View style={{ gap: space.sm }}>
          <Button title={unsure ? 'Yes, send' : 'Send'} icon="arrow-up" disabled={!text.trim()} onPress={send} />
          <Button title="Edit" variant="outline" iconLeft="edit-2" onPress={() => inputRef.current?.focus()} />
          <Button title={unsure ? 'Say it again' : 'Record again'} variant="outline" iconLeft="mic" onPress={() => router.replace('/speak')} />
          <Button title="Cancel" variant="text" style={{ alignSelf: 'center' }} onPress={() => goBack('/talk')} />
        </View>
      }
    >
      <T v="title" header>
        {unsure ? 'I want to make sure I heard you right. Is this what you said?' : 'Is this right?'}
      </T>
      <Input ref={inputRef} area a11yLabel="What I heard. You can change it." value={text} onChangeText={setText} style={{ minHeight: 120 }} />
    </Screen>
  );
}
