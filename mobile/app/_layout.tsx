import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useDemoSwitch } from '../src/lib/demoSwitch';
import { ensureRestored } from '../src/lib/auth';
import { preloadImages } from '../src/lib/preloadImages';
import { useReduceMotion } from '../src/lib/motion';
import { useApp } from '../src/store/app';
import { colors } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Start loading every character and illustration immediately, in parallel with the fonts, so screens never show
// pictures popping in. The first screen waits for them (up to IMAGE_WAIT_MS, so a slow network can't block the app).
const images = preloadImages();
const IMAGE_WAIT_MS = 3000;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });

  const [imagesReady, setImagesReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setImagesReady(true);
    images.then(done);
    const cap = setTimeout(done, IMAGE_WAIT_MS);
    return () => {
      alive = false;
      clearTimeout(cap);
    };
  }, []);

  // A stored session is brought back whichever screen is opened first, so a reopened
  // app (or a deep link) knows who is signed in before any screen asks.
  useEffect(() => {
    void ensureRestored();
  }, []);

  useDemoSwitch();
  const reduce = useReduceMotion();
  const movement = useApp((s) => s.comfort.movement);
  // Screen transitions follow the motion tiers (rule 10): none with reduce-motion; child screens only with Movement on
  // (their content already has its own short fade); parent and therapist screens fade.
  // Calm mode always arrives instantly: the switch is the safety mechanism, never a fade.
  const transition = (route: string) =>
    reduce || route === 'calm-mode' || (!route.startsWith('parent') && !route.startsWith('therapist') && !movement) ? 'none' : 'fade';

  const ready = (loaded || !!error) && imagesReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* On web (the investor demo), show the app in a phone-width column. */}
      <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? colors.surface : colors.bg, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 430 : undefined, backgroundColor: colors.bg, overflow: 'hidden' }}>
          <Stack screenOptions={({ route }) => ({ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: transition(route.name) })}>
            <Stack.Screen name="calm-mode" options={{ gestureEnabled: false }} />
            <Stack.Screen name="how-it-works" options={{ gestureEnabled: false }} />
            <Stack.Screen name="feeling-now" options={{ gestureEnabled: false }} />
          </Stack>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
