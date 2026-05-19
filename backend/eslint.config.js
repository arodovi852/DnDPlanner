// Configuración mínima de ESLint 9 (flat config) para el backend.
//
// El backend usa CommonJS (require / module.exports) y corre en Node.js 18+.
// Solo se aplica al código de `src/` y `tests/`; ignoramos node_modules y
// coverage. Reglas suaves: queremos un linter que valide sintaxis sin
// reescribir el código existente.

const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'writable',
        require: 'readonly',
        exports: 'writable',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Jest (suficiente para los tests sin añadir el plugin eslint-plugin-jest)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // Avisar pero no fallar el build por variables sin usar; los args con
      // `_` al principio se consideran intencionados.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Permitir console.log en backend (lo usamos como logger sencillo).
      'no-console': 'off',
      // Escapes redundantes en character classes son inocuos (legibilidad).
      'no-useless-escape': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'coverage/'],
  },
];
