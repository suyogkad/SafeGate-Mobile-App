import { Tabs } from 'expo-router/js-tabs';
import { TherapistTabBar, type TabBarProps } from '../../../src/components/TabBars';

/** Therapist tabs: Today · Calendar · Add time (+)* · Clients · Account  (*pushes Add a time). */
export default function TherapistTabs() {
  return (
    // backBehavior none: see the parent tabs (on web, history.go(-1) could leave the page and reset the demo).
    <Tabs backBehavior="none" screenOptions={{ headerShown: false }} tabBar={(p) => <TherapistTabBar {...(p as unknown as TabBarProps)} />}>
      <Tabs.Screen name="today" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="clients" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
