const pool = require("../../models/connectDB");
const { generateforgotpasswordToken } = require("../../utils/jwt_services");
const { generateRandomString } = require("../../utils/helpers")
const sendEmailService = require("../../services/sendEmail")
let getForgotPassword = (req, res) => {
  res.render("./Client/forgotpassword.ejs");
};

let postForgotPassword = async (req, res , next) => {
  try {
    const [userExist, userExistfiled] = await pool.execute("select * from user where Email = ? ", [req.body.email]);
    if (userExist.length > 0) {
      const secret = generateRandomString(64);
      const token = await generateforgotpasswordToken(userExist[0].Username, userExist[0].Check, secret);
      const date = new Date()
      res.cookie('forgotpassword',token,{
        expires: date.now + 120000 , 
        httpOnly : true ,
        Secure : true
      })
      sendEmailService(userExist[0].Email,secret)
      return res.status(201).json({message: 'ok'})
    }else {
      return res.status(403).json({message:"email ko tồn tại"})
    }
  } catch (err) {
    throw err;
  }
};


module.exports = {
  getForgotPassword,
  postForgotPassword,
  
};
