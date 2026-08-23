import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // pdf-parse (via pdfjs-dist) loads a worker script from its own package
  // directory at runtime — bundling it breaks that lookup, so it needs to
  // stay a plain Node `require`/`import` instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
