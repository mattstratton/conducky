import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReportDetailView from "./ReportDetailView";

// Mock Card, Table, Button, Avatar for isolation
jest.mock("./index", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Table: ({ children }) => <table data-testid="table">{children}</table>,
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));
jest.mock("./Avatar", () => ({
  __esModule: true,
  default: ({ user }) => <span data-testid="avatar">{user?.name || user?.email || "A"}</span>,
}));

describe("ReportDetailView", () => {
  const baseReport = {
    id: "r1",
    type: "incident",
    description: "Test report",
    state: "submitted",
    reporter: { id: "u1", name: "Alice", email: "alice@example.com" },
  };
  const user = { id: "u2", name: "Bob", email: "bob@example.com", roles: ["Responder"] };
  const userRoles = ["Responder"];
  const comments = [
    { id: "c1", body: "A comment", author: { id: "u2", name: "Bob" }, createdAt: new Date().toISOString(), visibility: "public" },
  ];
  const evidenceFiles = [
    { id: "e1", filename: "file1.txt", uploader: { id: "u2", name: "Bob" } },
  ];
  const eventUsers = [
    { id: "u2", name: "Bob" },
    { id: "u3", name: "Carol" },
  ];

  it("renders report details", () => {
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        comments={[]}
        evidenceFiles={[]}
      />
    );
    expect(screen.getByText("Report Detail")).toBeInTheDocument();
    expect(screen.getByText("Test report")).toBeInTheDocument();
    expect(screen.getByText("incident")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows state dropdown for allowed user", () => {
    const onStateChange = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        onStateChange={onStateChange}
      />
    );
    const select = screen.getByDisplayValue("submitted");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "acknowledged" } });
    expect(onStateChange).toHaveBeenCalled();
  });

  it("shows admin fields in adminMode", () => {
    const setAssignmentFields = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={["Admin"]}
        adminMode={true}
        assignmentFields={{ assignedResponderId: "u2", severity: "high", resolution: "done" }}
        setAssignmentFields={setAssignmentFields}
        eventUsers={eventUsers}
      />
    );
    // Check that the options for Bob and Carol are present
    expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carol' })).toBeInTheDocument();
    // Check that the severity select has "High" selected
    expect(screen.getByRole('option', { name: 'High' }).selected).toBe(true);
    // Check that the textarea for resolution has the correct value
    expect(screen.getByDisplayValue('done')).toBeInTheDocument();
  });

  it("shows evidence and allows delete for responder", () => {
    const onEvidenceDelete = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        evidenceFiles={evidenceFiles}
        onEvidenceDelete={onEvidenceDelete}
      />
    );
    expect(screen.getByText("file1.txt")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Confirm Delete"));
    expect(onEvidenceDelete).toHaveBeenCalled();
  });

  it("shows comments and allows edit/delete for author", () => {
    const onCommentEdit = jest.fn();
    const onCommentDelete = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        comments={comments}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
      />
    );
    expect(screen.getByText("A comment")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByDisplayValue("A comment"), { target: { value: "Edited" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onCommentEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Delete"));
    expect(onCommentDelete).toHaveBeenCalled();
  });

  it("shows add comment form and calls onCommentSubmit", () => {
    const onCommentSubmit = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        onCommentSubmit={onCommentSubmit}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Add a comment..."), { target: { value: "New comment" } });
    fireEvent.click(screen.getByText("Add Comment"));
    expect(onCommentSubmit).toHaveBeenCalledWith("New comment", "public");
  });

  it("renders evidence file download link with correct apiBaseUrl", () => {
    const apiBaseUrl = "https://api.example.com";
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        evidenceFiles={evidenceFiles}
        apiBaseUrl={apiBaseUrl}
      />
    );
    const link = screen.getByText("file1.txt").closest("a");
    expect(link).toHaveAttribute(
      "href",
      `${apiBaseUrl}/evidence/${evidenceFiles[0].id}/download`
    );
  });

  it("shows evidence upload form for the reporter", () => {
    const reporterUser = { id: "u1", name: "Alice", email: "alice@example.com", roles: [] };
    render(
      <ReportDetailView
        report={{ ...baseReport, reporterId: "u1" }}
        user={reporterUser}
        userRoles={[]}
        evidenceFiles={evidenceFiles}
      />
    );
    // The file input should be present
    expect(screen.getByLabelText(/file/i)).toBeInTheDocument();
    expect(screen.getByText("Upload Evidence")).toBeInTheDocument();
  });
}); 