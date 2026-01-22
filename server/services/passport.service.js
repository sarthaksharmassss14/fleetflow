import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const configurePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL}/api/auth/google/callback`,
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        console.log(`[OAuth] Callback received for: ${profile.displayName} (${profile.id})`);
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          if (!email) {
             console.error("[OAuth] No email found in Google profile");
             return done(new Error("No email associated with this Google account"), null);
          }

          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // If not, check if user exists with same email
          user = await User.findOne({ email });

          if (user) {
            // Link google account to existing local account
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }

          // If not found anywhere, don't create yet - send back profile for role selection
          const newUser = {
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            isNewUser: true
          };

          return done(null, newUser);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );

  // Passport session setup (not used for JWT but needed for passport initialization)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default configurePassport;
