import { useState, useCallback, useEffect } from 'react';

interface UseDesktopNotificationsOptions {
  icon?: string;
  requireInteraction?: boolean;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}

export const useDesktopNotifications = (options: UseDesktopNotificationsOptions = {}) => {
  const { icon = '/favicon.ico', requireInteraction = false } = options;
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Desktop notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      const granted = result === 'granted';
      setEnabled(granted);
      return granted;
    } catch {
      console.error('Error requesting notification permission');
      return false;
    }
  }, []);

  const show = useCallback(({ title, body, tag, onClick }: NotificationPayload) => {
    if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag,
        requireInteraction,
      });

      if (onClick) {
        notification.onclick = () => {
          onClick();
          notification.close();
        };
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [enabled, icon, requireInteraction]);

  const showTransactionNotification = useCallback((
    type: 'payin' | 'payout',
    orderNo: string,
    amount: number,
    status?: 'pending' | 'success' | 'failed'
  ) => {
    const emoji = type === 'payin' ? '📥' : '📤';
    const statusEmoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '🔔';
    
    let title: string;
    if (status) {
      title = `${statusEmoji} ${type === 'payin' ? 'Pay-in' : 'Payout'} ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    } else {
      title = `${emoji} New ${type === 'payin' ? 'Pay-in' : 'Payout'} Order`;
    }

    return show({
      title,
      body: `${orderNo} - ₹${amount.toLocaleString()}`,
      tag: orderNo,
    });
  }, [show]);

  return {
    permission,
    enabled,
    setEnabled,
    requestPermission,
    show,
    showTransactionNotification,
    isSupported: 'Notification' in window,
  };
};
