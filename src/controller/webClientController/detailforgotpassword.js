const pool = require("../../models/connectDB")
const {verifyforgotpasswordToken} = require("../../utils/jwt_services")
const { hashPassword , comparePassword } = require("../../utils/helpers")



let postdetailforgotpassword = async (req, res) => {
    const { password, passwordcf, number_cf } = req.body;
    const token = req.cookies.forgotpassword;

    if (!token) {
        return res.status(404).json({ message: "token invalid" });
    }

    if (!password || !passwordcf || !number_cf) {
        return res.status(402).json({ message: "invalid data body" });
    }

    const result = await verifyforgotpasswordToken(number_cf, token);

    if (result.status === true) {
        try {
            // Lấy thông tin người dùng từ cơ sở dữ liệu
            const [user, userfield] = await pool.execute("SELECT * FROM user WHERE Username = ? AND `Check` = ?", [result.userID, result.role]);
            
            // Băm mật khẩu mới
            const hashpassword = await hashPassword(passwordcf);
            
            // Cập nhật mật khẩu trong cơ sở dữ liệu
            await pool.execute("UPDATE user SET Password = ? WHERE Username = ?", [hashpassword, result.userID]);

            console.log("Password updated successfully");
            return res.status(201).json({message : "thành công đổi mật khẩu"})
        } catch (error) {
            console.error("Error updating password:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    } else if (result === "token hết hạn bạn phải đăng nhập") {
        console.log("token hết hạn bạn phải đăng nhập");
    } else if (result === "invalid signature token ko hợp lệ") {
        console.log("invalid signature token ko hợp lệ");
    } else {
        console.log("err");
    }
}


let getdetailforgotpassword = async (req,res) =>{
    res.render("./Client/detailforgotpassword.ejs")
}

module.exports = {
    postdetailforgotpassword , 
    getdetailforgotpassword
}