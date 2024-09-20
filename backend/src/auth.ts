import passport from 'passport';
import { Strategy as OpenIDConnectStrategy, Issuer, Client } from 'openid-client';
import { Request, Response, NextFunction, Router } from 'express';
import { Session } from 'express-session';
import * as process from 'node:process';

let client: Client;

export async function setupOIDCClient() {
  const discoveryUrl = `${process.env.AUTH_URL}/.well-known/openid-configuration`;
  const issuer = await Issuer.discover(discoveryUrl);

  client = new issuer.Client({
    client_id: process.env.AUTH_CLIENT_ID as string,
    client_secret: process.env.AUTH_CLIENT_SECRET as string,
    redirect_uris: [`${process.env.BACKEND_URL}/auth/callback`],
    response_types: ['code'],
  });

  passport.use('oidc', new OpenIDConnectStrategy({
    client,
    params: {
      scope: 'openid profile email',
    },
  }, (tokenSet: any, userInfo: any, done: any) => {
    return done(null, userInfo);
  }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj: any, done) => {
    done(null, obj);
  });
}

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!process.env.AUTH_SECRET) return next();
  const authenticatedReq = req as AuthenticatedRequest;
  if (authenticatedReq.isAuthenticated()) return next();
  res.redirect('/auth/login');
}

type PassportSession = Session & {
  passport?: { user?: {[key: string]: any } },
  [key: string]: any,
};

export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (!process.env.AUTH_SECRET) return next();
  const authenticatedReq = req as AuthenticatedRequest;
  const passportSession = authenticatedReq.session as PassportSession;
  if (!authenticatedReq.isAuthenticated()) return res.redirect('/auth/login');
  if (!passportSession?.passport?.user) return res.redirect('/auth/login');
  const user = passportSession.passport.user;
  const isAdmin = (user.groups || []).includes(process.env.AUTH_ADMIN_GROUP || 'admins');
  if (!isAdmin) return res.redirect('/');
  return next();
}

export const authRouter = Router();

authRouter.get('/login', (req, res, next) => {
  passport.authenticate('oidc')(req, res, next);
});

authRouter.get('/callback', (req, res, next) => {
  passport.authenticate('oidc', {
    successRedirect: process.env.FRONTEND_URL,
    failureRedirect: '/auth/login',
  })(req, res, next);
});

authRouter.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Error during logout:', err);
    res.redirect('/');
  });
});

export interface AuthenticatedRequest extends Request {
  user?: OIDCUser;
}

export interface OIDCUser {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updated_at?: number;
}
