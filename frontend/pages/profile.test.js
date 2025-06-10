import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "./profile";
import { UserContext } from "./_app";

const mockUser = {
  id: "u1",
  name: "Test User",
  email: "test@example.com",
  avatarUrl: "/users/u1/avatar",
};

describe("ProfilePage", () => {
  let setUser;
  beforeEach(() => {
    setUser = jest.fn();
    global.fetch = jest.fn();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders avatar and user info", () => {
    render(
      <UserContext.Provider value={{ user: mockUser, setUser }}>
        <ProfilePage />
      </UserContext.Provider>
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
      <UserContext.Provider value={{ user, setUser }}>
        <ProfilePage />
      </UserContext.Provider>
    );
    expect(screen.getByText("TU")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("handles avatar upload success", async () => {
    const user = { ...mockUser, avatarUrl: null };
    const newUser = { ...user, avatarUrl: "/users/u1/avatar" };
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, avatarId: "a1" }) }) // upload
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: newUser }) }); // session
    const { container } = render(
      <UserContext.Provider value={{ user, setUser }}>
        <ProfilePage />
      </UserContext.Provider>
    );
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const inputEl = container.querySelector('input[type="file"]');
    fireEvent.change(inputEl, { target: { files: [file] } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(newUser));
    expect(screen.getByText(/avatar updated/i)).toBeInTheDocument();
  });

  it("handles avatar removal", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, status: 204 }) // delete
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { ...mockUser, avatarUrl: null } }) }); // session
    render(
      <UserContext.Provider value={{ user: mockUser, setUser }}>
        <ProfilePage />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText("Remove Avatar"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(setUser).toHaveBeenCalled());
    expect(screen.getByText(/avatar removed/i)).toBeInTheDocument();
  });

  it("shows error on upload failure", async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "fail" }) });
    const { container } = render(
      <UserContext.Provider value={{ user: mockUser, setUser }}>
        <ProfilePage />
      </UserContext.Provider>
    );
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const inputEl = container.querySelector('input[type="file"]');
    fireEvent.change(inputEl, { target: { files: [file] } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/fail/i)).toBeInTheDocument());
  });
}); 