import spacy from '@nlp-x/spacy3.x';
import en from 'dictionary-en';
import nspell from 'nspell';

import { Highlight, SpacyDoc, SpacyEnt } from './types.js';
import { OK_WORDS } from './spelling_dict.js';

const nlp = spacy.load('en_core_web_sm');
const spell = nspell(en.aff.toString(), en.dic.toString())
  .personal(OK_WORDS.join('\n')); // Add chub-specific dict

export async function analyzeText(text: string): Promise<Highlight[]> {
  const doc = await nlp(text);

  const highlights = await Promise.all([
    findImbalancedSymbols(text),
    findPersonEntities(doc),
    findSpellingMistakes(doc),
    findUnterminatedMarkdown(text),
  ]);
  return highlights
    .flat()
    .sort((h1, h2) => h1.start - h2.start);
}

async function findPersonEntities(doc: SpacyDoc): Promise<Highlight[]> {
  if (!doc.tokens.length) return [];

  const ents = (doc.ents || [])
    .filter((ent: SpacyEnt) => ent.label === 'PERSON')
    .map((ent: SpacyEnt): SpacyEnt => {  // convert token offsets into char offsets
      const startToken = doc.tokens[ent.start];
      const endToken = doc.tokens[ent.end];
      const start = startToken.idx;
      const end = endToken ? endToken.idx-1 : startToken.idx + startToken.text.length;
      return {
        ...ent,
        start,
        end,
      };
    });
  return ents.map((ent: SpacyEnt) => ({
    start: ent.start,
    end: ent.end,
    message: `Person`,
    type: 'INFO',
  }));
}

function findImbalancedSymbols(text: string): Highlight[] {
  const highlights: Highlight[] = [];
  const stack: { char: string; index: number }[] = [];
  const pairs: { [key: string]: string } = {
    '(': ')',
    '[': ']'
  };

  let isOpenQuote = true; // Track whether the next quote should be an opening or closing quote

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (isOpenQuote) stack.push({ char, index: i });
      else {
        if (stack.length === 0 || stack[stack.length - 1].char !== '"') {
          highlights.push({
            start: i,
            end: i + 1,
            message: `Unmatched closing quote`,
            type: 'ERR',
          });
        } else stack.pop();
      }
      isOpenQuote = !isOpenQuote; // Toggle the quote state
    } else if (char === '*') {
      if (stack.length > 0 && stack[stack.length - 1].char === '*') stack.pop(); // Properly close previous '*'
      else stack.push({ char, index: i }); // Treat '*' as opening symbol
    } else if (Object.keys(pairs).includes(char)) {
      stack.push({ char, index: i });
    } else if (Object.values(pairs).includes(char)) {
      if (stack.length === 0 || pairs[stack[stack.length - 1].char] !== char) {
        highlights.push({
          start: i,
          end: i + 1,
          message: `Unmatched closing symbol: ${char}`,
          type: 'ERR',
        });
      } else stack.pop();
    }
  }

  while (stack.length > 0) {
    const { char, index } = stack.pop()!;
    highlights.push({
      start: index,
      end: index + 1,
      message: `Unclosed symbol: ${char}`,
      type: 'ERR',
    });
  }
  return highlights;
}


function findSpellingMistakes(doc: SpacyDoc): Highlight[] {
  const highlights: Highlight[] = [];

  for (const token of doc.tokens) {
    if (!token.is_alpha || token.is_punct || token.is_space) continue;
    if (spell.correct(token.text)) continue;

    const suggest = spell.suggest(token.text);
    highlights.push({
      start: token.idx,
      end: token.idx + token.text.length,
      message: `Spelling: "${token.text}"${suggest.length ? (' -> "' + suggest[0] + '"?') : ''}`,
      type: 'WARN',
    });
  }

  return highlights;
}

function findUnterminatedMarkdown(text: string): Highlight[] {
  const highlights: Highlight[] = [];
  const italicsRegex = /\*(.*?)\*/g;
  const okPunctuation = ['.', '!', '?', ','];

  let match;
  while ((match = italicsRegex.exec(text)) !== null) {
    const italicText = match[1];
    const italicStart = match.index;
    const italicEnd = italicStart + match[0].length;

    if (!italicText.length || okPunctuation.includes(italicText[italicText.length - 1])) continue;

    const afterItalic = text.slice(italicEnd).trimStart();
    if (!afterItalic.length || (afterItalic[0] !== '\n' && !/[A-Z]/.test(afterItalic[0]))) continue;
    highlights.push({
      start: italicStart,
      end: italicEnd,
      message: 'Weird markdown',
      type: 'WARN',
    });
  }

  return highlights;
}
