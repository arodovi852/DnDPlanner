import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuración de Vitest para el frontend.
// - `environment: 'jsdom'` permite renderizar componentes React fuera del
//   navegador (Testing Library necesita un DOM simulado).
// - `setupFiles` se ejecuta antes de cada suite y registra los matchers
//   de jest-dom (toBeInTheDocument, toHaveClass, ...).
// - `css: true` permite que los componentes importen SCSS sin romper.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/test/**',
      ],
    },
  },
});
