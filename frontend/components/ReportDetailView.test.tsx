/* global jest, describe, it, expect */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportDetailView from "./ReportDetailView";

// Mock Card, Table, Button, Avatar for isolation
jest.mock("./ui/card", () => ({
  __esModule: true,
  Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
}));
jest.mock("./Table", () => ({
  __esModule: true,
  Table: ({ children, ...props }) => <table data-testid="table" {...props}>{children}</table>,
}));
jest.mock("@/components/ui/button", () => ({
  __esModule: true,
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
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
        report={{ ...baseReport, title: "Test Title", reporterId: "u1" }}
        user={{ id: "u1", name: "Alice", roles: [] }}
        userRoles={[]}
      />
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test report")).toBeInTheDocument();
    expect(screen.getByText("Incident")).toBeInTheDocument();
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
    fireEvent.click(screen.getByLabelText('Edit state'));
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
    fireEvent.click(screen.getByLabelText('Edit assigned responder'));
    expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carol' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Edit severity'));
    expect((screen.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(true);
    fireEvent.click(screen.getByLabelText('Edit resolution'));
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

  // TODO: Update these tests for the new CommentsSection architecture
  // The comments are now fetched internally in CommentsSection and require eventSlug
  xit("shows comments and allows edit/delete for author", () => {
    const onCommentEdit = jest.fn();
    const onCommentDelete = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        eventSlug="test-event"
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

  xit("shows add comment form and calls onCommentSubmit", () => {
    const onCommentSubmit = jest.fn();
    render(
      <ReportDetailView
        report={baseReport}
        user={user}
        userRoles={userRoles}
        eventSlug="test-event"
        onCommentSubmit={onCommentSubmit}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Write your comment..."), { target: { value: "New comment" } });
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
        onEvidenceUpload={jest.fn()}
      />
    );
    expect(screen.getByLabelText(/file/i)).toBeInTheDocument();
    expect(screen.getByText("Upload Evidence")).toBeInTheDocument();
  });

  it("shows the report title as the heading", () => {
    render(
      <ReportDetailView
        report={{ ...baseReport, title: "Test Title", reporterId: "u1" }}
        user={{ id: "u1", name: "Alice", roles: [] }}
        userRoles={[]}
      />
    );
    expect(screen.getByRole("heading", { name: /Test Title/ })).toBeInTheDocument();
  });

  it("shows edit button for reporter", () => {
    render(
      <ReportDetailView
        report={{ ...baseReport, title: "Test Title", reporterId: "u1" }}
        user={{ id: "u1", name: "Alice", roles: [] }}
        userRoles={[]}
      />
    );
    expect(screen.getByLabelText('Edit title')).toBeInTheDocument();
  });

  it("shows edit button for admin", () => {
    render(
      <ReportDetailView
        report={{ ...baseReport, title: "Test Title", reporterId: "u2" }}
        user={{ id: "admin", name: "Admin", roles: ["Admin"] }}
        userRoles={["Admin"]}
      />
    );
    expect(screen.getByLabelText('Edit title')).toBeInTheDocument();
  });

  it("allows editing the title and validates length", async () => {
    const onTitleEdit = jest.fn(() => Promise.resolve());
    render(
      <ReportDetailView
        report={{ ...baseReport, title: "Test Title", reporterId: "u1" }}
        user={{ id: "u1", name: "Alice", roles: [] }}
        userRoles={[]}
        onTitleEdit={onTitleEdit}
      />
    );
    fireEvent.click(screen.getByLabelText('Edit title'));
    const input = screen.getByPlaceholderText("Report Title");
    fireEvent.change(input, { target: { value: "short" } });
    fireEvent.click(screen.getByText("Save"));
    expect(await screen.findByText(/between 10 and 70/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "A valid new title" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(onTitleEdit).toHaveBeenCalledWith("A valid new title"));
  });
}); 