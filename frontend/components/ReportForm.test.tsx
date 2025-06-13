import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date\/time of incident/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/involved parties/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evidence/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit report/i })).toBeInTheDocument();
  });

  it("shows error for short title", async () => {
    render(<ReportForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/report title/i), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: "harassment" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "desc" } });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));
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
    render(<ReportForm {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/report title/i), { target: { value: "A valid report title" } });
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: "harassment" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "A valid description" } });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));
    await waitFor(() => {
      expect(screen.getByText(/report submitted/i)).toBeInTheDocument();
    });
  });
}); 