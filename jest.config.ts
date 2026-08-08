import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",

  testEnvironment: "node",

  roots: ["<rootDir>/src"],

  testMatch: ["**/*.test.ts"],

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
        useESM: false,
      },
    ],
  },

  moduleNameMapper: {
    "^.*generated/prisma/client$":
      "<rootDir>/src/test/prisma-client-stub.ts",
  },

  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/config/**",
    "!src/server.ts",
    "!src/modules/search/**",
    "!src/test/**",
    "!**/__tests__/**",
  ],

  coverageDirectory: "coverage",

  coverageReporters: ["text", "html", "lcov"],

  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};

export default config;