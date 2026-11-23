import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

export function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  // useEditorState re-renders the toolbar when the selection changes, so the
  // active buttons stay highlighted.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      h1: e?.isActive('heading', { level: 1 }) ?? false,
      h2: e?.isActive('heading', { level: 2 }) ?? false,
      bullet: e?.isActive('bulletList') ?? false,
      ordered: e?.isActive('orderedList') ?? false,
    }),
  })

  const btn = (label: string, active: boolean, run: () => void, title: string) => (
    <button
      type="button"
      title={title}
      className={active ? 'tool active' : 'tool'}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  )

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {btn('B', s.bold, () => editor.chain().focus().toggleBold().run(), 'Bold (Ctrl+B)')}
      {btn('I', s.italic, () => editor.chain().focus().toggleItalic().run(), 'Italic (Ctrl+I)')}
      {btn('U', s.underline, () => editor.chain().focus().toggleUnderline().run(), 'Underline (Ctrl+U)')}
      <span className="sep" />
      {btn('H1', s.h1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Heading 1')}
      {btn('H2', s.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2')}
      {btn('Text', !s.h1 && !s.h2, () => editor.chain().focus().setParagraph().run(), 'Normal text')}
      <span className="sep" />
      {btn('• List', s.bullet, () => editor.chain().focus().toggleBulletList().run(), 'Bulleted list')}
      {btn('1. List', s.ordered, () => editor.chain().focus().toggleOrderedList().run(), 'Numbered list')}
    </div>
  )
}
