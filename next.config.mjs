/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // App Router is the default (app/). No pages/ dir required.
  //
  // WebGL / client-only 3D — consumers must dynamic-import with { ssr: false }.
  transpilePackages: ["three", "react-force-graph-3d"],
  // Do not add R3F / @react-three/fiber.
};

export default nextConfig;
