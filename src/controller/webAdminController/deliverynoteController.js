const pool = require("../../models/connectDB");

let getDeliveryNote = async (req, res) => {
    try {
        let _page = req.query.page ? req.query.page : 1;
        let limit = 5;
        let start = (_page - 1) * limit;

        // Lấy tổng số dòng trong bảng deliverynotes
        const [total, deliverynotesfields] = await pool.execute(
            "select count(*) as total from deliverynotes"
        );
        let totalRow = total[0].total;

        // Tính tổng số trang
        let totalPage = Math.ceil(totalRow / limit);

        // Lấy dữ liệu từ bảng deliverynotes với phân trang
        const [rows, fields] = await pool.execute("SELECT * FROM `deliverynotes` limit "+  `${start} , ${limit}`);

        // Render ra giao diện
        res.render("./Admin/deliverynotes/deliverynote.ejs", {
            dataDelivery: rows ? rows : [],
            totalPage: totalPage,
            page: parseInt(_page)
        });

    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

let postDeliveryNote = async (req, res) => {
    const { idDeliveryNotes, idInvoice, status } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Cập nhật bảng deliverynotes
        await connection.execute("UPDATE `deliverynotes` SET `Status` = ? WHERE `IdDeliveryNotes` = ?", [status, idDeliveryNotes]);

        // Cập nhật bảng invoice
        await connection.execute("UPDATE `invoice` SET `Status` = ? WHERE `IDInvoice` = ?", [status, idInvoice]);

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
    getDeliveryNote , 
    postDeliveryNote
}