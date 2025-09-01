import { Request, Response } from 'express';
import passport from '../config/passport';
import { generateToken } from '../utils/jwt';

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleCallback = (req: Request, res: Response): void => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err) {
      console.error('Google OAuth error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth_error`);
      return;
    }

    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth_failed`);
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  })(req, res);
};
