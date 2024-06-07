const pool = require("../../models/connectDB");
const XLSX = require('xlsx');

let getAdminV1Invoices = async (req, res) => {
    try {
        let _page = req.query.page ? req.query.page : 1;
        let limit = 5;
        let start = (_page - 1) * limit;
        // let totalRow = 20;
        let name = req.query.name;
      
        // total tổng các item trong database
        const [total, fields] = await pool.execute(
          "select count(*) as total from invoice"
        );
        let totalRow = total[0].total;
      
        // tong so trang
        let totalPage = Math.ceil(totalRow / limit);
      
        // get all staff
        const [staff,staffField] = await pool.execute("select * from staff")
        
        //
        if (name) {
          const [rows, fields] = await pool.execute(
            "SELECT * FROM `invoice` where `IDInvoice` like ? limit ? , ? ",
            [`%${name}%`, start, limit]
          );
          res.render("invoice.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,
            page: parseInt(_page),
            totalStaff : staff
          });
        } else {
          const [rows, fields] = await pool.execute("SELECT * FROM `invoice` limit "+ start+"," +limit);
          res.render("./Admin/invoice/invoice.ejs", {
            dataUser: rows ? rows : [],
            totalPage: totalPage,   
            page: parseInt(_page),
            totalStaff : staff
          });
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

let exportToExcel = async (req, res) => {
    try {
        const [rows, fields] = await pool.execute("SELECT * FROM `invoice`");

        // Tạo một đối tượng Workbook mới
        let wb = XLSX.utils.book_new();

        // Tạo một sheet từ dữ liệu rows
        let ws = XLSX.utils.json_to_sheet(rows);

        // Thêm sheet vào Workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

        // Chuyển workbook thành một buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Thiết lập header của phản hồi
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');

        // Gửi buffer của tệp Excel như là phản hồi
        res.send(buffer);
    } catch (err) {
        console.error('Error exporting Excel file', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

let upgrade_to_one_from_two = async (req, res) => {
  const { idInvoice, idStaff } = req.body;
  console.log(req.body)
  const newStatus = 2; // Trạng thái mới

  const connection = await pool.getConnection();

  try {
      await connection.beginTransaction();

      // Cập nhật bảng invoice
      await connection.execute("UPDATE `invoice` SET `Status` = ?, `IDStaff` = ? WHERE `IDInvoice` = ?",[newStatus, idStaff, idInvoice]);

      // Cập nhật bảng deliverynotes
      await connection.execute(
        "UPDATE `deliverynotes` SET `Status` = ?, `IDStaff` = ? WHERE `IDInvoice` = ?",
        [newStatus, idStaff, idInvoice]
    );
    
      await connection.commit();
      res.status(200).json({ message: 'Update successful' });

  } catch (err) {
      await connection.rollback();
      console.error('Error executing transaction', err);
      res.status(500).json({ message: 'Internal Server Error' });
  } finally {
      connection.release();
  }
}

module.exports = {
    getAdminV1Invoices,
    exportToExcel , 
    upgrade_to_one_from_two

}