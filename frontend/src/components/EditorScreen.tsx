import { useState, useEffect, FC, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import { Highlight } from '../types';
import { EditorView } from '@codemirror/view';
import { complete, fetchNextSample, getHighlights, getStats, grade, Grade, Sample } from '../lib/api.ts';

const BLACKLIST = ['id', 'grade'];

type ServerStats = {
  total: number
  done: number
}

const EditorScreen: FC = () => {
  const [character, setCharacter] = useState<Sample | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Sample | null>(null);
  const [highlights, setHighlights] = useState<{ [key in keyof Sample]?: Highlight[] }>({});
  const [editingField, setEditingField] = useState<keyof Sample | null>(null);
  const [stats, setStats] = useState<ServerStats>({ total: 0, done: 0 });

  useEffect(() => {
    fetchNextRecord();
  }, []);

  const fetchNextRecord = async () => {
    try {
      const data = await fetchNextSample();
      (async () => Promise.all( // dynamically load highlights
          Object.keys(data.character)
            .filter(key => !BLACKLIST.includes(key))
            .filter(key => !!data.character[key as keyof Sample])
            .map(async (key) => {
              const dataKey = key as keyof Sample;
              const text = data.character[dataKey];
              return fetchHighlights(dataKey, text);
            })
        )
      )();
      setCharacter(data.character);
      setEditingCharacter(data.character);
      setEditingField(null);
    } catch (error) {
      console.error('Error fetching next record:', error);
    }
    fetchStats();
  }

  const fetchStats = async () => {
    try {
      const data = await getStats();
      if (!data.total) return;
      setStats({ total: data.total, done: data.done || 0 });
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchHighlights = useCallback(async (field: keyof Sample, text: string) => {
    try {
      const data = await getHighlights(text);
      setHighlights((prevHighlights) => ({
        ...prevHighlights,
        [field]: data.highlights,
      }));
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  }, []);

  const handleEdit = (field: keyof Sample) => {
    setEditingField(field);
  };

  const handleChange = (field: keyof Sample, value: string) => {
    if (editingCharacter) {
      setEditingCharacter({ ...editingCharacter, [field]: value });
    }
  };

  const handleBlur = async (field: keyof Sample) => {
    if (!character || !editingCharacter) return;

    if (character[field] !== editingCharacter[field]) {
      try {
        setCharacter(editingCharacter);
      } catch (error) {
        console.error('Error saving character:', error);
      }
    }
    setEditingField(null);
  };

  const handleSkip = async () => {
    await fetchNextRecord();
  };

  const handleComplete = async () => {
    if (!editingCharacter) return;

    try {
      await complete(editingCharacter);
      console.log('Edits submitted successfully');
      await fetchNextRecord();
    } catch (error) {
      console.error('Error submitting edits:', error);
    }
  };

  const handleBad = async () => {
    if (!editingCharacter) return;
    try {
      await grade(editingCharacter, Grade.BAD);

      await fetchNextRecord();
    } catch (err) {
      console.error('Error marking as bad:', err);
    }
  };

  const createEditorExtensions = useCallback((field: keyof Sample) => [
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const newValue = update.state.doc.toString();
      handleChange(field, newValue);
      fetchHighlights(field, newValue);
    }),
  ], [fetchHighlights, handleChange]);

  if (!character || !editingCharacter) return <div>Loading...</div>;

  return (
    <div className="editor-screen">
      {(Object.keys(character) as Array<keyof Sample>)
        .filter((field) => !!character[field])
        .filter((field) => !BLACKLIST.includes(`${field}`))
        .map((field) => (
          <div key={field} className="field-container">
            <h2>{field}</h2>
            {editingField === field ? (
              <CodeEditor
                value={`${editingCharacter[field]}`}
                onChange={(value) => handleChange(field, value)}
                onBlur={() => handleBlur(field)}
                highlights={highlights[field] || []}
                extensions={createEditorExtensions(field)}
              />
            ) : (
              <pre className="editable-field" onClick={() => handleEdit(field)}>
                {character[field]}
              </pre>
            )}
          </div>
        ))}
      <div className="button-container">
        <button className="button-yellow" onClick={handleSkip}>
          Skip
        </button>
        <button className="button-red" onClick={handleBad}>
          Mark as Bad
        </button>
        <button className="button-green" onClick={handleComplete}>
          Complete
        </button>
      </div>

      {!!stats.total && (
        <div className="counter">
          <small>{stats.done} / {stats.total} ({Math.round((stats.done * 100 / stats.total) * 100) / 100}%)</small>
        </div>
      )}
    </div>
  );
};

export default EditorScreen;
