const pool = require("../../models/connectDB");
    const moment = require('moment');

    let getAdminV1Imported = async (req, res) => {
        try {
            let _page = req.query.page ? req.query.page : 1;
            let limit = 5;
            let start = (_page - 1) * limit;
            let name = req.query.name;
    
            // Get total number of items in the database
            const [total, fields] = await pool.execute("SELECT COUNT(*) AS total FROM `imported products`");
            let totalRow = total[0].total;
    
            // Calculate total number of pages
            let totalPage = Math.ceil(totalRow / limit);
            if (name) {
                const [rows, fields] = await pool.execute(
                    "SELECT * FROM `imported products` where `IDImportedProducts` like ? limit ? , ? ",
                    [`%${name}%`, start, limit]
                );
                // Định dạng lại ngày trước khi render
                const formattedRows = rows.map(row => {
                    return {
                        ...row,
                        DateCreated: moment(row.DateCreated).format('YYYY-MM-DD HH:mm:ss')
                    };
                });
                res.render("./Admin/imported/imported.ejs", {
                    dataUser: formattedRows ? formattedRows : [],
                    totalPage: totalPage,
                    page: parseInt(_page),
                });
            } else {
                const [rows, fields] = await pool.execute(
                    "SELECT * FROM `imported products` limit " + start +" , " + limit );
                // Định dạng lại ngày trước khi render
                const formattedRows = rows.map(row => {
                    return {
                        ...row,
                        DateCreated: moment(row.DateCreated).format('YYYY-MM-DD HH:mm:ss')
                    };
                });
                res.render("./Admin/imported/imported.ejs", {
                    dataUser: formattedRows ? formattedRows : [],
                    totalPage: totalPage,   
                    page: parseInt(_page),
                });
            }
        } catch (err) {
            console.error('Error executing query', err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    let getAdminV1ImportedCreate = async (req,res) =>{
      const [staff, staffFields] = await pool.execute(
        "select * from staff"
      );
      const [warehouse,warehouseFields] = await pool.execute(
        "select * from warehouse"
      );
      const [rows, fields] = await pool.execute("SELECT * FROM `staff`");
      if (rows.length <= 0) {
        res.render("./Admin/imported/importedCreate.ejs", {
          data: [],
          staffData: staff,
          warehouseData: warehouse,
        });
      } else {
        res.render("./Admin/imported/importedCreate.ejs", {
          data: rows,
          staffData: staff,
          warehouseData: warehouse,
        });
      }
    }

    let getAdminV1ImportedEdit = async (req,res) =>{
        const itemId = req.params.id;
        const [staff, staffFields] = await pool.execute(
          "select * from staff"
        );
        const [warehouse,warehouseFields] = await pool.execute(
          "select * from warehouse"
        );
        const [rows, fields] = await pool.execute(
          "SELECT * FROM `imported products` where IDImportedProducts = ? ",
          [itemId]
        );
      
        if (rows.length <= 0) {
          res.render("./Admin/imported/importedEdit.ejs", {
            data: [],
            staffData: staff,
            warehouseData: warehouse,
          });
        } else {
          res.render("./Admin/imported/importedEdit.ejs", {
            data: rows,
            staffData: staff,
            warehouseData: warehouse,
          });
        }
    }

    
    let postAdminV1ImportedCreate = async (req, res) => {
        try {
            const { IDStaff, IDWarehouse } = req.body;
            const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
            const sqlInsert = "INSERT INTO `imported products` (IDStaff, IDWarehouse, DateCreated) VALUES (?, ?, ?)";
            await pool.execute(sqlInsert, [IDStaff, IDWarehouse,currentDate]);
            return res.status(201).json({ message: "Created Successfully" });
        } catch (error) {
            console.error('Error creating imported:', error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    };
  
    let postAdminV1ImportedEdit = async (req, res) => {
        try {
          const itemId = req.params.id;
          const { IDStaff, IDWarehouse }  = req.body;
          const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
      
          if (!IDStaff || !itemId || !IDWarehouse) {
            console.log("Thông tin không đủ hoặc không hợp lệ.");
            return res
              .status(400)
              .json({ message: "Thông tin không đủ hoặc không hợp lệ." });
          }
          
          const [rows] = await pool.execute(
            "SELECT * FROM `imported products` WHERE IDImportedProducts = ?",
            [itemId]
          );
      
          if (!rows || rows.length === 0) {
            console.log("Phiếu nhập không tồn tại.");
            return res.status(404).json({ message: "Phiếu nhập không tồn tại." });
          }
      
          const [updateRows] = await pool.execute(
            "UPDATE `imported products` SET IDStaff = ?, IDWarehouse = ?, DateCreated = ? WHERE IDImportedProducts = ?",
            [IDStaff, IDWarehouse, currentDate, itemId]
          );
      
          if (updateRows.affectedRows > 0) {
            console.log("Đã cập nhật thông tin phiếu nhập thành công.");
            return res
              .status(200)
              .json({ message: "Đã cập nhật thông tin phiếu nhập thành công." });
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
  
  let postAdminV1ImportedDelete = async (req, res) => {
    const itemId = req.params.id;
  
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
  
      try {
        // Kiểm tra xem loại sản phẩm có tồn tại không
        const [existingRows, existingFields] = await connection.execute(
          "SELECT * FROM `imported products` WHERE IDImportedProducts = ?",
          [itemId]
        );
  
        if (!existingRows || existingRows.length === 0) {
          console.log("Phiếu nhập không tồn tại.");
          await connection.rollback();
          return res.status(404).json({ message: "Phiếu nhập không tồn tại." });
        }
  
        // Thực hiện xóa loại sản phẩm
        const [deleteRows, deleteFields] = await connection.execute(
          "DELETE FROM `imported products` WHERE IDImportedProducts = ?",
          [itemId]
        );
  
        if (deleteRows.affectedRows > 0) {
          console.log("Phiếu nhập đã được xóa thành công.");
          await connection.commit();
          return res
            .status(200)
            .json({ message: "Phiếu nhập đã được xóa thành công." });
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
    


    module.exports ={
        getAdminV1Imported,
        getAdminV1ImportedCreate,
        getAdminV1ImportedEdit,
        postAdminV1ImportedCreate,
        postAdminV1ImportedEdit,
        postAdminV1ImportedDelete,
    }