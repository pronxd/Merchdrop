import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full px-4 text-center">
        <h1 className="font-oswald text-8xl font-bold text-red-600 mb-4">404</h1>
        <p className="font-oswald text-2xl text-white uppercase tracking-wider mb-2">
          Page Not Found
        </p>
        <p className="font-inter text-neutral-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-oswald uppercase tracking-wider px-8 py-3 rounded-lg transition-colors"
        >
          Back to Shop
        </Link>
      </div>
    </div>
  );
}
