import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '@/pages/RegisterPage';

const { mockRegister, mockNavigate, mockToastError } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ register: mockRegister, loginWithGoogle: vi.fn() }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('react-hot-toast', () => ({ default: { error: mockToastError, success: vi.fn() } }));
vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => <div data-testid="google-login-stub" /> }));

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockRegister.mockReset();
  mockNavigate.mockReset();
  mockToastError.mockReset();
});

describe('RegisterPage: create account form', () => {
  it('positive: submits a valid registration and navigates to the dashboard', async () => {
    mockRegister.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'supersecret123');
    await user.type(screen.getByPlaceholderText('Answer is case-insensitive'), 'Fluffy');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        'Jane Doe',
        'jane@example.com',
        'supersecret123',
        expect.any(String),
        'Fluffy'
      )
    );
    // A brand-new account always goes to onboarding once, regardless of the
    // fields on the returned user.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding'));
  });

  it('negative: a password under 8 characters is rejected client-side before calling register()', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'short');
    await user.type(screen.getByPlaceholderText('Answer is case-insensitive'), 'Fluffy');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockToastError).toHaveBeenCalledWith('Password must be at least 8 characters');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('negative: a blank security answer never reaches register() — blocked by the required field and/or the app\'s own check', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'supersecret123');
    // security answer left blank
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // The <input required> attribute blocks native form submission before
    // the app's own "blank answer" toast check ever runs — either way, the
    // property that matters is that register() is never called.
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('negative: a duplicate-email rejection from the server shows an error and does not navigate', async () => {
    mockRegister.mockRejectedValue(new Error('conflict'));
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'supersecret123');
    await user.type(screen.getByPlaceholderText('Answer is case-insensitive'), 'Fluffy');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Registration failed'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
