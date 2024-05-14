const passport = require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require("dotenv").config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },

  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    return cb(null , profile)
  }

));