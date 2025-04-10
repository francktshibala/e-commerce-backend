const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user.model');

// JWT Strategy for token authentication
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-default-jwt-secret'
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // Find the user by id from the JWT payload
      const user = await User.findById(payload.id).select('-password');
      
      if (!user) {
        return done(null, false);
      }
      
      // Check if user is active
      if (!user.isActive) {
        return done(null, false);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
        scope: ["profile", "email"]
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // Update last login
            user.lastLogin = Date.now();
            await user.save();
            return done(null, user);
          }
          
          // Create new user from Google profile
          user = new User({
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            // Generate a random secure password that the user won't use
            // (they'll login via Google)
            password: require('crypto').randomBytes(16).toString('hex'),
            role: 'customer',
            isActive: true,
            lastLogin: Date.now()
          });
          
          await user.save();
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

module.exports = passport;