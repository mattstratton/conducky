import React from "react";
import { render, screen } from "@testing-library/react";
import Avatar from "./Avatar";

describe("Avatar", () => {
  it("renders image when avatarUrl is present (absolute)", () => {
    const user = { name: "Alice", avatarUrl: "http://example.com/avatar.png" };
    render(<Avatar user={user} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", user.avatarUrl);
    expect(img).toHaveAttribute("alt", "Alice");
  });

  it("renders image when avatarUrl is present (relative)", () => {
    const user = { name: "Bob", avatarUrl: "/users/123/avatar" };
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
    render(<Avatar user={user} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "http://localhost:3001/users/123/avatar");
  });

  it("renders initials and color fallback if no avatarUrl", () => {
    const user = { name: "Charlie Brown", email: "charlie@example.com" };
    render(<Avatar user={user} />);
    expect(screen.getByText("CB")).toBeInTheDocument();
    // Should not render an <img>
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders ? if no name or email", () => {
    const user = {};
    render(<Avatar user={user} />);
    expect(screen.getByText("?"));
  });
}); 