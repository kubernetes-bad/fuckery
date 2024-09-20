import { useState, useEffect, FC, useCallback, useRef } from 'react';
import CodeEditor from './CodeEditor';
import { Highlight } from '../types';
import { EditorView } from '@codemirror/view';
import { complete, fetchNextSample, getHighlights, getStats, grade, Grade, Sample } from '../lib/api.ts';

const HIGHLIGHTS_BLACKLIST = ['id', 'name', 'grade']; // todo: replace with config fields!
const FIELDS = [
  'id',
  'name',
  'personality',
  'scenario',
  'tavern_personality',
  'first_message',
  'example_dialogs',
  'grade',
];

type ServerStats = {
  total: number
  done: number
}

function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<number | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

const EditorScreen: FC = () => {
  const [sample, setSample] = useState<Sample | null>(null);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [highlights, setHighlights] = useState<{ [key in keyof Sample]?: Highlight[] }>({});
  const [editingField, setEditingField] = useState<keyof Sample | null>(null);
  const [stats, setStats] = useState<ServerStats>({ total: 0, done: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedFieldRef = useRef<keyof Sample | null>(null);

  const fetchHighlights = useCallback(async (field: keyof Sample, text: string) => {
    if (HIGHLIGHTS_BLACKLIST.includes(`${field}`)) return;
    if (abortControllerRef.current && lastFetchedFieldRef.current === field) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    lastFetchedFieldRef.current = field;

    try {
      const data = await getHighlights(text, abortControllerRef.current.signal);
      setHighlights((prevHighlights) => ({
        ...prevHighlights,
        [field]: data.highlights,
      }));
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching highlights:', error);
      }
    } finally {
      if (lastFetchedFieldRef.current === field) {
        abortControllerRef.current = null;
        lastFetchedFieldRef.current = null;
      }
    }
  }, []);

  const fetchNextRecord = useCallback(async () => {
    try {
      const data = await fetchNextSample();
      (async () => Promise.all( // dynamically load highlights
          Object.keys(data.character)
            .filter(key => !HIGHLIGHTS_BLACKLIST.includes(key))
            .filter(key => !!data.character[key as keyof Sample])
            .map(async (key) => {
              const dataKey = key as keyof Sample;
              const text = data.character[dataKey];
              return fetchHighlights(dataKey, text);
            })
        )
      )();
      setSample(data.character);
      setEditingSample(data.character);
      setEditingField(null);
    } catch (error) {
      console.error('Error fetching next record:', error);
    }
    fetchStats();
  }, [fetchHighlights]);

  useEffect(() => {
    fetchNextRecord();
  }, [fetchNextRecord]);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      if (!data.total) return;
      setStats({ total: data.total, done: data.done || 0 });
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const debouncedFetchHighlights = useDebounce(fetchHighlights, 500);

  const handleEdit = (field: keyof Sample) => {
    setEditingField(field);
  };

  const handleChange = useCallback((field: keyof Sample, value: string) => {
    if (editingSample) {
      setEditingSample({ ...editingSample, [field]: value });
      debouncedFetchHighlights(field, value);
    }
  }, [debouncedFetchHighlights, editingSample]);

  const handleBlur = async (field: keyof Sample) => {
    if (!sample || !editingSample) return;

    if (sample[field] !== editingSample[field]) {
      try {
        setSample(editingSample);
      } catch (error) {
        console.error('Error saving sample:', error);
      }
    }
    setEditingField(null);
  };

  const handleSkip = async () => {
    await fetchNextRecord();
  };

  const handleComplete = async () => {
    if (!editingSample) return;

    try {
      await complete(editingSample);
      console.log('Edits submitted successfully');
      await fetchNextRecord();
    } catch (error) {
      console.error('Error submitting edits:', error);
    }
  };

  const handleBad = async () => {
    if (!editingSample) return;
    try {
      await grade(editingSample, Grade.BAD);

      await fetchNextRecord();
    } catch (err) {
      console.error('Error marking as bad:', err);
    }
  };

  const handleAddField = (fieldToAdd: string) => {
    if (!editingSample) return;
    setEditingSample((prev) => ({ ...prev, [fieldToAdd]: '\n' }));
    setSample((prev) => ({ ...prev, [fieldToAdd]: '\n' }));
    setEditingField(fieldToAdd as keyof Sample);
  };

  const createEditorExtensions = useCallback((field: keyof Sample) => [
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const newValue = update.state.doc.toString();
      handleChange(field, newValue);
    }),
  ], [handleChange]);

  if (!sample || !editingSample) return <div>Loading...</div>;

  const emptyFields = FIELDS.filter(field => !sample[field]).filter(field => !HIGHLIGHTS_BLACKLIST.includes(field));

  return (
    <div className="editor-screen">
      {(Object.keys(sample) as Array<keyof Sample>)
        .filter((field) => !!sample[field])
        .filter((field) => !HIGHLIGHTS_BLACKLIST.includes(`${field}`))
        .map((field) => (
          <div key={field} className="field-container">
            <h2>{field}</h2>
            {editingField === field ? (
              <CodeEditor
                value={`${editingSample[field]}`}
                onChange={(value) => handleChange(field, value)}
                onBlur={() => handleBlur(field)}
                highlights={highlights[field] || []}
                extensions={createEditorExtensions(field)}
              />
            ) : (
              <pre className="editable-field" onClick={() => handleEdit(field)}>
                {sample[field]}
              </pre>
            )}
          </div>
        ))}
      <div className="aux-container">
        {!!emptyFields.length && (
          <>
            <label htmlFor="add_field">Add field:</label>
            <select id="add_field"
              onChange={(e) => handleAddField(e.target.value)}
              value="">
              <option value="" disabled>Select a field</option>
              {emptyFields.map((emptyField) => (
                <option key={emptyField} value={emptyField}>
                  {emptyField}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
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
