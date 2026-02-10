import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuthGatePage from '@/pages/AuthGatePage';
import LoginPage from '@/pages/LoginPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockEnterGuest = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    guestMode: true,
    signIn: mockSignIn,
    signUp: mockSignUp,
    enterGuestMode: mockEnterGuest,
  }),
}));

function renderWithRouter(ui: React.ReactNode, initial = ['/auth']) {
  render(
    <MemoryRouter
      initialEntries={initial}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/auth" element={<AuthGatePage />} />
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
        <Route path="/feed" element={<div data-testid="feed-page">feed</div>} />
      </Routes>
    </MemoryRouter>
  );
  return ui;
}

describe('AuthGatePage', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockEnterGuest.mockReset();
  });

  it('routes guest users to login, not feed', async () => {
    renderWithRouter(<AuthGatePage />);
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
    expect(screen.queryByTestId('feed-page')).toBeNull();
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockEnterGuest.mockReset();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it('allows sign-in from guest mode and navigates to auth gate', async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login' }]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth" element={<div data-testid="auth-gate" />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123'));
    await waitFor(() => expect(screen.getByTestId('auth-gate')).toBeInTheDocument());
  });
});
