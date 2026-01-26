import { useRef, useCallback, useEffect } from 'react';

// Base64 encoded notification sound (short beep)
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleB8NLIrS6Z5ZFQY5k9G6dxkEB0aW0sqWXAsEPprMtm0eDQU4lsW0dRwNBzaYvq5wHBMMN5e5p2ocEg02l7OhZhsUDTaWrJphGhUNNpaolF4ZFg42laGOWxgXDjaVm4lXFxkON5WWg1MWGg44lZF+TxUbDzmVjXlLFBwPOpWJdEcTHRA7lYVwQxIfETuVgnE/EB8SPJJ8bDsPIBM9kXdoPQ8hFD2Pc2M6DiIVPo5wXzYNIxY+jWxbMwskFz+LZ1YvCiQYQIpjUSwJJRlAiF5NKQgmGkGHWkkl';

interface UseNotificationSoundOptions {
  volume?: number;
  enabled?: boolean;
}

export const useNotificationSound = (options: UseNotificationSoundOptions = {}) => {
  const { volume = 0.5, enabled = true } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
    audioRef.current.volume = volume;
    
    return () => {
      audioRef.current = null;
    };
  }, [volume]);

  const play = useCallback(() => {
    if (enabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked by browser
        console.log('Sound blocked by browser autoplay policy');
      });
    }
  }, [enabled]);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  return { play, setVolume };
};
