import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportForm } from "./ReportForm";

jest.mock("next/router", () => ({
  useRouter: () => ({
    asPath: "/event/test-event",
    push: jest.fn(),
    reload: jest.fn(),
  }),
}));

const baseProps = {
  eventSlug: "test-event",
  eventName: "Test Event",
  onSuccess: jest.fn(),
};

describe("ReportForm", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders all fields", () => {
    render(<ReportForm {...baseProps} />);
    expect(screen.getByLabelText(/report title/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date\/time of incident/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/involved parties/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evidence/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit report/i })).toBeInTheDocument();
  });

  it("shows error for short title", async () => {
    const user = userEvent.setup();
    render(<ReportForm {...baseProps} />);
    
    // Fill in a short title
    await user.type(screen.getByLabelText(/report title/i), "short");
    
    // Use the hidden select element to set the value (workaround for Radix UI testing issues)
    const hiddenSelect = screen.getByDisplayValue("Harassment");
    fireEvent.change(hiddenSelect, { target: { value: "harassment" } });
    
    // Fill in description
    await user.type(screen.getByLabelText(/description/i), "desc");
    
    // Submit form
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          /title must be between 10 and 70 characters/i.test(content)
        )
      ).toBeInTheDocument();
    });
  });

  it("submits successfully with valid data", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ReportForm {...baseProps} />);
    
    // Fill in valid title
    await user.type(screen.getByLabelText(/report title/i), "A valid report title");
    
    // Use the hidden select element to set the value (workaround for Radix UI testing issues)
    const hiddenSelect = screen.getByDisplayValue("Harassment");
    fireEvent.change(hiddenSelect, { target: { value: "harassment" } });
    
    // Fill in description
    await user.type(screen.getByLabelText(/description/i), "A valid description");
    
    // Submit form
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/report submitted/i)).toBeInTheDocument();
    });
  });
}); 