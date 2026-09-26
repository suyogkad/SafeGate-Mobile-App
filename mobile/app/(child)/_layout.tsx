import { Tabs } from 'expo-router/js-tabs';
import { ChildTabBar, type TabBarProps } from '../../src/components/TabBars';

/** Child tabs: Home · Explore · Talk* · Get help* · You  (*push full screen, not tab pages). */
export default function ChildTabs() {
  return (
    // backBehavior none: on web, returning to a visited tab otherwise calls history.go(-1), which can step out of this page
    // load (Alt+P / Alt+C replace entries), reload the page and reset the demo.
    <Tabs backBehavior="none" screenOptions={{ headerShown: false }} tabBar={(p) => <ChildTabBar {...(p as unknown as TabBarProps)} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
