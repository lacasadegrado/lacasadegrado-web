import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Payment proof screenshots are posted through a Server Action.
      // PROOF_UPLOAD.maxBytes is 8 MB; leave headroom for multipart overhead.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
