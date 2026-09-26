/**
 * T10 Notifications (therapist). The parent's P26 layout with the therapist's items: calm-step alerts from clients
 * (Needs attention), new bookings, families sharing their week, notes to write.
 */
import { NotificationsScreen } from '@/components/NotificationsScreen';

export default function TherapistNotifications() {
  return <NotificationsScreen audience="therapist" />;
}
