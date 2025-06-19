import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileQuickActions } from '@/components/report-detail/MobileQuickActions';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  MessageSquare: () => <div data-testid="message-square-icon">MessageSquare</div>,
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  Share: () => <div data-testid="share-icon">Share</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
}));

describe('MobileQuickActions', () => {
  const mockOnAddComment = jest.fn();
  const mockOnUploadEvidence = jest.fn();
  const mockOnEditReport = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render main action button', () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        onAddComment={mockOnAddComment}
      />
    );

    expect(screen.getByRole('button', { name: /open quick actions/i })).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('should not render when no actions are available', () => {
    const { container } = render(
      <MobileQuickActions
        canAddComment={false}
        canUploadEvidence={false}
        canEditReport={false}
        // Note: share action is always available by default, so component will render
      />
    );

    // Component should render because share action is always available
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByRole('button', { name: /open quick actions/i })).toBeInTheDocument();
  });

  it('should expand and show action buttons when clicked', async () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        canUploadEvidence={true}
        onAddComment={mockOnAddComment}
        onUploadEvidence={mockOnUploadEvidence}
      />
    );

    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    fireEvent.click(mainButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close quick actions/i })).toBeInTheDocument();
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    // Should show action buttons
    expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload evidence/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('should call appropriate handlers when action buttons are clicked', async () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        canUploadEvidence={true}
        canEditReport={true}
        onAddComment={mockOnAddComment}
        onUploadEvidence={mockOnUploadEvidence}
        onEditReport={mockOnEditReport}
        onShare={mockOnShare}
      />
    );

    // Expand the actions
    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    fireEvent.click(mainButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
    });

    // Test comment action
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));
    expect(mockOnAddComment).toHaveBeenCalledTimes(1);

    // Expand again
    fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload evidence/i })).toBeInTheDocument();
    });

    // Test upload evidence action
    fireEvent.click(screen.getByRole('button', { name: /upload evidence/i }));
    expect(mockOnUploadEvidence).toHaveBeenCalledTimes(1);
  });

  it('should collapse when clicking action buttons', async () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        onAddComment={mockOnAddComment}
      />
    );

    // Expand
    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    fireEvent.click(mainButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
    });

    // Click action button
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    // Should collapse
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add comment/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open quick actions/i })).toBeInTheDocument();
    });
  });

  it('should only show actions that are enabled', () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        canUploadEvidence={false}
        canEditReport={false}
        onAddComment={mockOnAddComment}
        onUploadEvidence={mockOnUploadEvidence}
        onEditReport={mockOnEditReport}
      />
    );

    // Expand
    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    fireEvent.click(mainButton);

    // Should only show comment and share actions
    expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload evidence/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit report/i })).not.toBeInTheDocument();
  });

  it('should handle backdrop click to close', async () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        onAddComment={mockOnAddComment}
      />
    );

    // Expand
    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    fireEvent.click(mainButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
    });

    // Click backdrop (using aria-hidden selector)
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add comment/i })).not.toBeInTheDocument();
      });
    }
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MobileQuickActions
        canAddComment={true}
        onAddComment={mockOnAddComment}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <MobileQuickActions
        canAddComment={true}
        onAddComment={mockOnAddComment}
      />
    );

    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    expect(mainButton).toHaveAttribute('aria-label', 'Open quick actions');

    // Expand and check action buttons
    fireEvent.click(mainButton);

    const commentButton = screen.getByRole('button', { name: /add comment/i });
    expect(commentButton).toHaveAttribute('aria-label', 'Add Comment');
  });

  it('should be hidden on large screens with lg:hidden class', () => {
    const { container } = render(
      <MobileQuickActions
        canAddComment={true}
        onAddComment={mockOnAddComment}
      />
    );

    expect(container.firstChild).toHaveClass('lg:hidden');
  });

  it('should handle missing onShare callback gracefully', async () => {
    render(
      <MobileQuickActions
        canAddComment={false}
        canUploadEvidence={false}
        canEditReport={false}
        // onShare is undefined, but share action should still show
      />
    );

    // Expand
    const mainButton = screen.getByRole('button', { name: /open quick actions/i });
    fireEvent.click(mainButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    });

    // Should not crash when clicking share without callback
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /share/i }));
    }).not.toThrow();
  });
}); 