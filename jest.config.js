module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/jest.styleMock.js',
  },
};
