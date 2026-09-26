/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const backendUrl =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Public URLs have no trailing slash. Do not set this to true.
  trailingSlash: false,
  outputFileTracingIncludes: {
    "/privacy": ["./content/legal/**/*"],
    "/terms": ["./content/legal/**/*"],
    "/data-use": ["./content/legal/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
      {
        source: "/deck/aranyix_pitch",
        destination: "/deck/aranyix_pitch/index.html",
      },
      {
        source: "/deck/araynix_pitch",
        destination: "/deck/aranyix_pitch/index.html",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
