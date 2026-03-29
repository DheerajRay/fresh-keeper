import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthScreen from './AuthScreen';

const authState = {
  status: 'ready',
  missingEnv: [] as string[],
  errorMessage: null as string | null,
  clearError: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
};

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    session: null,
    user: null,
    profile: null,
    isAuthenticated: false,
    signOut: vi.fn(),
    ...authState,
  }),
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    authState.status = 'ready';
    authState.missingEnv = [];
    authState.errorMessage = null;
    authState.clearError.mockReset();
    authState.signIn.mockReset().mockResolvedValue({});
    authState.signUp.mockReset().mockResolvedValue({});
  });

  it('renders missing-config guidance when supabase env is absent', () => {
    authState.status = 'missing_config';
    authState.missingEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];

    render(<AuthScreen />);

    expect(screen.getByText(/Finish auth configuration/i)).toBeInTheDocument();
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeInTheDocument();
    expect(screen.getByText('VITE_SUPABASE_PUBLISHABLE_KEY')).toBeInTheDocument();
  });

  it('submits email and password in sign-in mode', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    const form = screen.getByRole('form', { name: /Authentication form/i });

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'supersecret');
    await user.click(within(form).getByRole('button', { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(authState.signIn).toHaveBeenCalledWith('test@example.com', 'supersecret');
    });
  });

  it('requires display name when creating an account', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('button', { name: /Create account/i }));
    const form = screen.getByRole('form', { name: /Authentication form/i });
    await user.type(screen.getByLabelText(/Email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'supersecret');
    await user.click(within(form).getByRole('button', { name: /^Create account$/i }));

    expect(authState.signUp).not.toHaveBeenCalled();
    expect(screen.getByText(/Display name is required/i)).toBeInTheDocument();
  });

  it('submits display name, email, and password in sign-up mode', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('button', { name: /Create account/i }));
    const form = screen.getByRole('form', { name: /Authentication form/i });
    await user.type(screen.getByLabelText(/Display name/i), 'Dheeraj');
    await user.type(screen.getByLabelText(/Email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'supersecret');
    await user.click(within(form).getByRole('button', { name: /^Create account$/i }));

    await waitFor(() => {
      expect(authState.signUp).toHaveBeenCalledWith('new@example.com', 'supersecret', 'Dheeraj');
    });
  });
});
