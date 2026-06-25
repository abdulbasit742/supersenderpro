module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  transform: {},
  collectCoverageFrom: ["src/**/*.js", "!src/prisma/**"],
  setupFilesAfterEnv: ["./tests/setup.js"],
  testTimeout: 15000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
};