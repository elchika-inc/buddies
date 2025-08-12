/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pawmatch/shared'],
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
}

export default nextConfig