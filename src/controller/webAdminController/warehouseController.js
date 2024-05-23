    const pool = require("../../models/connectDB");
    const moment = require('moment');

    let getAdminV1Warehouse = async (req, res) => {
        try {
            let _page = req.query.page ? req.query.page : 1;
            let limit = 5;
            let start = (_page - 1) * limit;
            let name = req.query.name;
    
            // Get total number of items in the database
            const [total, fields] = await pool.execute("SELECT COUNT(*) AS total FROM warehouse");
            let totalRow = total[0].total;
    
            // Calculate total number of pages
            let totalPage = Math.ceil(totalRow / limit);
            if (name) {
                const [rows, fields] = await pool.execute(
                    "SELECT * FROM `warehouse` where `WarehouseName` like ? limit ? , ? ",
                    [`%${name}%`, start, limit]
                );
                // Định dạng lại ngày trước khi render
                const formattedRows = rows.map(row => {
                    return {
                        ...row,
                        DateCreated: moment(row.DateCreated).format('YYYY-MM-DD HH:mm:ss')
                    };
                });
                res.render("./Admin/warehouse/warehouse.ejs", {
                    dataUser: formattedRows ? formattedRows : [],
                    totalPage: totalPage,
                    page: parseInt(_page),
                });
            } else {
                const [rows, fields] = await pool.execute(
                    "SELECT * FROM `warehouse` limit " + start +" , " + limit );
                // Định dạng lại ngày trước khi render
                const formattedRows = rows.map(row => {
                    return {
                        ...row,
                        DateCreated: moment(row.DateCreated).format('YYYY-MM-DD HH:mm:ss')
                    };
                });
                res.render("./Admin/warehouse/warehouse.ejs", {
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

    let getAdminV1WarehouseDetail = async (req, res) => {
        try {
            let _page = req.query.page ? req.query.page : 1;
            let limit = 5;
            let start = (_page - 1) * limit;
            // let totalRow = 20;
            let name = req.query.name;
          
            // total tổng các item trong database
            const [total, fields] = await pool.execute(
              "select count(*) as total from warehousedetails"
            );
            let totalRow = total[0].total;
          
            // tong so trang
            let totalPage = Math.ceil(totalRow / limit);
          
            
            
            //
            if (name) {
              const [rows, fields] = await pool.execute(
                "SELECT * FROM `warehousedetails` where `IDWarehouse` like ? limit ? , ? ",
                [`%${name}%`, start, limit]
              );
              res.render("staff.ejs", {
                dataUser: rows ? rows : [],
                totalPage: totalPage,
                page: parseInt(_page),
              });
            } else {
              const [rows, fields] = await pool.execute("SELECT * FROM `warehousedetails` limit "+ start+"," +limit);
              res.render("./Admin/warehouse/warehousedetail.ejs", {
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

    let getAdminV1WarehouseCreate = async (req,res) =>{
        res.render("./Admin/warehouse/warehouseCreate.ejs")
    }

    let getAdminV1WarehouseEdit = async (req,res) =>{
        const itemId = req.params.id;
        const [rows, fields] = await pool.execute(
        "SELECT * FROM `warehouse` where IDWarehouse = ? ",
        [itemId]
        );
    
        res.render("./Admin/warehouse/warehouseEdit.ejs",{
            row: rows,
        })
    }

    let postAdminV1WarehouseCreate = async (req, res) => {
    try {
        const { WarehouseName, WarehouseAddress, DateCreated } = req.body;
        // Chỉ kiểm tra trùng lặp đối với tên nhà cung cấp và email
        const sqlCheckDuplicate = "SELECT * FROM warehouse WHERE WarehouseName = ?";
        const [duplicateRows] = await pool.execute(sqlCheckDuplicate, [WarehouseName]);
        if (duplicateRows.length > 0) {
            return res.status(409).json({ message: "Duplicate data found for Warehouse Name" });
        }

        const sqlInsert = "INSERT INTO warehouse (WarehouseName, WarehouseAddress, DateCreated) VALUES (?, ?, ?)";
        await pool.execute(sqlInsert, [WarehouseName, WarehouseAddress, DateCreated]);
        return res.status(201).json({ message: "Created Successfully" });
    } catch (error) {
        console.error('Error creating warehouse:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    };

    let postAdminV1WarehouseEdit = async (req, res) => {
    try {
        const itemId = req.params.id;
        const { WarehouseName, WarehouseAddress, DateCreated } = req.body;

        if (!WarehouseName || !WarehouseAddress || !DateCreated  || !itemId) {
        console.log("Thông tin không đủ hoặc không hợp lệ.");
        return res
            .status(400)
            .json({ message: "Thông tin không đủ hoặc không hợp lệ." });
        }
        const [rows, fields] = await pool.execute(
        "SELECT * FROM `warehouse` WHERE IDWarehouse = ?",
        [itemId]
        );

        if (!rows || rows.length === 0) {
        console.log("Kho không tồn tại.");
        return res.status(404).json({ message: "Kho không tồn tại." });
        }

        const [existingRows, existingFields] = await pool.execute(
        "SELECT * FROM `warehouse` WHERE WarehouseName = ?",
        [WarehouseName]
        );

        if (existingRows && existingRows.length > 0 && existingRows[0].IDWarehouse !== itemId) {
        console.log("Tên kho đã tồn tại.");
        return res.status(400).json({ message: "Tên kho đã tồn tại." });
        }

        const [updateRows, updateFields] = await pool.execute(
        "UPDATE `warehouse` SET WarehouseName = ?, WarehouseAddress = ?, DateCreated = ? WHERE IDWarehouse = ?",
        [WarehouseName, WarehouseAddress, DateCreated, itemId]
        );

        if (updateRows.affectedRows > 0) {
        console.log("Đã cập nhật thông tin kho thành công.");
        return res
            .status(200)
            .json({ message: "Đã cập nhật thông tin kho thành công." });
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


    let postAdminV1WarehouseDelete = async (req, res) => {
    const itemId = req.params.id;

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
        // Kiểm tra xem kho có tồn tại không
        const [existingRows, existingFields] = await connection.execute(
            "SELECT * FROM `warehouse` WHERE IDWarehouse = ?",
            [itemId]
        );

        if (!existingRows || existingRows.length === 0) {
            console.log("Kho không tồn tại.");
            await connection.rollback();
            return res.status(404).json({ message: "Kho không tồn tại." });
        }

        // Thực hiện xóa loại sản phẩm
        const [deleteRows, deleteFields] = await connection.execute(
            "DELETE FROM `warehouse` WHERE IDWarehouse = ?",
            [itemId]
        );

        if (deleteRows.affectedRows > 0) {
            console.log("Kho đã được xóa thành công.");
            await connection.commit();
            return res
            .status(200)
            .json({ message: "Kho đã được xóa thành công." });
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
        getAdminV1Warehouse ,
        getAdminV1WarehouseCreate ,
        getAdminV1WarehouseEdit ,
        postAdminV1WarehouseCreate,
        postAdminV1WarehouseEdit,
        postAdminV1WarehouseDelete,
        getAdminV1WarehouseDetail
        
    }