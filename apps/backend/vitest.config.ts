import { defineConfig } from 'vitest/config';
import { sharedConfig } from '@repo/vitest-config';

export default defineConfig({
  ...sharedConfig,
  test: {
     env: {
        API_BASE_URL: `http://localhost:3000/api`,
      },
    ...sharedConfig.test,
    // Package-specific overrides if needed
  }
});
