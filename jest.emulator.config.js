/** Tests that need the Firebase emulators (rules tests, functions integration). Run with `npm run test:emulator`. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/firebase/rules-tests', '<rootDir>/functions/src'],
  testMatch: ['**/*.rules.test.ts', '**/*.emu.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/firebase/rules-tests/tsconfig.json' }],
  },
};
