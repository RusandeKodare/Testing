module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '../backend/src/**/*.ts',
    '../frontend/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
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
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      modulePaths: ['<rootDir>/../backend/src'],
      roots: ['<rootDir>/backend', '<rootDir>/../backend/src']
    },
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/**/*.test.ts'],
      modulePaths: ['<rootDir>/../frontend/src'],
      roots: ['<rootDir>/frontend', '<rootDir>/../frontend/src']
    }
  ]
};
