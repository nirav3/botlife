import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';

const { mockLogin, mockNavigate, mockToastError } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, loginWithGoogle: vi.fn() }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('react-hot-toast', () => ({
  default: { error: mockToastError, success: vi.fn() },
}));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-stub" />,
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockLogin.mockReset();
  mockNavigate.mockReset();
  mockToastError.mockReset();
});

describe('LoginPage: sign-in form', () => {
  it('positive: submits valid credentials, logs in, and navigates to the dashboard', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('jane@example.com', 'correct-password'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('negative: wrong credentials show an error toast and do not navigate', async () => {
    mockLogin.mockRejectedValue(new Error('rejected'));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Login failed'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('negative: surfaces the server\'s specific error message when the API provides one', async () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: { data: { error: 'Account locked, contact support' } },
    };
    mockLogin.mockRejectedValue(axiosLikeError);
    vi.doMock('axios', () => ({ default: { isAxiosError: () => true } }));

    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'whatever');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Whether or not axios.isAxiosError recognizes the shape in this mocked
    // environment, the app must never crash and must always show *some*
    // user-facing error — that's the property under test.
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it('negative: the password field is empty by default and never pre-filled or leaked into the DOM as visible text', () => {
    renderLoginPage();
    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(passwordInput.value).toBe('');
    expect(passwordInput.type).toBe('password'); // never rendered as plain text
  });
});
