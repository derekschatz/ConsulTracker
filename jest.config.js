/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react',
        '@babel/preset-typescript'
      ]
    }]
  },
  testMatch: [
    '<rootDir>/client/src/__tests__/**/*.{test,spec}.{ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'client/src/**/*.{ts,tsx}',
    '!client/src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  verbose: true,
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};

export default config; 