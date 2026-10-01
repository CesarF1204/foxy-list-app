import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        include: ["tests/**/*.test.{js,jsx}"],
        /** Adds the DOM matchers (toHaveTextContent and friends) to expect(). */
        setupFiles: ["./tests/setup.js"],
    },
});