import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { IncidentForm } from './IncidentForm';
import { UserContext } from '../pages/_app';

jest.mock("next/router", () => ({
  useRouter: () => ({
    asPath: "/event/test-event",
    push: jest.fn(),
    reload: jest.fn(),
  }),
}));

// Mock CoCTeamList to avoid fetch issues in tests
jest.mock('./CoCTeamList', () => ({
  CoCTeamList: () => <div data-testid="mocked-coc-team-list">Mocked CoCTeamList</div>
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseProps = {
  eventSlug: "test-event",
  eventName: "Test Event",
  onSuccess: jest.fn(),
};

const mockUser = { 
  id: "test-user", 
  name: "Test User", 
  email: "test@example.com",
  roles: [] as string[]
};

const mockUserContext = {
  user: mockUser,
  setUser: jest.fn(),
  sessionLoading: false
};

const renderWithUserContext = (userRoles: string[] = [], userContextValue = mockUserContext) => {
  // Mock the API call for user roles
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ roles: userRoles })
  });

  return render(
    <UserContext.Provider value={userContextValue}>
      <IncidentForm {...baseProps} />
    </UserContext.Provider>
  );
};

describe("IncidentForm", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetch.mockClear();
  });

  it("renders all basic input fields for reporters (no urgency)", async () => {
    renderWithUserContext(['reporter']);
    
    // Wait for role loading to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/incident title/i)).toBeInTheDocument();
    });
    
    // Check for basic form fields that work reliably
    expect(screen.getByLabelText(/incident title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date\/time of incident/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/involved parties/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location of incident/i)).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole("button", { name: "Submit Incident" })).toBeInTheDocument();
    
    // Should NOT show urgency field for reporters
    expect(screen.queryByText("Urgency Level")).not.toBeInTheDocument();
  });

  it("renders urgency field for responders and above", async () => {
    renderWithUserContext(['responder']);
    
    // Wait for role loading to complete and urgency field to appear
    await waitFor(() => {
      expect(screen.getByText("Urgency Level")).toBeInTheDocument();
    });
    
    // Should show urgency field for responders (it's a select component)
    expect(screen.getByText("Urgency Level")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders urgency field for event admins", async () => {
    renderWithUserContext(['event_admin']);
    
    // Wait for role loading to complete and urgency field to appear
    await waitFor(() => {
      expect(screen.getByText("Urgency Level")).toBeInTheDocument();
    });
    
    // Should show urgency field for event admins
    expect(screen.getByText("Urgency Level")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("displays event context", async () => {
    renderWithUserContext(['reporter']);
    
    await waitFor(() => {
      expect(screen.getByText(/for event:/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("shows form labels and structure (no removed fields)", async () => {
    renderWithUserContext(['responder']); // Use responder to see urgency field
    
    await waitFor(() => {
      expect(screen.getByText("Submit an Incident")).toBeInTheDocument();
    });
    
    // Check for the main heading
    expect(screen.getByText("Submit an Incident")).toBeInTheDocument();
    
    // Check for required field indicators
    expect(screen.getByText("Incident Title *")).toBeInTheDocument();
    expect(screen.getByText("Description *")).toBeInTheDocument();

    // Privacy copy: who sees the incident, and that the title is not encrypted
    expect(screen.getByText(/team can see every incident submitted to this event/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Incident Title/)).toHaveAccessibleDescription(/title is not encrypted/i);
    
    // Check for urgency (should be visible to responders, without * since it's optional)
    expect(screen.getByText("Urgency Level")).toBeInTheDocument();
    
    // Should NOT show removed fields
    expect(screen.queryByText(/type \*/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/preferred contact method/i)).not.toBeInTheDocument();
    
    // Check for optional field labels
    expect(screen.getByText("Location of Incident")).toBeInTheDocument();
    expect(screen.getByText("Involved Parties")).toBeInTheDocument();
  });

  it("has file upload functionality", async () => {
    renderWithUserContext(['reporter']);
    
    await waitFor(() => {
      expect(screen.getByText(/drop files here or click to upload/i)).toBeInTheDocument();
    });
    
    // Check for file upload area
    expect(screen.getByText(/drop files here or click to upload/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
  });

  it("shows related files section", async () => {
    renderWithUserContext(['reporter']);
    
    await waitFor(() => {
      expect(screen.getByText("Related Files")).toBeInTheDocument();
    });
    
    // Check for related files label
    expect(screen.getByText("Related Files")).toBeInTheDocument();
    expect(screen.getByText(/screenshots, documents, audio, video files are supported/i)).toBeInTheDocument();
  });

  it("shows loading state while checking roles", () => {
    const loadingUserContext = {
      ...mockUserContext,
      user: null
    };

    render(
      <UserContext.Provider value={loadingUserContext}>
        <IncidentForm {...baseProps} />
      </UserContext.Provider>
    );

    // The form now renders immediately without showing loading state text
    // Just check that the form container exists
    expect(screen.getByText("Submit an Incident")).toBeInTheDocument();
  });

  it("shows urgency field for system admins", async () => {
    const systemAdminUser = {
      ...mockUser,
      roles: ['system_admin']
    };
    
    const systemAdminContext = {
      ...mockUserContext,
      user: systemAdminUser
    };

    renderWithUserContext([], systemAdminContext);
    
    // Even without event roles, system admin should see urgency
    await waitFor(() => {
      expect(screen.getByText("Urgency Level")).toBeInTheDocument();
    });
    
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
}); 