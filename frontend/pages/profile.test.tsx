import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "./profile";
import { UserContext } from "./_app";
import '@testing-library/jest-dom';

// Use the global User type from types.d.ts
const mockUser: User = {
  id: "u1",
  name: "Test User",
  email: "test@example.com",
  avatarUrl: "/users/u1/avatar",
};

describe("ProfilePage", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setUser: any;
  
  beforeEach(() => {
    setUser = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = jest.fn();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders avatar and user info", () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ user: mockUser, setUser } as any}>
        <ProfilePage />
      </UserContext.Provider>,
    );
    expect(screen.getByText("Your Profile")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByText("Remove Avatar")).toBeInTheDocument();
  });

  it("shows initials fallback if no avatar", () => {
    const user = { ...mockUser, avatarUrl: null };
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ user, setUser } as any}>
        <ProfilePage />
      </UserContext.Provider>,
    );
    expect(screen.getByText("TU")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("handles avatar upload success", async () => {
    const user = { ...mockUser, avatarUrl: null };
    const newUser = { ...user, avatarUrl: "/users/u1/avatar" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, avatarId: "a1" }),
      }) // upload
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: newUser }),
      }); // session
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ user, setUser } as any}>
        <ProfilePage />
      </UserContext.Provider>,
    );
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const inputEl = container.querySelector('input[type="file"]')!;
    fireEvent.change(inputEl, { target: { files: [file] } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(newUser));
    expect(screen.getByText(/avatar updated/i)).toBeInTheDocument();
  });

  it("handles avatar removal", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch)
      .mockResolvedValueOnce({ ok: true, status: 204 }) // delete
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { ...mockUser, avatarUrl: null } }),
      }); // session
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ user: mockUser, setUser } as any}>
        <ProfilePage />
      </UserContext.Provider>,
    );
    fireEvent.click(screen.getByText("Remove Avatar"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(setUser).toHaveBeenCalled());
    expect(screen.getByText(/avatar removed/i)).toBeInTheDocument();
  });

  it("shows error on upload failure", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((global as any).fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "fail" }),
    });
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ user: mockUser, setUser } as any}>
        <ProfilePage />
      </UserContext.Provider>,
    );
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const inputEl = container.querySelector('input[type="file"]')!;
    fireEvent.change(inputEl, { target: { files: [file] } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/fail/i)).toBeInTheDocument());
  });
}); 