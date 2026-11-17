import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads live business data from the local database, so pages render per request.
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
