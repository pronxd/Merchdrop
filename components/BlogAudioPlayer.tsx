'use client';

import dynamic from 'next/dynamic';

const AudioPlayer = dynamic(() => import('./AudioPlayer'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl p-6 baroque-shadow animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  ),
});

export default function BlogAudioPlayer() {
  return (
    <AudioPlayer
      src="https://kassy.b-cdn.net/audio/kassycakes_audio_blog.MP3"
      title="A Message from Kassy"
    />
  );
}
