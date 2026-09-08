import { defineConfig } from "orval";

export default defineConfig({
  studio: {
    input: {
      target: "./openapi.json",
    },
    output: {
      target: "./src/generated/openapi.ts",
      client: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/shared/api/orvalFetch.ts",
          name: "orvalFetch",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});