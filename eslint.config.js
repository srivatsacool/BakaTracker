import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'cloudflare-reference', 'platform', '_quarantine', 'extra']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Vendored Bloub source (MIT © 2026 Jérémy Perret) keeps its original
    // French comments, which use narrow no-break spaces. See NOTICE.
    files: ['src/lib/bloub/**'],
    rules: {
      'no-irregular-whitespace': 'off',
    },
  },
  {
    // Phase 2B: ApiClient catch bodies are typed `unknown` then narrowed
    // via `as { status, body, message }` — the `any` casts are unavoidable
    // given ApiClient throws a union of Error subclasses. Empty catch{} is
    // sessionStorage best-effort (crash-in-storage must not break the app).
    files: ['src/services/assistantChat.ts'],
    rules: {
      'no-empty': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Phase 2B: BakaSurRail — sync setQuota in useEffect is justified (quota
    // badge must reflect guest/offline state on mount, not async); response
    // envelope `as any` casts are for the BackendUnavailableError union shape.
    files: ['src/components/shell/BakaSurRail.tsx'],
    rules: {
      'no-empty': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Phase 2B: SettingsModal — `env.AI_*` reads via env Record<string,string>.
    files: ['src/components/shared/layout/SettingsModal.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Vitest triple-slash reference is idiomatic for vitest/config augmentation.
    files: ['vite.config.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    // Test files: empty catch blocks are intentional (sessionStorage/try-catch guards).
    files: ['src/__tests__/**'],
    rules: {
      'no-empty': 'off',
    },
  },
])
