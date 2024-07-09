import express from 'express';
import { initializeDatabase } from './db.js';
import editsRouter from './edits.js';
import cors from 'cors';

const port = process.env.PORT || 3030;

const app = express();

app.use(cors());
app.use(express.json());
app.use('/', editsRouter);

async function startServer() {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`Fuckery is happening on port ${port} 🧙`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start the Fuckery:', error);
  process.exit(1);
});
