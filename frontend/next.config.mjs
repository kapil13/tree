/** @type {import('next').NextConfig} */

function apiRewriteTarget() {
  // Support both:
  // - NEXT_PUBLIC_API_URL=http://localhost:8000        (proxy mode)
  // - NEXT_PUBLIC_API_URL=http://localhost:8000/api    (direct mode; strip /api for rewrites)
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const origin = raw.replace(/\/api\/?$/, "");
  return `${origin}/api/:path*`;
}

const nextConfig = {
  reactStrictMode: true,
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
        destination: apiRewriteTarget(),
      },
    ];
  },
};

export default nextConfig;
