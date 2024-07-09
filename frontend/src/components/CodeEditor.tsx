import { FC, memo, useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Extension, RangeSet, StateEffect, StateField } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { Decoration, DecorationSet } from '@codemirror/view';
import { Highlight } from '../types';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  highlights: Highlight[];
  extensions?: Extension[];
}

const highlightTheme = EditorView.baseTheme({
  '.cm-highlight': {
    borderBottom: '1px solid white',
    paddingBottom: '1px',
    cursor: 'pointer',
  },
  '.cm-highlight.err': {
    borderBottom: '2px solid red',
  },
  '.cm-highlight.warn': {
    borderBottom: '2px solid yellow',
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: '"Fira Code", monospace',
  },
});

const setHighlightsEffect = StateEffect.define<Highlight[]>();

const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(highlights, tr) {
    highlights = highlights.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setHighlightsEffect)) {
        highlights = RangeSet.of(e.value.map(h =>
          Decoration.mark({class: `cm-highlight ${h.type.toLowerCase()}`}).range(h.start, h.end)
        ));
      }
    }
    return highlights;
  },
  provide: f => EditorView.decorations.from(f),
});

const CodeEditor: FC<CodeEditorProps> = ({ value, onChange, onBlur, highlights, extensions = [] }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [tooltip, setTooltip] = useState<{ message: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        highlightTheme,
        highlightField,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          mousemove(event: MouseEvent, view: EditorView) {
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos) {
              const highlight = highlights.find((h) => pos >= h.start && pos < h.end);
              if (highlight) {
                const rect = (event.target as Element).getBoundingClientRect();
                setTooltip({
                  message: highlight.message,
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                });
              } else {
                setTooltip(null);
              }
            }
          },
          mouseout() {
            setTooltip(null);
          },
        }),
        ...extensions,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: setHighlightsEffect.of(highlights)
      });
    }
  }, [highlights]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={editorRef} style={{ height: '100%' }} onBlur={onBlur} />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            color: '#000',
            left: `${tooltip.x}px`,
            top: `${tooltip.y + 20}px`,
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '3px',
            padding: '5px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {tooltip.message}
        </div>
      )}
    </div>
  );
};

export default memo(CodeEditor);
