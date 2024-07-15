import { useState, useEffect, FC, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import { Highlight } from '../types';
import { EditorView } from '@codemirror/view';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030/api';

const BLACKLIST = ['id', 'grade'];

interface Character {
  name: string;
  description: string;
  scenario: string;
}

type ApiResponse = {
  character: Character;
}

const EditorScreen: FC = () => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [highlights, setHighlights] = useState<{ [key in keyof Character]?: Highlight[] }>({});
  const [editingField, setEditingField] = useState<keyof Character | null>(null);

  useEffect(() => {
    fetchNextRecord();
  }, []);

  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(new URL(url, API_URL), {
      ...options,
      credentials: 'include',
      redirect: 'manual',
    });
    if (response.type === 'opaqueredirect' || response.status === 401) {
      window.location.href = `${API_URL}/auth/login`;
      throw new Error('Unauthorized');
    }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response;
  }

  const fetchNextRecord = async () => {
    try {
      const response = await fetchWithAuth('/next');
      if (!response.ok) {
        console.error(response);
        throw new Error('Failed to fetch next record');
      }
      const data: ApiResponse = await response.json();
      (async () => Promise.all( // dynamically load highlights
        Object.keys(data.character)
          .filter(key => !BLACKLIST.includes(key))
          .filter(key => !!data.character[key as keyof Character])
          .map(async (key) => {
            const dataKey = key as keyof Character;
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
  };

  const fetchHighlights = useCallback(async (field: keyof Character, text: string) => {
    try {
      const response = await fetchWithAuth('/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error(response)
        throw new Error('Failed to fetch highlights');
      }

      const data = await response.json();
      setHighlights((prevHighlights) => ({
        ...prevHighlights,
        [field]: data.highlights,
      }));
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  }, []);

  const handleEdit = (field: keyof Character) => {
    setEditingField(field);
  };

  const handleChange = (field: keyof Character, value: string) => {
    if (editingCharacter) {
      setEditingCharacter({ ...editingCharacter, [field]: value });
    }
  };

  const handleBlur = async (field: keyof Character) => {
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
      const response = await fetchWithAuth('/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCharacter),
      });

      if (!response.ok) throw new Error('Failed to submit edits');

      console.log('Edits submitted successfully');
      await fetchNextRecord();
    } catch (error) {
      console.error('Error submitting edits:', error);
    }
  };

  const handleBad = async () => {
    try {
      const response = await fetchWithAuth('/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingCharacter, grade: 'bad' }),
      })
      if (!response.ok) throw new Error('Failed to mark as bad');

      await fetchNextRecord();
    } catch (err) {
      console.error('Error marking as bad:', err);
    }
  };

  const createEditorExtensions = useCallback((field: keyof Character) => [
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
      {(Object.keys(character) as Array<keyof Character>)
        .filter((field) => !!character[field])
        .filter((field) => !BLACKLIST.includes(field))
        .map((field) => (
          <div key={field} className="field-container">
            <h2>{field}</h2>
            {editingField === field ? (
              <CodeEditor
                value={editingCharacter[field]}
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
    </div>
  );
};

export default EditorScreen;
