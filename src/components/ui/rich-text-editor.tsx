"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading3, List } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  /** Id of the visible label; defaults to `${id}-label` (what admin Field renders) */
  labelId?: string;
};

const TOOL =
  "rounded p-1.5 hover:bg-muted aria-pressed:bg-muted aria-pressed:text-primary-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:p-2.5";

export function RichTextEditor({ value, onChange, id, labelId }: Props) {
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
        role: "textbox",
        "aria-multiline": "true",
        ...((labelId ?? id) ? { "aria-labelledby": labelId ?? `${id}-label` } : {}),
        // Focus ring is drawn on the wrapper (focus-within) so toolbar + body read as one control
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[140px] px-3 py-2 outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-md border border-input transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 motion-reduce:transition-none">
      <div
        role="toolbar"
        aria-label="Formatowanie"
        className="flex items-center gap-1 rounded-t-md border-b border-input bg-muted/40 px-2 py-1.5"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
          className={TOOL}
          aria-label="Pogrubienie"
          title="Pogrubienie"
        >
          <Bold className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-pressed={editor.isActive("heading", { level: 3 })}
          className={TOOL}
          aria-label="Nagłówek"
          title="Nagłówek"
        >
          <Heading3 className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-pressed={editor.isActive("bulletList")}
          className={TOOL}
          aria-label="Lista punktowana"
          title="Lista punktowana"
        >
          <List className="size-4" aria-hidden />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
