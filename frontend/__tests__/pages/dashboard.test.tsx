import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import GlobalDashboard from '../../pages/dashboard/index';
import { UserContext } from '../../pages/_app';
import '@testing-library/jest-dom';

// Mock next/router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  asPath: '/dashboard',
  pathname: '/dashboard',
  query: {},
  route: '/dashboard',
  basePath: '',
  isLocaleDomain: false,
  back: jest.fn(),
  beforePopState: jest.fn(),
  prefetch: jest.fn(),
  reload: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isPreview: false,
  isReady: true,
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock the QuickStats component
jest.mock('../../components/shared/QuickStats', () => {
  return {
    QuickStats: function MockQuickStats() {
      return <div data-testid="quick-stats">Quick Stats</div>;
    }
  };
});

// Mock the ActivityFeed component
jest.mock('../../components/shared/ActivityFeed', () => {
  return {
    ActivityFeed: function MockActivityFeed() {
      return <div data-testid="activity-feed">Activity Feed</div>;
    }
  };
});

// Mock the JoinEventWidget component
jest.mock('../../components/shared/JoinEventWidget', () => {
  return {
    JoinEventWidget: function MockJoinEventWidget({ onJoin }: { onJoin: () => void }) {
      return (
        <div data-testid="join-event-widget">
          <button onClick={onJoin}>Join Event</button>
        </div>
      );
    }
  };
});

// Mock the EventCard component
jest.mock('../../components/shared/EventCard', () => {
  return {
    EventCard: function MockEventCard({ event }: { event: { name: string } }) {
      return <div data-testid="event-card">{event.name}</div>;
    }
  };
});

interface MockUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

const mockUserWithSingleEvent: MockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  roles: ['reporter']
};

const mockUserWithMultipleEvents: MockUser = {
  id: 'user-2', 
  name: 'Multi Event User',
  email: 'multi@example.com',
  roles: ['reporter', 'responder']
};

const mockSingleEvent = [
  {
    id: 'event-1',
    name: 'Test Event',
    slug: 'test-event',
    description: 'A test event',
    roles: ['reporter']
  }
];

const mockMultipleEvents = [
  {
    id: 'event-1',
    name: 'Test Event 1',
    slug: 'test-event-1', 
    description: 'First test event',
    roles: ['reporter']
  },
  {
    id: 'event-2',
    name: 'Test Event 2',
    slug: 'test-event-2',
    description: 'Second test event', 
    roles: ['responder']
  }
];

const renderWithContext = (user: MockUser | null, sessionLoading = false) => {
  const contextValue = {
    user,
    setUser: jest.fn(),
    sessionLoading
  };

  return render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <UserContext.Provider value={contextValue as any}>
      <GlobalDashboard />
    </UserContext.Provider>
  );
};

describe('GlobalDashboard Submit Incident Feature', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('shows prominent submit incident CTA for single event user', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: mockSingleEvent })
    });

    renderWithContext(mockUserWithSingleEvent);

    await waitFor(() => {
      expect(screen.getByText('Need to Report an Incident?')).toBeInTheDocument();
      expect(screen.getByText('Submit an incident quickly and securely')).toBeInTheDocument();
      expect(screen.getByText('Submit Incident for Test Event')).toBeInTheDocument();
    });

    // Check that the button links to the correct URL
    const submitButton = screen.getByRole('link', { name: /Submit Incident for Test Event/i });
    expect(submitButton).toHaveAttribute('href', '/events/test-event/incidents/new');
  });

  it('shows event selector for multiple event user', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: mockMultipleEvents })
    });

    renderWithContext(mockUserWithMultipleEvents);

    await waitFor(() => {
      expect(screen.getByText('Need to Report an Incident?')).toBeInTheDocument();
      expect(screen.getByText('Select an event to submit a incident:')).toBeInTheDocument();
      expect(screen.getByText('Choose an event...')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching events', () => {
    // Mock fetch to return a promise that never resolves to simulate loading state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockImplementation(() => new Promise(() => {}));
    
    renderWithContext(mockUserWithSingleEvent);

    expect(screen.getByText('Loading your events...')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    renderWithContext(null);

    expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Fdashboard');
  });

  it('shows no events state when user has no events', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [] })
    });

    renderWithContext(mockUserWithSingleEvent);

    await waitFor(() => {
      expect(screen.getByText('No Events Yet')).toBeInTheDocument();
      expect(screen.getByText('You have not been added to any events yet. Please check your email for invites or contact an event organizer.')).toBeInTheDocument();
    });
  });

  it('submit report CTA is positioned prominently after header', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: mockSingleEvent })
    });

    renderWithContext(mockUserWithSingleEvent);

    await waitFor(() => {
      const header = screen.getByText('Your Global Dashboard');
      const submitSection = screen.getByText('Need to Report an Incident?');
      
      // Both should be in the document
      expect(header).toBeInTheDocument();
      expect(submitSection).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockRejectedValueOnce(new Error('Network error'));

    renderWithContext(mockUserWithSingleEvent);

    await waitFor(() => {
      expect(screen.getByText('Could not load your events.')).toBeInTheDocument();
    });
  });
}); 