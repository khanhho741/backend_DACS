const router = require("express").Router();
const passport = require("passport");
const { loginSuccess } = require("../controller/webClientController/passportController");

// localhost:8888/api/auth/google
router.get( "/google", passport.authenticate("google", { scope: ["profile" ,"email" ], session: false }) );

router.get("/google/callback" ,(req,res,next) => {
 
  passport.authenticate("google", async (err , profile) => {
    if(err){
      console.log(err)
      return err
    }
   req.user = profile
   next()
 }) (req, res, next) 
} 
,
loginSuccess );


module.exports = router;