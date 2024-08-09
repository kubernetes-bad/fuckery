import sys
import json
import subprocess
import spacy

def download_model():
  packages = [sys.argv[2]]

  for package_name in packages:
    if not spacy.util.is_package(package_name):
      subprocess.check_call([sys.executable, '-m', 'spacy', 'download', package_name, '--timeout=100000'])

def info():
  print(spacy.info())

def load():
  model = sys.argv[2]
  nlp = spacy.load(model)

  _pipe_names = nlp.pipe_names
  _path = str(nlp.path)
  _vocab = {
    "lang": nlp.vocab.lang,
    "length":  nlp.vocab.length,
    "vectors_length": nlp.vocab.vectors_length,
    "cfg": nlp.vocab.cfg
  }
  _config = nlp.config
  _optimizer = nlp._optimizer
  _pipe_meta = str(nlp._pipe_meta)
  _meta = nlp.meta
  _pipe_configs = nlp._pipe_configs
  _components = [ component[0] for component in nlp.components ]
  _disabled = nlp.disabled
  _max_length = nlp.max_length
  _batch_size = nlp.batch_size

  print(json.dumps({
    "pipe_names": _pipe_names,
    "path": _path,
    "vocab": _vocab,
    "config": _config,
    "_optimizer": _optimizer,
    "_pipe_meta": _pipe_meta,
    "meta": _meta,
    "_pipe_configs": _pipe_configs,
    "components": _components,
    "disabled": _disabled,
    "max_length": _max_length,
    "batch_size": _batch_size
  }))

def nlp():
  text = sys.argv[2]
  model = sys.argv[3]
  nlp = spacy.load(model)

  doc = nlp(text)

  _doc = {
    "text": doc.text,
    "text_with_ws": doc.text_with_ws,
    "cats": doc.cats,
    "is_tagged": doc.has_annotation("TAG"),
    "is_parsed": doc.has_annotation("DEP"),
    "is_nered": doc.has_annotation("ENT_IOB"),
    "is_sentenced": doc.has_annotation("SENT_START"),
  }

  _ents = [
    {
      "text": ent.text,
      "start": ent.start,
      "end": ent.end,
      "label": ent.label_,
    } for ent in doc.ents
  ]

  if doc.has_annotation("SENT_START"):
    _sents = [
      {
        "start": sent.start,
        "end": sent.end,
        "text": sent.text,
        "tokens": [
          {
            "text": token.text,
            "text_with_ws": token.text_with_ws,
            "whitespace": token.whitespace_,
            "orth": token.orth,
            "i": token.i,
            "ent_type": token.ent_type_,
            "ent_iob": token.ent_iob_,
            "lemma": token.lemma_,
            "norm": token.norm_,
            "lower": token.lower_,
            "shape": token.shape_,
            "prefix": token.prefix_,
            "suffix": token.suffix_,
            "pos": token.pos_,
            "tag": token.tag_,
            "dep": token.dep_,
            "is_alpha": token.is_alpha,
            "is_ascii": token.is_ascii,
            "is_digit": token.is_digit,
            "is_lower": token.is_lower,
            "is_upper": token.is_upper,
            "is_title": token.is_title,
            "is_punct": token.is_punct,
            "is_left_punct": token.is_left_punct,
            "is_right_punct": token.is_right_punct,
            "is_space": token.is_space,
            "is_bracket": token.is_bracket,
            "is_currency": token.is_currency,
            "like_url": token.like_url,
            "like_num": token.like_num,
            "like_email": token.like_email,
            "is_oov": token.is_oov,
            "is_stop": token.is_stop,
            "is_sent_start": token.is_sent_start,
            "head": token.head.i,
          } for token in sent
        ]
      } for sent in doc.sents
    ]
  else:
    _sents = []

  if doc.has_annotation("TAG") and doc.has_annotation("DEP"):
    _noun_chunks = [
      {
        "start": chunk.start,
        "end": chunk.end
      } for chunk in doc.noun_chunks
    ]
  else:
    _noun_chunks = []

  _tokens = [
    {
      "text": token.text,
      "text_with_ws": token.text_with_ws,
      "whitespace": token.whitespace_,
      "orth": token.orth,
      "i": token.i,
      "idx": token.idx,
      "ent_type": token.ent_type_,
      "ent_iob": token.ent_iob_,
      "lemma": token.lemma_,
      "norm": token.norm_,
      "lower": token.lower_,
      "shape": token.shape_,
      "prefix": token.prefix_,
      "suffix": token.suffix_,
      "pos": token.pos_,
      "tag": token.tag_,
      "dep": token.dep_,
      "is_alpha": token.is_alpha,
      "is_ascii": token.is_ascii,
      "is_digit": token.is_digit,
      "is_lower": token.is_lower,
      "is_upper": token.is_upper,
      "is_title": token.is_title,
      "is_punct": token.is_punct,
      "is_left_punct": token.is_left_punct,
      "is_right_punct": token.is_right_punct,
      "is_space": token.is_space,
      "is_bracket": token.is_bracket,
      "is_currency": token.is_currency,
      "like_url": token.like_url,
      "like_num": token.like_num,
      "like_email": token.like_email,
      "is_oov": token.is_oov,
      "is_stop": token.is_stop,
      "is_sent_start": token.is_sent_start,
      "head": token.head.i,
    }
    for token in doc
  ]

  print(json.dumps({
    "model": model,
    "doc": _doc,
    "ents": _ents,
    "sents": _sents,
    "noun_chunks": _noun_chunks,
    "tokens": _tokens,
  }))

if sys.argv[1] == 'info':
  info()

if sys.argv[1] == 'load':
  load()

if sys.argv[1] == 'download_model':
  download_model()

if sys.argv[1] == 'nlp':
  nlp()

sys.stdout.flush()
