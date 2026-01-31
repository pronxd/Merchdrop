'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      CharacterCount,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-red-500 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[200px] sm:min-h-[400px] px-4 sm:px-8 py-4 sm:py-6',
        style: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6;'
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 overflow-hidden">
      {/* Toolbar - Mobile optimized with larger touch targets */}
      <div className="border-b border-gray-300 dark:border-zinc-700 p-1.5 sm:p-2 bg-gray-50 dark:bg-zinc-900">
        {/* Row 1: Text Formatting + Headings */}
        <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1.5 sm:mb-0 sm:inline-flex">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('bold')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('italic')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('underline')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('strike')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 self-center" />

          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Heading 2"
          >
            H2
          </button>
        </div>

        {/* Row 2: Lists, Alignment, Extras */}
        <div className="flex flex-wrap gap-0.5 sm:gap-1 sm:inline-flex">
          {/* H3 - hidden on mobile for space */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`hidden sm:flex w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors items-center justify-center ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Heading 3"
          >
            H3
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 self-center" />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('bulletList')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('orderedList')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Numbered List"
          >
            1.
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 self-center" />

          {/* Text Alignment */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive({ textAlign: 'left' })
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Align Left"
          >
            ⫷
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive({ textAlign: 'center' })
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Align Center"
          >
            ☰
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 self-center" />

          {/* Link & Image */}
          <button
            onClick={addLink}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('link')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Add Link"
          >
            🔗
          </button>
          <button
            onClick={addImage}
            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
            title="Add Image"
          >
            🖼
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 self-center" />

          {/* Block Quote */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center ${
              editor.isActive('blockquote')
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Block Quote"
          >
            "
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 self-center" />

          {/* Clear Formatting */}
          <button
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
            title="Clear Formatting"
          >
            ✕
          </button>

          {/* Right align - hidden on mobile */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`hidden sm:flex w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded text-sm font-medium transition-colors items-center justify-center ${
              editor.isActive({ textAlign: 'right' })
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            title="Align Right"
          >
            ⫸
          </button>
        </div>
      </div>

      {/* Editor Content - Email Preview Style */}
      <div className="bg-white dark:bg-zinc-900 relative">
        {/* Email Preview Header */}
        <div className="px-4 sm:px-8 py-2 sm:py-4 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Preview:</span>
            <span className="hidden sm:inline">This is how your email will look to customers</span>
            <span className="sm:hidden">Email preview</span>
          </div>
        </div>

        {/* Email Content Area */}
        <div className="text-gray-900 dark:text-white bg-white dark:bg-zinc-900 max-w-[680px] mx-auto" style={{
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)'
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Character Count & Copy HTML */}
      <div className="border-t border-gray-300 dark:border-zinc-700 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-zinc-900 flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {editor.storage.characterCount?.characters() || 0} characters
        </span>
        <button
          onClick={() => {
            const html = editor.getHTML();
            navigator.clipboard.writeText(html);
            alert('HTML copied to clipboard!');
          }}
          className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1"
        >
          Copy HTML
        </button>
      </div>
    </div>
  );
}
