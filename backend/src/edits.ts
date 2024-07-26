import { Router } from 'express';
import { db } from './db.js';
import { Character, EditableCharacter } from './types.js';
import { analyzeText } from './text-tools.js';
import { AuthenticatedRequest, ensureAuthenticated } from './auth.js';

const INPUT_TABLE = 'characters';
const OUTPUT_TABLE = 'edits';

const router = Router();

router.get('/next', ensureAuthenticated, async (req, res) => {
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

    const editableCharacter: EditableCharacter = {
      character,
    };

    res.json(editableCharacter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/highlights', ensureAuthenticated, async (req, res) => {
  try {
    const text = req.body.text;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    const highlights = await analyzeText(text);
    res.json({ highlights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
})

router.post('/edit', ensureAuthenticated, async (req, res) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const char: Character = req.body;
    const editor = req.header('x-editor') || authenticatedReq.user?.preferred_username || authenticatedReq.user?.sub;

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

router.get('/info', ensureAuthenticated, async (req, res) => {
  try {
    const [total, done] = await Promise.all([
      db(INPUT_TABLE).count('id as count').first(),
      db(OUTPUT_TABLE).count('id as count').first()
    ]);
    if (!total || !done) return res.send({});
    res.send({ total: total.count, done: done.count });
  } catch (err) {
    console.error(err);
    res.send({});
  }
});

export default router;
