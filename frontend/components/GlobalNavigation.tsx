import React, { useState } from 'react';
import { NavigationProvider } from '@/context/NavigationContext';
import { QuickJump } from '@/components/QuickJump';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Search, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalNavigationProps {
  children: React.ReactNode;
  className?: string;
}

interface NavigationHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

function NavigationHelp({ isOpen, onClose }: NavigationHelpProps) {
  const { shortcuts } = useKeyboardShortcuts();

  // Focus management
  React.useEffect(() => {
    if (isOpen) {
      const focusableElement = document.querySelector('[role="dialog"] button') as HTMLElement;
      focusableElement?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      aria-describedby="help-dialog-description"
    >
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="help-dialog-title" className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ×
          </Button>
        </div>
        
        <div id="help-dialog-description" className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.ctrlKey && (
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl</kbd>
                )}
                {shortcut.metaKey && (
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘</kbd>
                )}
                {shortcut.shiftKey && (
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">Shift</kbd>
                )}
                <kbd className="px-2 py-1 text-xs bg-muted rounded">
                  {shortcut.key === ' ' ? 'Space' : shortcut.key}
                </kbd>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded">?</kbd> to show/hide this help</p>
        </div>
      </div>
    </div>
  );
}

function NavigationControls() {
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showDiscoveryHint, setShowDiscoveryHint] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({ 
    onQuickJumpOpen: () => setQuickJumpOpen(true)
  });

  // Handle help shortcut separately
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          return;
        }
        e.preventDefault();
        setHelpOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show discovery hint for new users
  React.useEffect(() => {
    const hasSeenHint = localStorage.getItem('conducky_navigation_hint_seen');
    if (!hasSeenHint) {
      const timer = setTimeout(() => {
        setShowDiscoveryHint(true);
      }, 3000); // Show after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDiscoveryHintDismiss = () => {
    setShowDiscoveryHint(false);
    localStorage.setItem('conducky_navigation_hint_seen', 'true');
  };

  return (
    <>
      {/* Discovery Hint for new users */}
      {showDiscoveryHint && (
        <div 
          className="fixed top-16 right-4 z-50 bg-blue-600 text-white p-3 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right-2"
          role="alert"
          aria-live="polite"
          aria-labelledby="discovery-hint-title"
        >
          <div className="flex items-start gap-2">
            <Search className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p id="discovery-hint-title" className="text-sm font-medium">Quick Navigation Available!</p>
              <p className="text-xs text-blue-100 mt-1">
                Press <kbd className="px-1 py-0.5 bg-blue-700 rounded text-xs">Ctrl+K</kbd> or <kbd className="px-1 py-0.5 bg-blue-700 rounded text-xs">/</kbd> to quickly jump to any page
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscoveryHintDismiss}
              className="h-6 w-6 p-0 text-blue-100 hover:text-white hover:bg-blue-700"
              aria-label="Dismiss navigation hint"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Quick Jump Button - Fixed position for easy access */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setQuickJumpOpen(true)}
        className="fixed bottom-4 right-4 z-40 shadow-lg bg-background/95 backdrop-blur-sm md:hidden"
        title="Quick Jump (Ctrl+K)"
        aria-label="Open quick navigation search"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Help Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-4 right-16 z-40 shadow-lg bg-background/95 backdrop-blur-sm md:hidden"
        title="Keyboard Shortcuts (?)"
        aria-label="Show keyboard shortcuts help"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      {/* Quick Jump Modal */}
      <QuickJump 
        isOpen={quickJumpOpen} 
        onClose={() => setQuickJumpOpen(false)} 
      />

      {/* Help Modal */}
      <NavigationHelp 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
      />
    </>
  );
}

export function GlobalNavigation({ children, className }: GlobalNavigationProps) {
  // We'll pass empty data for now since NavigationProvider can work without it
  // The user and events data will be populated as the app loads
  return (
    <NavigationProvider user={undefined} events={[]}>
      <div className={cn("min-h-screen", className)}>
        {children}
        <NavigationControls />
      </div>
    </NavigationProvider>
  );
} 