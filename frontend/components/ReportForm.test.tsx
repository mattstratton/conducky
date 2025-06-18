import React from "react";
import { render, screen } from "@testing-library/react";
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

  it("renders all basic input fields", () => {
    render(<ReportForm {...baseProps} />);
    
    // Check for basic form fields that work reliably
    expect(screen.getByLabelText(/report title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date\/time of incident/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/involved parties/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location of incident/i)).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole("button", { name: /submit report/i })).toBeInTheDocument();
  });

  it("displays event context", () => {
    render(<ReportForm {...baseProps} />);
    expect(screen.getByText(/for event:/i)).toBeInTheDocument();
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("shows form labels and structure", () => {
    render(<ReportForm {...baseProps} />);
    
    // Check for the main heading
    expect(screen.getByText("Submit a Report")).toBeInTheDocument();
    
    // Check for required field indicators
    expect(screen.getByText("Report Title *")).toBeInTheDocument();
    expect(screen.getByText("Type *")).toBeInTheDocument();
    expect(screen.getByText("Urgency Level *")).toBeInTheDocument();
    expect(screen.getByText("Preferred Contact Method *")).toBeInTheDocument();
    
    // Check for optional field labels
    expect(screen.getByText("Location of Incident")).toBeInTheDocument();
    expect(screen.getByText("Involved Parties")).toBeInTheDocument();
  });

  it("has file upload functionality", () => {
    render(<ReportForm {...baseProps} />);
    
    // Check for file upload area
    expect(screen.getByText(/drop files here or click to upload/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
  });

  it("shows evidence files section", () => {
    render(<ReportForm {...baseProps} />);
    
    // Check for evidence files label
    expect(screen.getByText("Evidence Files")).toBeInTheDocument();
    expect(screen.getByText(/screenshots, documents, audio, video files are supported/i)).toBeInTheDocument();
  });
}); 