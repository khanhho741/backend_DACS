const pool = require("../../models/connectDB");

let getHome = async (req, res) => {
    let limit = 18; // Set the limit for the number of products to display on the home page

    // Tìm kiếm (Search)
    let searchQuery = "";
    let searchParams = [];
    if (req.query.search) {
        searchQuery = " WHERE ProductName LIKE ?";
        searchParams.push('%' + req.query.search + '%');
    }

    // Lọc theo giá (Price order)
    let priceOrder = "";
    if (req.query.orderby === "price") {
        priceOrder = " ORDER BY Price ASC";
    } else if (req.query.orderby === "price-desc") {
        priceOrder = " ORDER BY Price DESC";
    }

    // Lọc theo ngày (Date order)
    let dateOrder = "";
    if (req.query.orderby === "date") {
        dateOrder = " ORDER BY IDProduct DESC";
    }

    try {
        // Construct query with search and order filters
        let query = `SELECT * FROM product ${searchQuery} ${priceOrder} ${dateOrder} LIMIT ?`;
        const [products, fields] = await pool.execute(query, [...searchParams, limit]);

        // Process product images and supplier names (if necessary)
        await Promise.all(products.map(async (element, index) => {
            const [detailImage] = await pool.execute('SELECT * FROM productimagesdetails WHERE IDProduct = ? LIMIT 1', [element.IDProduct]);
            const [image] = await pool.execute('SELECT * FROM images WHERE IDImages = ? LIMIT 1', [detailImage[0].IDImages]);
            const [nameSupplier] = await pool.execute('SELECT * FROM supplier WHERE IDSupplier = ? LIMIT 1', [element.IDSupplier]);
            
            // Attach additional information to each product
            products[index].url = image[0].UrlImages;
            products[index].SupplierName = nameSupplier[0].SupplierName;
            products[index].PriceVND = (element.Price * 23000).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
        }));

        // Render the products in home.ejs
        res.render('./Client/home.ejs', { products });
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).send("Internal Server Error");
    }
}
let getLatestProducts = async (req, res) => {
    try {
        // Query to get the 8 latest products based on ID
        let query = "SELECT * FROM product ORDER BY IDProduct DESC LIMIT 8";
        
        // Using await with pool.promise().query() for promise-based MySQL queries
        const [productnew, fields] = await pool.promise().query(query);

        // Process product images and supplier names (if necessary)
        await Promise.all(productnew.map(async (element, index) => {
            const [detailImage, detailImageFields] = await pool.execute('SELECT * FROM productimagesdetails WHERE IDProduct = ? LIMIT 1', [element.IDProduct]);
            const [image, imageFields] = await pool.execute('SELECT * FROM images WHERE IDImages = ? LIMIT 1', [detailImage[0].IDImages]);
            const [nameSupplier, nameSupplierFields] = await pool.execute('SELECT * FROM supplier WHERE IDSupplier = ? LIMIT 1', [element.IDSupplier]);
            productnew[index].url = image[0].UrlImages;
            productnew[index].SupplierName = nameSupplier[0].SupplierName;
            productnew[index].PriceVND = (element.Price * 23000).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
        }));

        // Render the products in latestProducts.ejs
        res.render('./Client/home.ejs', { products });
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).send("Internal Server Error");
    }
}
module.exports = {
    getHome,
    getLatestProducts
};