import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './db.js';
import editsRouter from './edits.js';
import { authRouter, setupOIDCClient } from './auth.js';

const port = process.env.PORT || 3030;

const app = express();

app.set('trust proxy', 1); // for cookies behind cloudflare
app.use(cookieParser());
app.use(
  session({
    secret: process.env.AUTH_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // will explode without it
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
await setupOIDCClient();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

app.use('/', editsRouter);
app.use('/auth', authRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).send('An error occurred');
});

await initializeDatabase();
app.listen(port, () => {
  console.log(`Fuckery is happening on port ${port} 🧙`);
});
