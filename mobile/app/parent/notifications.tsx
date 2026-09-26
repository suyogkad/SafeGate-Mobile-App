/**
 * P26 Notifications (parent). Everything that happened with Alex in one list; the layout is shared with the
 * therapist's T10 (src/components/NotificationsScreen.tsx).
 */
import { NotificationsScreen } from '@/components/NotificationsScreen';

export default function ParentNotifications() {
  return <NotificationsScreen audience="parent" />;
}
