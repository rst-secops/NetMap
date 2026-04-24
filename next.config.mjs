/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ssh2", "bun:sqlite"],
};

export default nextConfig;
