import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  },
  plugins: [
    // SWC transform so NestJS decorator metadata (design:paramtypes) is emitted —
    // required for the real DI container used by the server-side authz e2e tests.
    // esbuild (vitest's default) strips this metadata, breaking constructor injection.
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
