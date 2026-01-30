import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ backgroundColor: '#ffffff' }} className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <Link href="/" className="cursor-pointer">
          <Image
            src="https://kassycakes.b-cdn.net/404.png"
            alt="404 - Page Not Found"
            width={2000}
            height={2000}
            className="w-full h-auto"
            priority
          />
        </Link>
      </div>
    </div>
  );
}
