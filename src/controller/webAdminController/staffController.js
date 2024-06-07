const pool = require("../../models/connectDB");
const XLSX = require('xlsx');

let getAdminV1Staff = async (req, res) => {
    try {
        let _page = req.query.page ? req.query.page : 1;
        let limit = 5;
        let start = (_page - 1) * limit;
        // let totalRow = 20;
        let name = req.query.name;
      
        // total tổng các item trong database
        const [total, fields] = await pool.execute(
          "select count(*) as total from staff"
        );
        let totalRow = total[0].total;
      
        // tong so trang
        let totalPage = Math.ceil(totalRow / limit);
      
        
        
        //
        if (name) {
          const [rows, fields] = await pool.execute(
            "SELECT * FROM `staff` where `username` like ? limit ? , ? ",
            [`%${name}%`, start, limit]
          );
          res.render("staff.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,
            page: parseInt(_page),
          });
        } else {
          const [rows, fields] = await pool.execute("SELECT * FROM `staff` limit "+ start+"," +limit);
          res.render("./Admin/accounts/staff.ejs", {
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

let getAdminV1StaffEdit = async (req, res) => {
  const itemId = req.params.id;
  try {
      const [rows] = await pool.execute(
          "SELECT * FROM `staff` WHERE IDStaff = ?",
          [itemId]
      );

      if (rows.length > 0) {
          res.render("./Admin/accounts/staffEdit.ejs", {
              row: rows[0]
          });
      } else {
          res.status(404).json({ message: "Staff member not found." });
      }
  } catch (err) {
      console.error('Error fetching staff data', err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};
let postAdminV1StaffEdit = async (req, res) => {
  const itemId = req.params.id;
  const { IDStaffType } = req.body;

  try {
      if (!IDStaffType || !itemId) {
          return res.status(400).json({ message: "Invalid input data." });
      }

      const [rows] = await pool.execute(
          "SELECT * FROM `staff` WHERE IDStaff = ?",
          [itemId]
      );

      if (rows.length === 0) {
          return res.status(404).json({ message: "Staff member not found." });
      }

      await pool.execute(
          "UPDATE `staff` SET IDStaffType = ? WHERE IDStaff = ?",
          [IDStaffType, itemId]
      );

      res.status(200).json({ message: "Staff member updated successfully." });
  } catch (err) {
      console.error('Error updating staff data', err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};

let exportToExcel = async (req, res) => {
    try {
        const [rows, fields] = await pool.execute("SELECT * FROM `staff`");

        // Tạo một đối tượng Workbook mới
        let wb = XLSX.utils.book_new();

        // Tạo một sheet từ dữ liệu rows
        let ws = XLSX.utils.json_to_sheet(rows);

        // Thêm sheet vào Workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Staffs');

        // Chuyển workbook thành một buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Thiết lập header của phản hồi
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=staffs.xlsx');

        // Gửi buffer của tệp Excel như là phản hồi
        res.send(buffer);
    } catch (err) {
        console.error('Error exporting Excel file', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

let getAdminV1StaffType = async (req,res) =>{
    try {
        let _page = req.query.page ? req.query.page : 1;
        let limit = 5;
        let start = (_page - 1) * limit;
        // let totalRow = 20;
        let name = req.query.name;
      
        // total tổng các item trong database
        const [total, fields] = await pool.execute("select count(*) as total from stafftype");
        let totalRow = total[0].total;
      
        // tong so trang
        let totalPage = Math.ceil(totalRow / limit);
      
        //
        if (name) {
          const [rows, fields] = await pool.execute(
            "SELECT * FROM `stafftype` where `StaffTypeName` like ? limit ? , ? ",
            [`%${name}%`, start, limit]
          );
          res.render("./Admin/accounts/stafftype.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,
            page: parseInt(_page),
          });
        } else {
          const [rows, fields] = await pool.execute(
            "SELECT * FROM `stafftype` limit " + start +" , " + limit );
          res.render("./Admin/accounts/stafftype.ejs", {
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

let getAdminV1StafftypeCreate = async (req,res) =>{
    res.render("./Admin/accounts/stafftypeCreate.ejs")
}

let getAdminV1StafftypeEdit = async (req,res) =>{
    const itemId = req.params.id;
    const [rows, fields] = await pool.execute(
      "SELECT * FROM `stafftype` where IDStaffType = ? ",
      [itemId]
    );
  
    res.render("./Admin/accounts/stafftypeEdit.ejs",{
        row: rows,
    })
}



let postAdminV1StafftypeCreate = async (req, res) => {
  try {
      const { StaffTypeName } = req.body;
      // Chỉ kiểm tra trùng lặp đối với tên nhà cung cấp và email
      const sqlCheckDuplicate = "SELECT * FROM stafftype WHERE StaffTypeName = ?";
      const [duplicateRows] = await pool.execute(sqlCheckDuplicate, [StaffTypeName]);
      if (duplicateRows.length > 0) {
          return res.status(409).json({ message: "Duplicate data found for StaffTypeName" });
      }

      const sqlInsert = "INSERT INTO stafftype (StaffTypeName) VALUES (?)";
      await pool.execute(sqlInsert, [StaffTypeName]);
      return res.status(201).json({ message: "Created Successfully" });
  } catch (error) {
      console.error('Error creating stafftype:', error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};

let postAdminV1StafftypeEdit = async (req, res) => {
  try {
    const itemId = req.params.id;
    const { StaffTypeName}  = req.body;

    if (!StaffTypeName || !itemId) {
      console.log("Thông tin không đủ hoặc không hợp lệ.");
      return res
        .status(400)
        .json({ message: "Thông tin không đủ hoặc không hợp lệ." });
    }
    const [rows, fields] = await pool.execute(
      "SELECT * FROM `stafftype` WHERE IDStaffType = ?",
      [itemId]
    );

    if (!rows || rows.length === 0) {
      console.log("Loại nhân viên không tồn tại.");
      return res.status(404).json({ message: "Loại nhân viên  không tồn tại." });
    }

    const [existingRows, existingFields] = await pool.execute(
      "SELECT * FROM `stafftype` WHERE StaffTypeName = ?",
      [StaffTypeName]
    );

    if (existingRows && existingRows.length > 0 && existingRows[0].IDStaffType !== itemId) {
      console.log("Tên Loại nhân viên đã tồn tại.");
      return res.status(400).json({ message: "Tên Loại nhân viên đã tồn tại." });
    }

    const [updateRows, updateFields] = await pool.execute(
      "UPDATE `stafftype` SET StaffTypeName = ? WHERE IDStaffType = ?",
      [StaffTypeName,itemId]
    );

    if (updateRows.affectedRows > 0) {
      console.log("Đã cập nhật thông tin loại nhân viên thành công.");
      return res
        .status(200)
        .json({ message: "Đã cập nhật thông tin loại nhân viên thành công." });
    } else {
      console.log("Không có bản ghi nào được cập nhật.");
      return res
        .status(500)
        .json({ message: "Không có bản ghi nào được cập nhật." });
    }
  } catch (error) {
    console.error("Lỗi xử lý yêu cầu POST:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi server." });
  }
};


let postAdminV1StafftypeDelete = async (req, res) => {
  const itemId = req.params.id;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Kiểm tra xem loại sản phẩm có tồn tại không
      const [existingRows, existingFields] = await connection.execute(
        "SELECT * FROM `stafftype` WHERE IDStaffType = ?",
        [itemId]
      );

      if (!existingRows || existingRows.length === 0) {
        console.log("Loại nhân viên không tồn tại.");
        await connection.rollback();
        return res.status(404).json({ message: "Loại nhân viên không tồn tại." });
      }

      // Thực hiện xóa loại sản phẩm
      const [deleteRows, deleteFields] = await connection.execute(
        "DELETE FROM `stafftype` WHERE IDStaffType = ?",
        [itemId]
      );

      if (deleteRows.affectedRows > 0) {
        console.log("Loại nhân viên đã được xóa thành công.");
        await connection.commit();
        return res
          .status(200)
          .json({ message: "Loại nhân viên đã được xóa thành công." });
      } else {
        console.log("Không có bản ghi nào được xóa.");
        await connection.rollback();
        return res
          .status(500)
          .json({ message: "Không có bản ghi nào được xóa." });
      }
    } catch (error) {
      console.error("Lỗi xử lý yêu cầu DELETE:", error);
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

let getAdminV1StaffTypes = async (req, res) => {
  try {
      const [rows] = await pool.execute("SELECT IDStaffType as id, StaffTypeName as name FROM stafftype");
      res.json(rows);
  } catch (err) {
      console.error('Error fetching staff types', err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};
module.exports = {
    getAdminV1Staff,
    exportToExcel,
    getAdminV1StaffType,
    getAdminV1StafftypeCreate,
    getAdminV1StafftypeEdit,
    postAdminV1StafftypeCreate,
    postAdminV1StafftypeEdit,
    postAdminV1StafftypeDelete,
    getAdminV1StaffEdit,
    postAdminV1StaffEdit,
    getAdminV1StaffTypes
}