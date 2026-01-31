'use client';

import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  month: string;
  year: string;
  content: string[];
  image?: string;
  audio?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blog');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setShowForm(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      setDeleteConfirm(null);
      await fetchPosts();
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/blog/${post._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      if (!res.ok) throw new Error('Failed to update post');
      await fetchPosts();
    } catch (err) {
      console.error('Failed to update post status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <BlogForm
        post={editingPost}
        onClose={() => {
          setShowForm(false);
          setEditingPost(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setEditingPost(null);
          fetchPosts();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Blog Manager ({posts.length})
        </h2>
        <div className="flex gap-3">
          <a
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm sm:text-base flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m256-240-56-56 384-384H240v-80h480v480h-80v-344L256-240Z" /></svg>
            View Blog
          </a>
          <button
            onClick={handleNewPost}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
            New Post
          </button>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="currentColor" className="mx-auto text-gray-600 mb-4">
            <path d="M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
          </svg>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No blog posts yet</h3>
          <p className="text-gray-500 mb-4">Create your first post to get started</p>
          <button
            onClick={handleNewPost}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <div
              key={post._id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col md:flex-row">
                {/* Image Preview */}
                {post.image && (
                  <div className="md:w-48 h-32 md:h-auto flex-shrink-0">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          post.published
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-gray-500 text-sm">{post.date}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white truncate">{post.title}</h3>
                      {post.subtitle && (
                        <p className="text-gray-400 text-sm mt-1">{post.subtitle}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className={`p-2 rounded-lg transition-colors ${
                          post.published
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                        title={post.published ? 'Unpublish' : 'Publish'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                          <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditPost(post)}
                        className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                          <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                        </svg>
                      </button>
                      {deleteConfirm === post._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(post._id)}
                            className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                              <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-2 bg-gray-600 text-white hover:bg-gray-500 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(post._id)}
                          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Blog Form Component (like ProductForm)
function BlogForm({ post, onClose, onSuccess }: {
  post: BlogPost | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Handle both array and string content formats
  const getInitialParagraphs = (): string[] => {
    if (!post?.content) return [''];
    if (Array.isArray(post.content)) return post.content.length > 0 ? post.content : [''];
    if (typeof post.content === 'string') return [post.content];
    return [''];
  };

  const [formData, setFormData] = useState({
    title: post?.title || '',
    subtitle: post?.subtitle || '',
    date: post?.date || '',
  });
  const [paragraphs, setParagraphs] = useState<string[]>(getInitialParagraphs());
  const [image, setImage] = useState<string>(post?.image || '');
  const [audio, setAudio] = useState<string>(post?.audio || '');
  const [published, setPublished] = useState(post?.published || false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Delete file from Bunny CDN
  const deleteFromBunny = async (fileUrl: string) => {
    if (!fileUrl) return;
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl }),
      });
      if (response.ok) {
        console.log('Deleted from Bunny:', fileUrl);
      } else {
        console.error('Failed to delete from Bunny:', fileUrl);
      }
    } catch (err) {
      console.error('Error deleting from Bunny:', err);
    }
  };

  // Remove image and delete from CDN
  const handleRemoveImage = async () => {
    if (image) {
      await deleteFromBunny(image);
      setImage('');
    }
  };

  // Remove audio and delete from CDN
  const handleRemoveAudio = async () => {
    if (audio) {
      await deleteFromBunny(audio);
      setAudio('');
    }
  };

  // Upload audio file
  const handleAudioUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingAudio(true);
    try {
      const oldAudio = audio;
      const file = files[0];

      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('productName', `blog-audio-${formData.title || 'post'}`);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataToUpload
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.url) {
        if (oldAudio) {
          await deleteFromBunny(oldAudio);
        }
        setAudio(data.url);
        console.log('Audio uploaded:', data.url);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (err) {
      console.error('Audio upload failed:', err);
      setError('Failed to upload audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Delete old image from Bunny if replacing
      const oldImage = image;

      const file = files[0];
      let fileToUpload = file;

      // Compress image before uploading
      if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
          };
          fileToUpload = await imageCompression(file, options);
          console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
        } catch (err) {
          console.error('Compression failed, using original:', err);
        }
      }

      const formDataToUpload = new FormData();
      formDataToUpload.append('file', fileToUpload);
      formDataToUpload.append('productName', `blog-${formData.title || 'post'}`);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataToUpload
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.url) {
        // Delete old image after successful upload
        if (oldImage) {
          await deleteFromBunny(oldImage);
        }
        setImage(data.url);
        console.log('Image uploaded:', data.url);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (!uploading) handleFileUpload(e.dataTransfer.files);
  };

  const addParagraph = () => {
    setParagraphs([...paragraphs, '']);
  };

  const removeParagraph = (index: number) => {
    if (paragraphs.length > 1) {
      setParagraphs(paragraphs.filter((_, i) => i !== index));
    }
  };

  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = value;
    setParagraphs(newParagraphs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    // Filter out empty paragraphs
    const filteredContent = paragraphs.filter(p => p.trim() !== '');
    if (filteredContent.length === 0) {
      setError('At least one paragraph of content is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = post ? `/api/blog/${post._id}` : '/api/blog';
      const method = post ? 'PUT' : 'POST';

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        date: formData.date,
        content: filteredContent,
        image: image,
        audio: audio,
        published: published,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save post');
      onSuccess();
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          {post ? 'Edit Blog Post' : 'New Blog Post'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Featured Image Upload */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Featured Image</h3>

          <div className="mb-4">
            <label
              className={`block w-full px-6 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                isDraggingOver
                  ? 'border-red-500 bg-red-900/20'
                  : 'border-zinc-700 hover:border-red-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <div className="text-gray-400 pointer-events-none">
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p>{isDraggingOver ? 'Drop image here' : 'Click to upload or drag and drop'}</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {image && (
            <div className="relative">
              <img
                src={image}
                alt="Featured"
                className="w-full max-h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Audio Upload */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">
            Audio Message (Optional)
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Upload an audio file for visitors to listen to on this blog post
          </p>

          <div className="mb-4">
            <label className="block w-full px-6 py-4 border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-lg text-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleAudioUpload(e.target.files)}
                className="hidden"
                disabled={uploadingAudio}
              />
              <div className="text-gray-400">
                {uploadingAudio ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                    <span>Uploading audio...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p>Click to upload audio (MP3, WAV, etc.)</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {audio && (
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">Audio uploaded</p>
                    <audio controls className="w-full h-8 mt-1">
                      <source src={audio} />
                    </audio>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAudio}
                  className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Post Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="Enter post title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="e.g., January 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Date
              </label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="e.g., January 2024"
              />
            </div>
          </div>
        </div>

        {/* Content Paragraphs */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Content</h3>
            <button
              type="button"
              onClick={addParagraph}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
            >
              + Add Paragraph
            </button>
          </div>

          <div className="space-y-4">
            {paragraphs.map((paragraph, index) => (
              <div key={index} className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Paragraph {index + 1}
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={paragraph}
                    onChange={(e) => updateParagraph(index, e.target.value)}
                    rows={4}
                    className="flex-1 px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                    placeholder="Write your paragraph here..."
                  />
                  {paragraphs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(index)}
                      className="self-start p-2 text-red-400 hover:text-red-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publish Toggle & Submit */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  published ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-200 shadow-sm ${
                    published ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-gray-300 font-medium">
                {published ? 'Published' : 'Draft'}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                      <path d="M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160ZM480-240q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM240-560h360v-160H240v160Z"/>
                    </svg>
                    {post ? 'Update Post' : 'Create Post'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
