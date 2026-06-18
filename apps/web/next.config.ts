import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const nextConfig: NextConfig = {
  /* config options here */
   turbopack: {
    root: path.resolve(dirname, '../..'),
  },
};

export default nextConfig;
