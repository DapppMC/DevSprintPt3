import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Force test environment to use .env.test
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
