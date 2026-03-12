import globals from 'globals'
// import { globalIgnores } from 'eslint/config'
import withNuxt from './.nuxt/eslint.config.mjs'
import stylistic from '@stylistic/eslint-plugin'

// For details, see
// https://eslint.nuxt.com/packages/module
// https://eslint.org/docs/latest/use/configure/ignore
// https://eslint.vuejs.org/
// https://eslint.style/rules/
export default withNuxt(
  // globalIgnores([
  //   'samples/*',
  //   './upload-scans.js',
  // ]),
  {
    // `env` doesn't exist for flag config :-(
    // env: {
    //   browser: true,
    //   node: true,
    // },
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        defineEventHandler: true,
        defineNitroPlugin: true,
      },
    },
    rules: {
      'semi': 'off',
      'no-prototype-builtins': 'off',
      'no-unused-vars': ['error', { args: 'none' }],
      'vue/require-default-prop': 'off',
      'vue/attribute-hyphenation': ['warn', 'always'],
      'vue/max-attributes-per-line': ['error', {
        singleline: {
          max: 3,
        },
        multiline: {
          max: 1,
        },
      }],
      'vue/no-template-shadow': ['error', {
        allow: ['collapsed'], // NuxtUI
      }],
      'vue/html-indent': ['error', 2, {
        baseIndent: 1,
      }],
      'vue/multi-word-component-names': ['error'],
      '@typescript-eslint/no-unused-vars': 'off',
      '@stylistic/brace-style': ['error', 'stroustrup'],
      '@stylistic/jsx-indent-props': ['warn', 2],
      '@stylistic/jsx-max-props-per-line': ['warn', { maximum: 3 }],
      '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
      '@stylistic/space-before-function-paren': ['error', 'always'],
    },
  },
  {
    files: [
      'app/components/**/*.vue', // subfolder is multi-world
      'app/layouts/**/*.vue',
      'app/pages/**/*.vue',
    ],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
