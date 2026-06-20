/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Automatically switch the destination based on where the app is running
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://skillrank-ai.onrender.com' // <-- PASTE YOUR RENDER URL HERE
      : 'http://127.0.0.1:8000/:path';

    return [
      {
        source: '/api/:path((?!auth).*)', 
        destination: backendUrl, 
      },
    ]
  }
}

module.exports = nextConfig // or export default nextConfig