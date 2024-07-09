import { Router } from 'express';
import { db } from './db.js';
import { Character, EditableCharacter, Edit } from './types.js';
import { Highlights } from './types.js';
import { analyzeText } from './text-tools.js';

const INPUT_TABLE = 'characters';
const OUTPUT_TABLE = 'edits';

const router = Router();

router.get('/next', async (req, res) => {
  try {
    const character: Character = await db(INPUT_TABLE)
      .leftJoin(OUTPUT_TABLE, `${INPUT_TABLE}.id`, `${OUTPUT_TABLE}.id`)
      .select(`${INPUT_TABLE}.*`)
      .whereNull(`${OUTPUT_TABLE}.id`)
      // .whereIn('id', [291881])
      .orderByRaw('RAND()')
      .first();

    if (!character) {
      return res.status(404).json({ message: 'No characters found' });
    }

    const highlights = await generateHighlights(character);

    const editableCharacter: EditableCharacter = {
      character,
      highlights,
    };

    res.json(editableCharacter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/highlights', async (req, res) => {
  try {
    const text = req.body.text;
    if (!text) res.status(400).json({ message: 'No text provided' });

    const highlights = await analyzeText(text);
    res.json({ highlights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
})

router.post('/edit', async (req, res) => {
  try {
    const char: Character = req.body;
    const editor = req.header('x-editor');

    await db(OUTPUT_TABLE).insert({
      id: char.id,
      editor,
      name: char.name,
      personality: char.personality,
      scenario: char.scenario,
      tavern_personality: char.tavern_personality,
      first_message: char.first_message,
      example_dialogs: char.example_dialogs,
      grade: char.grade,
    })
      .onConflict('id')
      .merge(['name', 'personality', 'scenario', 'tavern_personality', 'first_message', 'example_dialogs', 'grade']);

    res.status(201).json({ message: 'Edit saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function generateHighlights(character: Character): Promise<Highlights> {
  const result: Highlights = {};

  await Promise.all(['personality', 'scenario', 'tavern_personality', 'first_message', 'example_dialogs']
    .map(async (field) => {
      const text = character[field as keyof Character];
      if (!text) return;
      result[field] = await analyzeText(`${text}`);
    })
  );

  return Object.keys(result).reduce((accum, key) => {
    const value = result[key];
    if (!!value) accum[key] = value;
    return accum;
  }, {} as Highlights);
}

export default router;
