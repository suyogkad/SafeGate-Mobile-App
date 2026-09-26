import { Tabs } from 'expo-router/js-tabs';
import { ParentTabBar, type TabBarProps } from '../../../src/components/TabBars';

/** Parent tabs: Home · Sessions · Book (+)* · Insights · Account  (*pushes Find a therapist). */
export default function ParentTabs() {
  return (
    // backBehavior none: on web, returning to a visited tab otherwise calls history.go(-1), which can step out of this page
    // load (Alt+P / Alt+C replace entries), reload the page and reset the demo.
    <Tabs backBehavior="none" screenOptions={{ headerShown: false }} tabBar={(p) => <ParentTabBar {...(p as unknown as TabBarProps)} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="sessions" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
