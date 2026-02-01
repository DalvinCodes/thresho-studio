/**
 * MonacoEditor Component
 * Full-featured code editor using Monaco Editor for prompt editing
 */

import { useRef, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Configure Monaco loader to use CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
  },
});

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  height?: string;
  className?: string;
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
}

export function MonacoEditor({
  value,
  onChange,
  language = 'plaintext',
  placeholder,
  height = '100%',
  className = '',
  readOnly = false,
  minimap = false,
  lineNumbers = 'on',
  wordWrap = 'on',
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // Add placeholder functionality
    if (placeholder) {
      let placeholderDecorations: string[] = [];

      const updatePlaceholder = () => {
        const model = editor.getModel();
        if (!model) return;

        const content = model.getValue();
        const decorations: editor.IModelDeltaDecoration[] = [];

        if (content === '') {
          decorations.push({
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: 'monaco-placeholder',
              hoverMessage: { value: placeholder },
            },
          });
        }

        placeholderDecorations = editor.deltaDecorations(placeholderDecorations, decorations);
      };

      updatePlaceholder();
      editor.onDidChangeModelContent(updatePlaceholder);
    }
  }, [placeholder]);

  const handleChange = useCallback((newValue: string | undefined) => {
    onChange(newValue || '');
  }, [onChange]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: minimap },
          lineNumbers,
          wordWrap,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineHeight: 1.6,
          padding: { top: 12, bottom: 12 },
          folding: true,
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          matchBrackets: 'always',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
          hover: { enabled: false },
          contextmenu: false,
          theme: 'vs-dark',
        }}
        theme="vs-dark"
        loading={
          <div className="h-full flex items-center justify-center text-text-secondary">
            Loading editor...
          </div>
        }
      />
      <style>{`
        .monaco-placeholder::before {
          content: attr(data-placeholder);
          color: var(--color-text-secondary, #6b7280);
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default MonacoEditor;
