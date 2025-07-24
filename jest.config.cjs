module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@/(.*)$': '<rootDir>/client/src/$1'
  },
  // Only test server files
  testMatch: [
    '<rootDir>/server/**/*.test.ts',
    '<rootDir>/shared/**/*.test.ts'
  ],
  // Coverage configuration - only server code
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'server/**/*.ts',
    'shared/**/*.ts',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!server/index.ts', // Entry points
    '!server/vite.ts', // Vite config
    '!server/microservices/**/index.ts', // Microservice entry points
    '!server/mongodb/**', // MongoDB integration (optional)
    '!server/migrate*.ts', // Migration scripts
    '!server/profile-migration.ts',
    '!server/direct-sql-migration.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/client/',
    '/dist/'
  ],
  modulePathIgnorePatterns: [
    '/client/'
  ]
};