import type { NextConfig } from "next";

const withNextIntl = require('next-intl/plugin')();

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withNextIntl(nextConfig);

