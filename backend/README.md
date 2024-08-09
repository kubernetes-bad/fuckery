# Fuckery 🔮🧙

Tool to edit your datasets - with friends!

Fuckery allows you to grade and fix your natural language datasets in a collaborative environment.

_Part of the [CharGen](https://huggingface.co/kubernetes-bad/chargen-v2) project_

## Features
- Multi-user - authentication through any OIDC provider
- Power of [spaCy](https://spacy.io) in the browser (used for NER, currently)
- Grammar highlighting

## Screenshots
Main screen:
![Main Screen](./media/main_screen.png)

Edit mode:
![Edit Mode](./media/edit_mode.png)


## Installation

1. Copy the `backend/example.env` into `backend/.env` and edit the values to your liking.
2. Do the same for frontend (`frontend/example.env`)
3. `docker compose up -d`
4. Fuckery will be accessible on [port 3030](http://localhost:3030/).

## Configuration

If you don't need authentication (you're the only user) - do not set `AUTH_SECRET` environment variable.

**Warning: Do not expose Fuckery to the internet when there is no authentication enabled.**

