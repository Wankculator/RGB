module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'server/**/*.js',
    'client/scripts/**/*.js',
    '!server/app.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@client/(.*)$': '<rootDir>/client/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@utils/(.*)$': '<rootDir>/server/utils/$1',
    '^@services/(.*)$': '<rootDir>/server/services/$1',
    '^@middleware/(.*)$': '<rootDir>/server/middleware/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Global test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};