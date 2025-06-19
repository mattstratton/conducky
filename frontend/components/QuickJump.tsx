import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useRouter } from 'next/router';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Clock, 
  Star, 
  Zap, 
  Home, 
  ClipboardList, 
  Bell, 
  User, 
  Settings,
  Users,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickJumpProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons = {
  recent: Clock,
  favorite: Star,
  shortcut: Zap,
};

const categoryLabels = {
  recent: 'Recent',
  favorite: 'Favorites',
  shortcut: 'Quick Access',
};

const contextColors = {
  global: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  event: 'bg-green-500/10 text-green-700 dark:text-green-300',
  admin: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export function QuickJump({ isOpen, onClose }: QuickJumpProps) {
  const { searchQuickJump } = useNavigation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Search results
  const searchResults = React.useMemo(() => {
    return searchQuickJump(query);
  }, [query, searchQuickJump]);

  // Group results by category
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, typeof searchResults> = {};
    
    searchResults.forEach(item => {
      const category = item.category || 'shortcut';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    // Sort categories: shortcuts first, then favorites, then recent
    const sortedCategories = ['shortcut', 'favorite', 'recent'].filter(cat => groups[cat]?.length > 0);
    
    return sortedCategories.map(category => ({
      category,
      items: groups[category] || [],
    }));
  }, [searchResults]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a brief delay to ensure dialog is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Update selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemsRef.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = searchResults.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = searchResults[selectedIndex];
      if (selectedItem) {
        handleItemClick(selectedItem);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [searchResults, selectedIndex, onClose]);

  // Handle item click
  const handleItemClick = useCallback((item: typeof searchResults[0]) => {
    router.push(item.href);
    onClose();
  }, [router, onClose]);

  // Get icon for item based on context or default
  const getItemIcon = (item: typeof searchResults[0]) => {
    if (item.href === '/dashboard') return Home;
    if (item.href.includes('/reports')) return ClipboardList;
    if (item.href.includes('/notifications')) return Bell;
    if (item.href.includes('/profile')) return User;
    if (item.href.includes('/settings')) return Settings;
    if (item.href.includes('/team')) return Users;
    if (item.href.includes('/admin')) return Shield;
    return Home;
  };

  let flatIndex = 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0" aria-describedby="quick-jump-description">
        <DialogTitle className="sr-only">Quick Jump Search</DialogTitle>
        <DialogDescription id="quick-jump-description" className="sr-only">
          Search and navigate to pages, events, and reports using keyboard shortcuts
        </DialogDescription>
        <div className="flex items-center border-b px-4 py-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, events, reports..."
            className="border-0 shadow-none focus-visible:ring-0 text-base"
          />
          <div className="ml-2 flex gap-1">
            <Badge variant="outline" className="text-xs">
              ↑↓ Navigate
            </Badge>
            <Badge variant="outline" className="text-xs">
              ↵ Select
            </Badge>
            <Badge variant="outline" className="text-xs">
              Esc Close
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {groupedResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            <div className="p-2">
              {groupedResults.map(({ category, items }) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    {React.createElement(categoryIcons[category as keyof typeof categoryIcons], {
                      className: "h-3 w-3"
                    })}
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  <div className="space-y-1">
                    {items.map((item, itemIndex) => {
                      const currentFlatIndex = flatIndex++;
                      const isSelected = currentFlatIndex === selectedIndex;
                      const Icon = getItemIcon(item);
                      
                      return (
                        <div
                          key={`${category}-${itemIndex}`}
                          ref={(el) => {
                            itemsRef.current[currentFlatIndex] = el;
                          }}
                          onClick={() => handleItemClick(item)}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors',
                            isSelected 
                              ? 'bg-accent text-accent-foreground' 
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-60" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.context && (
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  'text-xs px-1.5 py-0.5 h-5',
                                  contextColors[item.context]
                                )}
                              >
                                {item.context}
                              </Badge>
                            )}
                            {category === 'recent' && item.timestamp && (
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(item.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Quick jump • {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString();
} 