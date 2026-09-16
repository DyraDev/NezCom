let swRegistration: ServiceWorkerRegistration | null = null;

export async function initNotifications() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('NezCom Service Worker registered successfully');

    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (err) {
    console.error('Failed to register NezCom Service Worker:', err);
  }
}

/**
 * Send a rich local notification (Avatar Icon + Image Attachment Preview).
 */
export function sendLocalNotification(
  title: string,
  body: string,
  options?: { icon?: string; image?: string; tag?: string; isActiveChat?: boolean }
) {
  if (typeof window === 'undefined') return;
  if ('Notification' in window && Notification.permission !== 'granted') return;

  const { icon, image, tag, isActiveChat = false } = options || {};

  // Don't notify OS if user is looking at the active open chat
  if (!document.hidden && isActiveChat) return;

  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: { title, body, icon, image, tag }
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
        image: image || undefined,
        tag: tag || 'nezcom-chat'
      } as any);
    } catch (_) {
      new Notification(title, { body, icon });
    }
  }
}
