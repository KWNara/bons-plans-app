import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  treeshake: { removeDebugLogging: true },
  widenClientFileUpload: false,
  sourcemaps: { disable: true },
});
