module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    // Entry-point orchestration/UI wiring is validated via integration/manual flows, not unit coverage gates.
    '!src/main.ts',
    '!src/dashboard.ts'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 70,
      statements: 70
    }
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: false
};
