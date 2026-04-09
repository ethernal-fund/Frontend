import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const alias = {
  '@': resolve(__dirname, './src'),
};

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name:        'unit',
          include:     ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          environment: 'jsdom',
          globals:     true,
          setupFiles:  ['src/test/setup.ts'],
        },
      },

      {
        extends: true,
        plugins: [storybookTest()], 
        test: {
          name: 'storybook',
          browser: {
            enabled:   true,
            headless:  true,
            provider:  playwright(),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});