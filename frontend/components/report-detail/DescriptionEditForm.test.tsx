import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DescriptionEditForm } from './DescriptionEditForm';

describe('DescriptionEditForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial description value', () => {
    render(
      <DescriptionEditForm
        initialDescription="Initial description"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Initial description');
    expect(textarea).toBeInTheDocument();
  });

  it('updates textarea value when user types', () => {
    render(
      <DescriptionEditForm
        initialDescription=""
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe what happened...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'New description' } });
    
    expect(textarea.value).toBe('New description');
  });

  it('calls onSave with description when save button is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <DescriptionEditForm
        initialDescription="Test description"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Test description');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <DescriptionEditForm
        initialDescription="Test description"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows saving state during save operation', async () => {
    let resolveSave: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    mockOnSave.mockReturnValue(savePromise);

    render(
      <DescriptionEditForm
        initialDescription="Test description"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    resolveSave!();
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
}); 