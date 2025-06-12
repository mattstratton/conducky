import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { CoCTeamList } from "./CoCTeamList";
import { UserContext } from "../pages/_app";

const mockUser = { id: "test", email: "test@example.com" };

// Mock fetch
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

describe("CoCTeamList", () => {
  it("shows loading state", () => {
    fetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <CoCTeamList eventSlug="test-event" />
      </UserContext.Provider>
    );
    expect(screen.getByText(/loading team/i)).toBeInTheDocument();
  });

  it("shows error state", async () => {
    fetch.mockRejectedValueOnce(new Error("fail"));
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <CoCTeamList eventSlug="test-event" />
      </UserContext.Provider>
    );
    await waitFor(() =>
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument(),
    );
  });

  it("shows empty state if no users", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [] }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [] }),
    });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <CoCTeamList eventSlug="test-event" />
      </UserContext.Provider>
    );
    await waitFor(() =>
      expect(screen.getByText(/no responders or admins/i)).toBeInTheDocument(),
    );
  });

  it("shows team members", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [{ id: "1", name: "Alice", email: "alice@example.com" }],
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [{ id: "2", name: "Bob", email: "bob@example.com" }],
      }),
    });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <CoCTeamList eventSlug="test-event" />
      </UserContext.Provider>
    );
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("(alice@example.com)")).toBeInTheDocument();
    expect(screen.getByText("(bob@example.com)")).toBeInTheDocument();
  });

  it("dedupes users by id", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [{ id: "1", name: "Alice", email: "alice@example.com" }],
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [{ id: "1", name: "Alice", email: "alice@example.com" }],
      }),
    });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <CoCTeamList eventSlug="test-event" />
      </UserContext.Provider>
    );
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    // Should only appear once
    expect(screen.getAllByText("Alice").length).toBe(1);
  });
});
