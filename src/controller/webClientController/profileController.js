const pool = require("../../models/connectDB");
const { comparePassword, hashPassword } = require("../../utils/helpers");
const moment = require('moment');

let getProfile = async  (req, res) => {
  try {
    // Lấy thông tin của người dùng hiện tại
    const username = req.cookies.Username;

    // Truy vấn thông tin khách hàng từ bảng customer
    const [customerRows, customerFields] = await pool.execute(
      "SELECT * FROM customer WHERE Username = ?",
      [username]
    );

    // Xử lý kết quả truy vấn để trích xuất thông tin khách hàng
    const currentUser = {
      username: customerRows[0].Username,
      customerName: customerRows[0].CustomerName,
      phoneNumber: customerRows[0].PhoneCustomer,
      address: customerRows[0].CustomerAddress,
      citizenID: customerRows[0].CitizenIdentificationCode,
      dob: moment(customerRows[0].DateOfBirth).format('YYYY-MM-DD'),
      gender: customerRows[0].Sex
    };

    // Render view và truyền biến currentUser vào
    res.render("./Client/profile.ejs", { currentUser: currentUser });
  } catch (error) {
    console.error("Error fetching customer information:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateAccountInfo = async (req, res) => {
  try {
    // Lấy thông tin cập nhật từ body của yêu cầu
    const { customerName, phoneNumber, address, citizenID, dob, gender } = req.body;
    
    // Lấy tên đăng nhập từ cookie
    const username = req.cookies.Username;

    // Kiểm tra xem có thông tin cập nhật nào được cung cấp không
    if (!username && !phoneNumber && !address && !citizenID && !dob && !gender) {
      return res.status(400).json({ message: "No update information provided" });
    }

    // Thực hiện cập nhật thông tin tài khoản trong bảng customer
    const updateQuery = "UPDATE customer SET CustomerName = ?, PhoneCustomer = ?, CustomerAddress = ?, CitizenIdentificationCode = ?, DateOfBirth = ?, Sex = ? WHERE Username = ?";
    await pool.query(updateQuery, [customerName, phoneNumber, address, citizenID, dob, gender, username]);

    return res.status(200).json({ message: "Account information updated successfully" });
  } catch (error) {
    console.error("Error updating account information:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const username = req.cookies.Username; // Lấy username từ cookie

    // Kiểm tra xem có dữ liệu bắt buộc được cung cấp không
    if (!username || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Kiểm tra xác nhận mật khẩu mới
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    // Lấy thông tin người dùng từ database
    const [user, userFields] = await pool.execute("SELECT * FROM user WHERE Username = ?", [username]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // So sánh mật khẩu hiện tại với mật khẩu trong database
    const isPasswordMatch = await comparePassword(currentPassword, user[0].Password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await hashPassword(newPassword);

    // Update mật khẩu mới vào database
    const updateQuery = "UPDATE user SET Password = ? WHERE Username = ?";
    await pool.query(updateQuery, [hashedNewPassword, username]);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = {
  getProfile,
  updateAccountInfo,
  changePassword,
};