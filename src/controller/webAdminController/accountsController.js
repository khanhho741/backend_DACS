const pool = require("../../models/connectDB");
const { hashPassword } = require('../../utils/helpers');


let getAdminV1Accounts = async (req, res) => {
    try {
        let _page = req.query.page ? req.query.page : 1;
        let limit = 5;
        let start = (_page - 1) * limit;
        // let totalRow = 20;
        let name = req.query.name;
      
        // total tổng các item trong database
        const [total, fields] = await pool.execute(
          "select count(*) as total from user"
        );
        let totalRow = total[0].total;
      
        // tong so trang
        let totalPage = Math.ceil(totalRow / limit);
      
        //
        if (name) {
          const [rows, fields] = await pool.execute(
            "SELECT * FROM `user` where `username` like ? limit ? , ? ",
            [`%${name}%`, start, limit]
          );
          res.render("accounts.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,
            page: parseInt(_page),
          });
        } else {
          const [rows, fields] = await pool.execute("SELECT * FROM `user` limit "+ start+"," +limit);
          res.render("./Admin/accounts/accounts.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,   
            page: parseInt(_page),
          });
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}





const postAdminV1AccountsCreate = async (req, res) => {
    const connection = await pool.getConnection(); // Lấy connection từ pool
    await connection.beginTransaction(); // Bắt đầu transaction

    try {
        const { Username, Email, Password, Check, IDStaffType } = req.body;

        // Mã hóa mật khẩu
        const hashedPassword = await hashPassword(Password);

        // Kiểm tra trùng lặp
        const sqlCheckDuplicate = "SELECT * FROM user WHERE Username = ? OR Email = ?";
        const [duplicateRows] = await connection.execute(sqlCheckDuplicate, [Username, Email]);
        if (duplicateRows.length > 0) {
            await connection.rollback(); // Hủy bỏ transaction nếu có dữ liệu trùng lặp
            connection.release(); // Trả lại connection cho pool
            return res.status(409).json({ message: "Duplicate data found for User (Name or Email)" });
        }

        // Thêm vào bảng user
        const sqlInsertUser = "INSERT INTO user (Username, Email, Password, `Check`) VALUES (?, ?, ?, ?)";
        await connection.execute(sqlInsertUser, [Username, Email, hashedPassword, Check]);

        // Thêm vào bảng staff với Username và IDStaffType từ request body
        const sqlInsertStaff = "INSERT INTO staff (Username, IDStaffType) VALUES (?, ?)";
        await connection.execute(sqlInsertStaff, [Username, IDStaffType]);

        await connection.commit(); // Commit transaction
        connection.release(); // Trả lại connection cho pool
        return res.status(201).json({ message: "Created Successfully" });
    } catch (error) {
        await connection.rollback(); // Hủy bỏ transaction nếu có lỗi
        connection.release(); // Trả lại connection cho pool
        console.error('Error creating user and staff:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

let postAdminV1AccountsEdit = async (req, res) => {
    try {
        const itemId = req.params.id;
        const {  Password, Check } = req.body;

        if (!itemId  || !Password || !Check) {
            console.log("Thông tin không đủ hoặc không hợp lệ.");
            return res.status(400).json({ message: "Thông tin không đủ hoặc không hợp lệ." });
        }

        // Mã hóa mật khẩu mới
        const hashedPassword = await hashPassword(Password);

        // Kiểm tra xem user có tồn tại hay không
        const [rows] = await pool.execute("SELECT * FROM `user` WHERE Username = ?", [itemId]);

        if (!rows || rows.length === 0) {
            console.log("user không tồn tại.");
            return res.status(404).json({ message: "user không tồn tại." });
        }

        // Kiểm tra xem có trùng tên user khác không
        const [existingRows] = await pool.execute("SELECT * FROM `user` WHERE Username = ?", [itemId]);

        if (existingRows && existingRows.length > 0 && existingRows[0].Username !== itemId) {
            console.log("Tên user đã tồn tại.");
            return res.status(400).json({ message: "Tên user đã tồn tại." });
        }

        // Cập nhật thông tin user vào cơ sở dữ liệu
        const [updateRows] = await pool.execute(
            "UPDATE `user` SET Password = ?, `Check` = ? WHERE Username = ?",
            [hashedPassword, Check, itemId]
        );

        if (updateRows.affectedRows > 0) {
            console.log("Đã cập nhật thông tin user thành công.");
            return res.status(200).json({ message: "Đã cập nhật thông tin user thành công." });
        } else {
            console.log("Không có bản ghi nào được cập nhật.");
            return res.status(500).json({ message: "Không có bản ghi nào được cập nhật." });
        }
    } catch (error) {
        console.error("Lỗi xử lý yêu cầu POST:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi server." });
    }
};

const postAdminV1AccountsDelete = async (req, res) => {
    const itemId = req.params.id;

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [existingRows] = await connection.execute("SELECT * FROM `user` WHERE Username = ?", [itemId]);

            if (!existingRows || existingRows.length === 0) {
                console.log("User không tồn tại.");
                await connection.rollback();
                return res.status(404).json({ message: "User không tồn tại." });
            }

            const [updateRows] = await connection.execute("UPDATE `user` SET `Check` = 0 WHERE Username = ?", [itemId]);

            if (updateRows.affectedRows > 0) {
                console.log("Đã chặn tài khoản thành công.");
                await connection.commit();
                return res.status(200).json({ message: "Đã chặn tài khoản thành công." });
            } else {
                console.log("Không có bản ghi nào được cập nhật.");
                await connection.rollback();
                return res.status(500).json({ message: "Không có bản ghi nào được cập nhật." });
            }
        } catch (error) {
            console.error("Lỗi xử lý yêu cầu UPDATE:", error);
            await connection.rollback();
            res.status(500).json({ message: "Đã xảy ra lỗi server." });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Lỗi kết nối cơ sở dữ liệu:", error);
        res.status(500).json({ message: "Internal Server Error - Database connection" });
    }
};

let getAdminV1AccountsEdit = async (req, res) => {
    const itemId = req.params.id;
    try {
        const [rows] = await pool.execute("SELECT * FROM `user` WHERE Username = ?", [itemId]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.render("./Admin/accounts/accountsEdit.ejs", {
            row: rows,
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


let getAdminV1AccountsCreate = (req,res) =>{
    res.render("./Admin/accounts/accountsCreate.ejs")
}

module.exports = {
    getAdminV1Accounts,
    getAdminV1AccountsEdit,
    getAdminV1AccountsCreate,
    postAdminV1AccountsCreate,
    postAdminV1AccountsEdit,
    postAdminV1AccountsDelete
}
