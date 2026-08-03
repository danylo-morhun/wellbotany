"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading3, List } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  id?: string;
};

export function RichTextEditor({ value, onChange, id }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        // Keep the schema aligned with what's actually rendered on the
        // storefront (p/ul/li/strong/h3) — no extra formatting to confuse.
        italic: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        id: id ?? "",
        class:
          "prose prose-sm max-w-none min-h-[140px] rounded-b-md border border-t-0 px-3 py-2 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div>
      <div className="flex items-center gap-1 rounded-t-md border border-b-0 bg-muted/40 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
          className={`rounded p-1.5 hover:bg-muted ${editor.isActive("bold") ? "bg-muted" : ""}`}
          title="Pogrubienie"
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-pressed={editor.isActive("heading", { level: 3 })}
          className={`rounded p-1.5 hover:bg-muted ${editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}`}
          title="Nagłówek"
        >
          <Heading3 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-pressed={editor.isActive("bulletList")}
          className={`rounded p-1.5 hover:bg-muted ${editor.isActive("bulletList") ? "bg-muted" : ""}`}
          title="Lista punktowana"
        >
          <List className="size-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
