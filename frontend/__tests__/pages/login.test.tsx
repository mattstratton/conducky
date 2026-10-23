import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../../pages/login';
import { UserContext } from '../../pages/_app';
import '@testing-library/jest-dom';

// Mock the Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
    query: {},
    asPath: '/',
  }),
}));

describe('Login page', () => {
  it('renders email and password fields and login button', () => {
    render(
      <UserContext.Provider value={{ user: null, setUser: jest.fn(), sessionLoading: false }}>
        <LoginPage />
      </UserContext.Provider>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Be specific to the input to avoid matching the toggle button's aria-label
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('sets autocomplete hints and exposes the password toggle state', () => {
    render(
      <UserContext.Provider value={{ user: null, setUser: jest.fn(), sessionLoading: false }}>
        <LoginPage />
      </UserContext.Provider>
    );
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    const password = screen.getByLabelText(/^password$/i, { selector: 'input' });
    expect(password).toHaveAttribute('autocomplete', 'current-password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(password).toHaveAttribute('type', 'text');
  });
}); 