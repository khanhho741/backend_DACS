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

    module.exports ={
        getAdminV1Imported ,
    
        
    }