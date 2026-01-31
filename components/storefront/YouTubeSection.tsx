"use client";

import { Play, Eye, ThumbsUp, MessageCircle } from "lucide-react";
import type { YouTubeVideo } from "@/types/storefront";

const videos: YouTubeVideo[] = [
  {
    id: "1",
    title: "Pokemon Card Scalpers...",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "04:24",
    views: "5.5M",
    likes: "353K",
    comments: "14K",
    date: "2025/12/22",
  },
  {
    id: "2",
    title: "Wicked Interview GONE WRONG",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "00:54",
    views: "4M",
    likes: "365K",
    comments: "7.2K",
    date: "2025/12/4",
  },
  {
    id: "3",
    title: "POV: You're A Target Employee",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "00:40",
    views: "5.9M",
    likes: "359K",
    comments: "8.4K",
    date: "2025/11/26",
  },
  {
    id: "4",
    title: "Something's Wrong With Shrek",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "00:13",
    views: "3.1M",
    likes: "120K",
    comments: "1.6K",
    date: "2025/11/13",
  },
];

export default function YouTubeSection() {
  return (
    <section className="bg-neutral-950 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Channel Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12">
          {/* Channel Avatar */}
          <a
            href="https://www.youtube.com/channel/UC91V6D3nkhP89wUb9f_h17g"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-red-600 flex items-center justify-center overflow-hidden">
              <span className="text-white font-bold text-2xl md:text-3xl">
                PD
              </span>
            </div>
          </a>

          {/* Channel Info */}
          <div className="text-center md:text-left">
            <a
              href="https://www.youtube.com/channel/UC91V6D3nkhP89wUb9f_h17g"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-2xl md:text-3xl font-bold hover:text-red-500 transition-colors"
            >
              POPDRP
            </a>
            <p className="text-white/60 mt-2">
              8.8M Subscribers &bull; 238 Videos &bull; 1.7B Views
            </p>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoCard({ video }: { video: YouTubeVideo }) {
  return (
    <a
      href={`https://youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Duration */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {video.duration}
        </div>
      </div>

      {/* Video Info */}
      <div className="mt-3">
        <h3 className="text-white font-medium line-clamp-2 group-hover:text-red-500 transition-colors">
          {video.title}
        </h3>
        <p className="text-white/50 text-sm mt-1">{video.date}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-2 text-white/50 text-xs">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {video.views} Views
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            {video.likes} Likes
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {video.comments}
          </span>
        </div>
      </div>
    </a>
  );
}
