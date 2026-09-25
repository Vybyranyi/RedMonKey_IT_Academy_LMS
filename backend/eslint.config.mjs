import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // `const { passwordHash, tokenVersion, ...publicUser } = user` — так тут
      // навмисно відкидають секретні поля перед відповіддю
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Промис без await виконується поза try/catch контролера і поза транзакцією:
      // помилка запиту до БД не дійде до handleError, а в тесті
      // `expect(...).rejects` без await нічого не перевіряє
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // Express 5 сам ловить помилки async-хендлерів, тож async-функцію
      // як аргумент (router.get(path, async ...)) дозволяємо
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false } },
      ],
    },
  },
]);
