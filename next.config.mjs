/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // App Router is the default (app/). No pages/ dir required.
  //
  // WebGL / client-only 3D (react-force-graph-3d + three) — reserved hooks:
  // - Prefer dynamic(() => import(...), { ssr: false }) in UniverseCanvas consumers
  // - Uncomment when those packages are added if bundling needs help:
  // transpilePackages: ["three", "react-force-graph-3d"],
  //
  // Do not add R3F / @react-three/fiber.
};

export default nextConfig;
