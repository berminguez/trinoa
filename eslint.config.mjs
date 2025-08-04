import { dirname } from 'path'
import { fileURLToPath } from 'url'

import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...compat.plugins('import'),
  {
    rules: {
      // TypeScript rules - más permisivos para desarrollo
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn', // Cambiar a warning en lugar de error
      '@typescript-eslint/no-unused-vars': [
        'warn', // Cambiar a warning
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
      '@typescript-eslint/no-var-requires': 'warn',

      // Import rules - deshabilitar temporalmente para desarrollo
      'import/order': 'off', // Deshabilitar completamente durante desarrollo

      // General code quality - más permisivo
      'no-console': 'off', // Permitir console.log globalmente durante desarrollo
      'no-debugger': 'error',
      'no-duplicate-imports': 'warn',
      'prefer-const': 'warn',

      // React rules specific to the project
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'warn', // Cambiar a warning

      // Next.js specific
      '@next/next/no-html-link-for-pages': 'warn',
      '@next/next/no-img-element': 'warn', // Cambiar a warning

      // Accessibility - cambiar a warnings
      'jsx-a11y/alt-text': 'warn',

      // Payload CMS specific patterns
      'no-restricted-imports': [
        'warn', // Cambiar a warning
        {
          patterns: [
            {
              group: ['../../../*'],
              message:
                'Relative imports should not go up more than 2 levels. Use absolute imports instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/collections/**/*', 'src/hooks/**/*'],
    rules: {
      // Payload collections can use any types for schema definition
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/workers/**/*', 'src/actions/**/*', 'src/app/**/*', 'src/lib/**/*'],
    rules: {
      // Permitir console.log en toda la aplicación durante desarrollo
      'no-console': 'off',
      // Permitir any en workers y librerías complejas
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['src/app/(payload)/**/*'],
    rules: {
      // Payload generated files don't follow our import order
      'import/order': 'off',
    },
  },
  {
    files: [
      'src/lib/**/*',
      'src/workers/**/*',
      'src/actions/**/*',
      'src/app/my-route/**/*',
      '**/*.test.*',
      '**/*.spec.*',
    ],
    rules: {
      // Structure base files and tests have placeholder parameters
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'build/', 'coverage/', 'payload-types.ts'],
  },
]

export default eslintConfig
