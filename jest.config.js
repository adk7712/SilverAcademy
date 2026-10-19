/** Jest projects: pure-TS logic in shared and functions (no emulator needed). Emulator suites: jest.emulator.config.js. */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};
module.exports = {
  projects: [
    { ...base, displayName: 'shared', rootDir: 'packages/shared' },
    {
      // Mobile: pure logic only (no react-native imports); transpile-only because Expo's tsconfig targets Metro.
      displayName: 'mobile',
      rootDir: 'apps/mobile',
      preset: 'ts-jest',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            diagnostics: false,
            tsconfig: {
              module: 'commonjs',
              target: 'ES2022',
              jsx: 'react-jsx',
              esModuleInterop: true,
            },
          },
        ],
      },
    },
    {
      ...base,
      displayName: 'functions',
      rootDir: 'functions',
      testPathIgnorePatterns: ['/node_modules/', '\\.emu\\.test\\.ts$'],
    },
  ],
};
