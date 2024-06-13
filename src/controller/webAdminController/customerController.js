const pool = require("../../models/connectDB");
const XLSX = require('xlsx');

let getAdminV1Customers = async (req, res) => {
    try {
        let _page = req.query.page ? req.query.page : 1;
        let limit = 5;
        let start = (_page - 1) * limit;
        // let totalRow = 20;
        let name = req.query.name;
      
        // total tổng các item trong database
        const [total, fields] = await pool.execute(
          "select count(*) as total from customer"
        );
        let totalRow = total[0].total;
      
        // tong so trang
        let totalPage = Math.ceil(totalRow / limit);
      
        
        
        //
        if (name) {
          const [rows, fields] = await pool.execute(
            "SELECT * FROM `customer` where `username` like ? limit ? , ? ",
            [`%${name}%`, start, limit]
          );
          res.render("customer.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,
            page: parseInt(_page),
          });
        } else {
          const [rows, fields] = await pool.execute("SELECT * FROM `customer` limit "+ start+"," +limit);
          res.render("./Admin/accounts/customer.ejs", {
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

let getAdminV1CustomersView = async (req, res) => {
  const itemId = req.params.id;
  try {
      const [rows] = await pool.execute(
          "SELECT * FROM `customer` WHERE IDCustomer = ?",
          [itemId]
      );

      if (rows.length > 0) {
          res.render("./Admin/accounts/customerview.ejs", {
              row: rows[0]
          });
      } else {
          res.status(404).json({ message: "customer member not found." });
      }
  } catch (err) {
      console.error('Error fetching customer data', err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
}


let exportToExcel = async (req, res) => {
    try {
        const [rows, fields] = await pool.execute("SELECT * FROM `customer`");

        // Tạo một đối tượng Workbook mới
        let wb = XLSX.utils.book_new();

        // Tạo một sheet từ dữ liệu rows
        let ws = XLSX.utils.json_to_sheet(rows);

        // Thêm sheet vào Workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');

        // Chuyển workbook thành một buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Thiết lập header của phản hồi
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');

        // Gửi buffer của tệp Excel như là phản hồi
        res.send(buffer);
    } catch (err) {
        console.error('Error exporting Excel file', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}


module.exports = {
    getAdminV1Customers,
    exportToExcel,
    getAdminV1CustomersView
}