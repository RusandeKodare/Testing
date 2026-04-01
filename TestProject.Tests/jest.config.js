module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend', '<rootDir>/frontend'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '../backend/src/**/*.ts',
    '../frontend/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  moduleNameMapper: {
    '^../../../src/(.*)$': '<rootDir>/../backend/src/$1',
    '^../../src/(.*)$': '<rootDir>/../backend/src/$1'
  },
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  projects: [
    {
      displayName: 'backend',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/**/*.test.ts'],
      moduleNameMapper: {
        '^../../../src/(.*)$': '<rootDir>/../backend/src/$1'
      }
    },
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/**/*.test.ts'],
      moduleNameMapper: {
        '^../../../src/(.*)$': '<rootDir>/../frontend/src/$1'
      }
    }
  ]
};
