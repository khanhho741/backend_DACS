const pool = require("../../models/connectDB");
const { hashPassword } = require("../../utils/helpers");
const { generateAccessToken } = require("../../utils/jwt_services");
const { promisify } = require("util");
const getConnection = promisify(pool.getConnection).bind(pool);
require("dotenv").config();

let loginSuccess = async (req, res) => {
  let connection;

  try {
    const { email, family_name, given_name } = req.user._json;
    const { id } = req.user;

    // Kiểm tra xem giá trị given_name và family_name có tồn tại không
    if (!given_name || !family_name) {
      throw new Error("Missing user name details");
    }

    // Tạo username từ given_name và family_name
    const username = `${given_name} ${family_name}`;

    connection = await pool.getConnection();

    const [existingUser] = await connection.query("SELECT * FROM user WHERE Username = ? AND Email = ?", [username, email]);

    if (existingUser.length > 0) {
      const accessToken = await generateAccessToken(existingUser[0].Username, existingUser[0].Check);
      res.cookie("Token", accessToken);
      res.cookie("Username", existingUser[0].Username.toString());
      return res.redirect("/home");
    }

    try {
      const hashedPassword = await hashPassword(id);

      // Thêm người dùng vào bảng user
      await connection.query("INSERT INTO user (Username, Email, Password, `Check`) VALUES (?, ?, ?, ?)", [
        username,
        email,
        hashedPassword,
        1,
      ]);

      // Commit transaction nếu mọi thứ thành công
      await connection.commit();

      // Đăng nhập
      const accessToken = await generateAccessToken(username, 1);
      res.cookie("Token", accessToken);
      res.cookie("Username", username);
      return res.redirect("/home");
    } catch (error) {
      await connection.rollback();
      console.error("Error inserting data:", error);
      res.status(500).json({ message: "Internal Server Error - Transaction rollback" });
    } finally {
      // Luôn phải giải phóng kết nối sau khi sử dụng
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    res.status(500).json({ message: "Internal Server Error - Database connection" });
  }
};

module.exports = {
  loginSuccess,
};