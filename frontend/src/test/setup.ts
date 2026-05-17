import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cada test se ejecuta en su propio DOM efímero: cleanup() lo desmonta
// para evitar fugas de estado entre tests.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// jsdom no implementa matchMedia, pero algunos componentes (responsive,
// i18n, etc.) podrían consultarlo. Lo stubbeamos a "no coincide nunca".
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
