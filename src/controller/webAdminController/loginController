const pool = require("../../models/connectDB");
const { comparePassword, validateSignin, verifyCaptchaToken } = require("../../utils/helpers");
const { generateAccessToken } = require("../../utils/jwt_services");
const getSignAdmin = (req, res) => {
  res.render("./Admin/login/signin.ejs");
};

const postSignAdmin = async (req, res) => {
  const { email, password, recaptchaToken } = req.body;
  const result = validateSignin(email, password);

  // Gửi recaptchaToken lên Google reCAPTCHA Service để xác minh tính hợp lệ
  const isCaptchaValid = await verifyCaptchaToken(recaptchaToken);
  if (!isCaptchaValid) {
    return res.status(402).json({ message: "Xác thực không hợp lệ" });
  }

  if (!result.success) {
    return res.status(401).json({ message: result.error.message });
  }

  try {
    const [user] = await pool.execute(
      "SELECT * FROM user WHERE Email = ?",
      [result.data.email]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    // Kiểm tra quyền của người dùng
    if (user[0].Check === 1) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập vào trang admin" });
    }

    // So sánh mật khẩu
    const isPasswordMatch = await comparePassword(password, user[0].Password);
    if (isPasswordMatch) {
      if (user[0].Check === 2 || user[0].Check === 3) {
        const accessToken = await generateAccessToken(user[0].Username, user[0].Check);
        res.cookie("Token", accessToken, { maxAge: 3600000 });
        res.cookie("Username", user[0].Username.toString(), { maxAge: 3600000 });
        // Chuyển hướng người dùng đến trang admin
        return res.status(200).json({ message: "Đăng nhập thành công", Username: user[0].Username });
      } else {
        return res.status(403).json({ message: "Bạn không có quyền truy cập vào trang admin" });
      }
    } else {
      return res.status(401).json({ message: "Mật khẩu không đúng" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getSignAdmin,
  postSignAdmin,
};