import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, DEMO_USER_ID } from '../context/AuthContext';

// Mock global del módulo `../api`. El AuthContext lo importa para hablar
// con el backend; en estos tests no queremos red de verdad. Cada test puede
// sobreescribir comportamientos concretos via vi.mocked(...).mockImplementation.
vi.mock('../api', () => {
  const authApi = {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  };
  return {
    authApi,
    ApiError: class ApiError extends Error {
      body?: { errors?: { msg?: string }[] };
      constructor(msg: string) {
        super(msg);
      }
    },
    hasTokens: vi.fn(() => false),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    closeSocket: vi.fn(),
    apiBaseUrl: 'http://test.invalid/api',
  };
});

// Pequeño componente sonda que expone el estado del contexto al DOM
// para poder leerlo en las assertions sin acoplarse a la UI real.
function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="user">{auth.user ? auth.user.username : 'null'}</span>
      <span data-testid="isDemo">{String(auth.isDemo)}</span>
      <span data-testid="isAuth">{String(auth.isAuthenticated)}</span>
      <span data-testid="error">{auth.error ?? ''}</span>
      <button
        type="button"
        onClick={() =>
          auth.login({ identifier: 'Testing', password: '1234QWer' })
        }
      >
        login-demo
      </button>
      <button
        type="button"
        onClick={() =>
          auth.login({ identifier: 'wrong', password: 'wrong' }).catch(() => {})
        }
      >
        login-bad
      </button>
      <button type="button" onClick={() => auth.logout()}>
        logout
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arranca como no autenticado cuando no hay tokens almacenados', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated')
    );
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('isAuth').textContent).toBe('false');
  });

  it('login con credenciales Testing entra en modo demo sin tocar la red', async () => {
    const api = await import('../api');
    renderProbe();
    await screen.findByText('unauthenticated');

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'login-demo' }));
    });

    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user').textContent).toBe('Testing');
    expect(screen.getByTestId('isDemo').textContent).toBe('true');
    expect(screen.getByTestId('isAuth').textContent).toBe('true');
    // Crucial: el login demo NO debe llamar a authApi.login (sin red).
    expect(api.authApi.login).not.toHaveBeenCalled();
  });

  it('login con credenciales no-demo delega en authApi.login', async () => {
    const api = await import('../api');
    vi.mocked(api.authApi.login).mockResolvedValueOnce({
      _id: 'u1',
      username: 'alberto',
      email: 'a@example.com',
      isPrivate: false,
    } as Awaited<ReturnType<typeof api.authApi.login>>);

    renderProbe();
    await screen.findByText('unauthenticated');

    // Adaptamos el botón "login-bad" para que en este test sí sea válido.
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'login-bad' }));
    });

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('authenticated')
    );
    expect(screen.getByTestId('user').textContent).toBe('alberto');
    expect(screen.getByTestId('isDemo').textContent).toBe('false');
    expect(api.authApi.login).toHaveBeenCalledOnce();
  });

  it('captura el error si authApi.login falla y deja el estado en unauthenticated', async () => {
    const api = await import('../api');
    vi.mocked(api.authApi.login).mockRejectedValueOnce(
      new (api.ApiError as unknown as new (msg: string) => Error)('Bad credentials')
    );

    renderProbe();
    await screen.findByText('unauthenticated');

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'login-bad' }));
    });

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Bad credentials')
    );
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('isAuth').textContent).toBe('false');
  });

  it('el id del usuario demo coincide con la constante exportada', async () => {
    // Refuerza el contrato público que CampaignContext usa para detectar el modo demo.
    expect(DEMO_USER_ID).toBe('demo-testing-user');
  });
});
