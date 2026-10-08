import { defineConfig } from 'tsup'
import { resolve } from 'node:path'

export default defineConfig({
  entry: [
    'src/index.ts'
  ],
  format: ['esm', 'cjs'],
  target: 'es2023',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      '@xeno-js/core': resolve(import.meta.dirname, 'src'),
    }
  },
  external: [
    '@libsql/client',
    '@libsql/client/web',
    '@sentry/node',
    '@supabase/ssr',
    '@supabase/supabase-js',
    '@xeno-js/shared',
    'axios',
    'cockatiel',
    'drizzle-orm',
    'ioredis',
    'p-limit',
    'pg',
    'pino',
    'postgres',
    'zod',
  ],
})