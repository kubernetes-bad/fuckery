export interface Character {
  id: number;
  name: string;
  personality: string;
  scenario: string;
  tavern_personality: string;
  first_message: string;
  example_dialogs: string;
  grade: string;
}

export interface Highlight {
  start: number;
  end: number;
  message: string;
  type: 'WARN' | 'ERR' | 'INFO';
}

export interface Highlights {
  [key: string]: Highlight[];
}

export interface EditableCharacter {
  character: Character;
  highlights: Highlights;
}

export interface Edit {
  characterId: number;
  field: string;
  newValue: string;
}


export type SpacyEnt = { text: string, start: number, end: number, label: 'PERSON' | 'DATE' | 'GPE' | 'NORP' };
export type SpacyToken = {
  text: string
  text_with_ws: string
  whitespace: string
  orth: number
  i: number
  idx: number
  ent_type: string
  ent_iob: string
  lemma: string
  norm: string
  lower: string
  shape: string
  prefix: string
  suffix: string
  pos: number
  tag: string
  dep: string
  is_alpha: boolean
  is_ascii: boolean
  is_digit: boolean
  is_lower: boolean
  is_upper: boolean
  is_title: boolean
  is_punct: boolean
  is_left_punct: boolean
  is_right_punct: boolean
  is_space: boolean
  is_bracket: boolean
  is_currency: boolean
  like_url: string
  like_num: string
  like_email: string
  is_oov: boolean
  is_stop: boolean
  is_sent_start: boolean
  head: number
};
export type SpacyDoc = { ents: SpacyEnt[], tokens: SpacyToken[] };
