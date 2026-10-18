import type { NextConfig } from "next";

/**
 * Saykind's interface is written with React Native components and runs in the browser through React Native Web.
 * No Expo and no native iOS/Android project is involved: this is a normal Next.js website.
 *
 *  - Every `import ... from "react-native"` is served by `react-native-web` (resolveAlias below).
 *  - `.web.tsx` / `.web.ts` files win over the plain ones, the usual React Native Web convention.
 *  - The `react-native` package itself is installed only so TypeScript knows the component types.
 *
 * The animated café stays plain DOM + CSS (components/cafe); both worlds live happily on one page.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // 90 keeps the illustration's thin menu lettering crisp.
    qualities: [75, 90],
  },
  transpilePackages: ["react-native-web"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
    resolveExtensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  /**
   * Headers for a public https site. The Permissions-Policy line matters: it keeps the microphone and camera
   * available to our own pages (and to nobody embedded in them). Getting it wrong would silently block the mic.
   * X-Robots-Tag keeps the prototype out of search results.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=(self), geolocation=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  // The same alias for `next build --webpack`, should anyone use it.
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias = { ...(config.resolve.alias ?? {}), "react-native$": "react-native-web" };
    config.resolve.extensions = [".web.tsx", ".web.ts", ".web.js", ...(config.resolve.extensions ?? [])];
    return config;
  },
};

export default nextConfig;
