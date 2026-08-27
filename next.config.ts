import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // User uploads (avatars, portfolio, deliverables) live in Supabase Storage
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Google account avatars from OAuth sign-in
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  /**
   * The public directory moved from /freelancers to /people once it started
   * listing clients as well as freelancers.
   *
   * Permanent (308) rather than temporary, because these URLs were already
   * published in the sitemap: a 308 passes ranking signal to the new path
   * and tells Google to replace the old one in its index. A 307 would leave
   * both URLs competing indefinitely.
   *
   * The city rule must come first — Next matches in order, and the bare
   * /freelancers rule would otherwise swallow /freelancers/mumbai.
   */
  async redirects() {
    return [
      {
        source: "/freelancers/:city",
        destination: "/people/:city",
        permanent: true,
      },
      {
        source: "/freelancers",
        destination: "/people",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
