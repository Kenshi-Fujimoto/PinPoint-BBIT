import { defineConfig } from 'vitest/config';

// Dedicated Vitest config — kept separate from vite.config.js so the test run
// skips the React and PWA plugins and boots fast in a plain node environment.
// See docs/_qa-checklist.md (§1.2, §9) for what is covered and what is still manual.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    reporters: 'default',
  },
});
