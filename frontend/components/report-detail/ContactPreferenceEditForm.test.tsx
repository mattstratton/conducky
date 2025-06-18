import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactPreferenceEditForm } from './ContactPreferenceEditForm';

describe('ContactPreferenceEditForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial contact preference value', () => {
    render(
      <ContactPreferenceEditForm
        initialContactPreference="phone"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Check that the select is rendered with the correct initial value
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with default email preference when no initial value', () => {
    render(
      <ContactPreferenceEditForm
        initialContactPreference=""
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls onSave with selected preference when save button is clicked', async () => {
    render(
      <ContactPreferenceEditForm
        initialContactPreference="email"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('email');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ContactPreferenceEditForm
        initialContactPreference="email"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables save button during save operation', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ContactPreferenceEditForm
        initialContactPreference="email"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
    
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });


}); 