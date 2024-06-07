const pool = require("../../models/connectDB");

let getAdminV1Dashboard = async (req, res) => {
    try {
        const [totalRevenueRows, totalRevenueFields] = await pool.execute(`
            SELECT SUM(TotalQuantity * Price) AS totalRevenue 
            FROM invoicedetails 
            INNER JOIN invoice ON invoicedetails.IDInvoice = invoice.IDInvoice 
            WHERE invoice.Status = 2
        `);

        const totalRevenue = totalRevenueRows[0].totalRevenue || 0;

        res.render('./Admin/dashboard/Dashboard.ejs', {
            totalRevenue: totalRevenue
        });
    } catch (err) {
        console.error('Error getting total revenue', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = {
    getAdminV1Dashboard
};
