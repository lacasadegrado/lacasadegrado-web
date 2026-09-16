import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Files never travel through actions or handlers: photos and payment
      // proofs go browser -> R2 with presigned PUTs (Vercel caps function
      // bodies at 4.5 MB). Actions only carry form fields and object keys.
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
