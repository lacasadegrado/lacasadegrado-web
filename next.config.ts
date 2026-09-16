import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Payment proof screenshots are posted through a Server Action.
      // PROOF_UPLOAD.maxBytes is 8 MB; leave headroom for multipart overhead.
      bodySizeLimit: "10mb",
    },
    // proxy.ts clones every request body it forwards, and Next 16 caps that
    // clone at 10 MB by default: bigger bodies are truncated and the photo
    // upload route fails to parse them. PHOTO_UPLOAD.maxBytes is 60 MB.
    proxyClientMaxBodySize: "64mb",
  },
};

export default nextConfig;
