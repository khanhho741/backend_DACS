const pool = require("../../models/connectDB");

const { validateSignin , comparePassword, verifyCaptchaToken } = require("../../utils/helpers");
const { generateAccessToken } = require("../../utils/jwt_services");

let getSign = (req, res) => {
  console.log(req.payload);
  res.render("./Client/signin.ejs");
};

const postSign = async (req, res) => {
  const { email, password ,recaptchaToken} = req.body;
  const result = validateSignin(email, password);

  // Gửi recaptchaToken lên Google reCAPTCHA Service để xác minh tính hợp lệ
  const isCaptchaValid = await verifyCaptchaToken(recaptchaToken);
  console.log(isCaptchaValid)
  if (!isCaptchaValid) {
    return res.status(402).json({ message: "Xác thực không hợp lệ" });
  }


  if (!result.success) {
    return res.status(401).json({ message: result.error.message });
  }

  try {
    const [user, userFields] = await pool.execute(
      "SELECT * FROM user WHERE Email = ?",
      [result.data.email]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    const isPasswordMatch = await comparePassword(password, user[0].Password);
    if (isPasswordMatch) {
      const accessToken = await generateAccessToken(
        user[0].Username,
        user[0].Check
      );
      res.cookie("Token", accessToken , {
        maxAge: 3600000, 

      } );
      res.cookie("Username", user[0].Username.toString() ,{
        maxAge: 3600000, 

      });
  
      return res
        .status(201)
        .json({
          message: "đăng nhập thành công",
          token: accessToken,
          Username: user[0].Username,
        });
    } else {
      return res.status(401).json({ message: "Mật khẩu không đúng" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getSign,
  postSign,
};
