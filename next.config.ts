import type { NextConfig } from "next";

const repo = "portfolio_web";
const isPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  ...(isPages ? { output: "export" as const } : {}),
  images: { unoptimized: isPages },
  trailingSlash: true,
  basePath: isPages ? `/${repo}` : "",
  assetPrefix: isPages ? `/${repo}/` : "",
  env: { NEXT_PUBLIC_BASE_PATH: isPages ? `/${repo}` : "" },
};

export default nextConfig;
