import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationEditForm } from './LocationEditForm';

describe('LocationEditForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial location value', () => {
    render(
      <LocationEditForm
        initialLocation="Main conference room"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Main conference room');
    expect(input).toBeInTheDocument();
  });

  it('renders with empty initial location', () => {
    render(
      <LocationEditForm
        initialLocation=""
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText('Enter location where incident occurred') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it('updates input value when user types', () => {
    render(
      <LocationEditForm
        initialLocation=""
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText('Enter location where incident occurred') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Auditorium A' } });
    
    expect(input.value).toBe('Auditorium A');
  });

  it('calls onSave with new location when save button is clicked', async () => {
    render(
      <LocationEditForm
        initialLocation="Old location"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old location');
    const saveButton = screen.getByText('Save');

    fireEvent.change(input, { target: { value: 'New location' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('New location');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <LocationEditForm
        initialLocation="Test location"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables save button and shows loading state during save', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <LocationEditForm
        initialLocation="Test location"
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