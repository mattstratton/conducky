import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickJump } from '@/components/QuickJump';
import { NavigationProvider } from '@/context/NavigationContext';

// Mock next/router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/dashboard',
  query: {},
  asPath: '/dashboard',
  isReady: true,
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

const renderWithNavigation = (ui: React.ReactElement) => {
  return render(
    <NavigationProvider>
      {ui}
    </NavigationProvider>
  );
};

describe('QuickJump', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    renderWithNavigation(
      <QuickJump isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByPlaceholderText('Search pages, events, reports...')).toBeInTheDocument();
    expect(screen.getByText('↑↓ Navigate')).toBeInTheDocument();
    expect(screen.getByText('↵ Select')).toBeInTheDocument();
    expect(screen.getByText('Esc Close')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithNavigation(
      <QuickJump isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByPlaceholderText('Search pages, events, reports...')).not.toBeInTheDocument();
  });

  it('shows default message when no query', () => {
    renderWithNavigation(
      <QuickJump isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Start typing to search...')).toBeInTheDocument();
  });

  it('handles search input', async () => {
    renderWithNavigation(
      <QuickJump isOpen={true} onClose={mockOnClose} />
    );

    const input = screen.getByPlaceholderText('Search pages, events, reports...');
    fireEvent.change(input, { target: { value: 'dashboard' } });

    await waitFor(() => {
      expect(input).toHaveValue('dashboard');
    });
  });

  it('handles keyboard navigation', async () => {
    renderWithNavigation(
      <QuickJump isOpen={true} onClose={mockOnClose} />
    );

    const input = screen.getByPlaceholderText('Search pages, events, reports...');
    
    // Test Escape key
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on dialog change', () => {
    renderWithNavigation(
      <QuickJump isOpen={true} onClose={mockOnClose} />
    );

    // Simulate dialog close
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    
    // The onClose should be called
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows result count', () => {
    renderWithNavigation(
      <QuickJump isOpen={true} onClose={mockOnClose} />
    );

    // Should show 0 results initially
    expect(screen.getByText(/0 result/)).toBeInTheDocument();
  });
}); 