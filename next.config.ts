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
      /**
       * Contracts folded into the client project list — a contract is a
       * stage a project reaches, not a separate thing to manage.
       *
       * Temporary (307) rather than permanent, unlike the rules above.
       * These are signed-in app routes with nothing indexed to preserve,
       * and a 308 would be cached in browsers indefinitely, which is a
       * hard thing to take back if the page ever returns.
       */
      {
        source: "/client/contracts",
        destination: "/client/projects",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
