import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserRegistrationForm } from "./UserRegistrationForm";

describe("UserRegistrationForm", () => {
  const baseProps = {
    onSubmit: jest.fn(),
    buttonText: "Register",
    loading: false,
    error: "",
    success: "",
    defaultName: "",
    defaultEmail: "",
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders all fields", () => {
    render(<UserRegistrationForm {...baseProps} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });

  it("shows error for invalid email", async () => {
    const { container } = render(<UserRegistrationForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test User" } });
    fireEvent.blur(screen.getByLabelText(/name/i));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "invalid" } });
    fireEvent.blur(screen.getByLabelText(/email/i));
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.blur(screen.getByLabelText(/^password$/i));
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
    fireEvent.blur(screen.getByLabelText(/confirm password/i));
    const form = container.querySelector("form");
    if (!form) throw new Error("Form element not found");
    fireEvent.submit(form);
    // eslint-disable-next-line no-console
    console.log(document.body.textContent);
    const errors = await screen.findAllByText(/please enter a valid email address/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("shows error for password mismatch", async () => {
    render(<UserRegistrationForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test User" } });
    fireEvent.blur(screen.getByLabelText(/name/i));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.blur(screen.getByLabelText(/email/i));
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.blur(screen.getByLabelText(/^password$/i));
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different" } });
    fireEvent.blur(screen.getByLabelText(/confirm password/i));
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    const errors = await screen.findAllByText(/passwords do not match/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("calls onSubmit with valid data", async () => {
    const onSubmit = jest.fn();
    render(<UserRegistrationForm {...baseProps} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test User" } });
    fireEvent.blur(screen.getByLabelText(/name/i));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.blur(screen.getByLabelText(/email/i));
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.blur(screen.getByLabelText(/^password$/i));
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
    fireEvent.blur(screen.getByLabelText(/confirm password/i));
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
    });
  });
}); 