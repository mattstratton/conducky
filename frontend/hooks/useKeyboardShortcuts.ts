import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useNavigation } from '@/context/NavigationContext';

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
}

export function useKeyboardShortcuts({ 
  onQuickJumpOpen, 
  enabled = true 
}: UseKeyboardShortcutsProps = {}) {
  const router = useRouter();
  const { goBack } = useNavigation();

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
          goBack();
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
      const ctrlMatch = s.ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const metaMatch = s.metaKey ? event.metaKey : !event.metaKey;
      const shiftMatch = s.shiftKey ? event.shiftKey : !event.shiftKey;
      
      return keyMatch && ctrlMatch && metaMatch && shiftMatch;
    });

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }, [shortcuts, goBack, onQuickJumpOpen, router]);

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