import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsProps {
  onQuickJumpOpen?: () => void;
  enabled?: boolean;
  enableSwipeNavigation?: boolean;
}

export function useKeyboardShortcuts({ 
  onQuickJumpOpen, 
  enabled = true,
  enableSwipeNavigation = true
}: UseKeyboardShortcutsProps = {}) {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      action: () => onQuickJumpOpen?.(),
      description: 'Open quick jump'
    },
    {
      key: 'k',
      metaKey: true, // For Mac users
      action: () => onQuickJumpOpen?.(),
      description: 'Open quick jump'
    },
    {
      key: '/',
      action: () => onQuickJumpOpen?.(),
      description: 'Open quick jump'
    },
    {
      key: 'h',
      action: () => router.push('/dashboard'),
      description: 'Go to dashboard'
    },
    {
      key: 'r',
      action: () => router.push('/dashboard/reports'),
      description: 'Go to all reports'
    },
    {
      key: 'n',
      action: () => router.push('/dashboard/notifications'),
      description: 'Go to notifications'
    },
    {
      key: 'p',
      action: () => router.push('/profile'),
      description: 'Go to profile'
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals or go back
        if (window.history.length > 1) {
          router.back();
        }
      },
      description: 'Go back or close'
    }
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return;
    }

    // Find matching shortcut
    const shortcut = shortcuts.find(s => {
      const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = s.ctrlKey ? event.ctrlKey : true; // If not required, always match
      const metaMatch = s.metaKey ? event.metaKey : true; // If not required, always match
      const shiftMatch = s.shiftKey ? event.shiftKey : true; // If not required, always match
      
      // Also ensure that if modifier is not required, it's not pressed (unless it's required by another shortcut)
      const noExtraCtrl = s.ctrlKey || !event.ctrlKey;
      const noExtraMeta = s.metaKey || !event.metaKey;
      const noExtraShift = s.shiftKey || !event.shiftKey;
      
      return keyMatch && ctrlMatch && metaMatch && shiftMatch && noExtraCtrl && noExtraMeta && noExtraShift;
    });

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }, [shortcuts, onQuickJumpOpen, router]);

  // Swipe navigation for mobile
  useEffect(() => {
    if (!enableSwipeNavigation || typeof window === 'undefined') return;

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const minSwipeDistance = 100;
      
      // Only trigger if horizontal swipe is longer than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Don't interfere with input elements
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('input') ||
          target.closest('textarea')
        ) {
          return;
        }

        if (deltaX > 0) {
          // Swipe right - go back
          if (window.history.length > 1) {
            router.back();
          }
        }
        // Note: Swipe left for forward navigation could be added here if needed
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableSwipeNavigation, router]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcuts.map(s => ({
      key: s.key,
      ctrlKey: s.ctrlKey,
      metaKey: s.metaKey,
      shiftKey: s.shiftKey,
      description: s.description
    }))
  };
} 