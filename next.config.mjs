/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // App Router is the default (app/). No pages/ dir required.
  //
  // WebGL / client-only 3D (react-force-graph-3d + three):
  // - Transpile the force-graph stack so ESM/CJS interop works under webpack.
  // - Consumers must still dynamic-import with { ssr: false } (see app/universe/page.tsx).
  // - Do not add R3F / @react-three/fiber / three-stdlib as engine.
  // - Do not list packages here in serverExternalPackages (Next.js forbids the overlap).
  transpilePackages: [
    "three",
    "react-force-graph-3d",
    "3d-force-graph",
    "three-forcegraph",
    "three-render-objects",
  ],

  webpack: (config, { isServer }) => {
    // Client: never polyfill Node modules that break the WebGL canvas path.
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
      };
    }

    // Server: externalize optional `canvas` so SSR does not pull a native binding.
    if (isServer) {
      const prior = config.externals;
      config.externals = [
        ...(Array.isArray(prior) ? prior : prior ? [prior] : []),
        ({ request }, callback) => {
          if (request === "canvas") {
            return callback(null, "commonjs canvas");
          }
          callback();
        },
      ];
    }

    return config;
  },
};

export default nextConfig;
