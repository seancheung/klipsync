import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.3.60"],
  // 原生依赖不能被 webpack bundle，交给 Node 运行时 require
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
};

export default withSerwist(nextConfig);
