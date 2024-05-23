const pool = require("../../models/connectDB")

const getShop = async (req, res) => {
  let _page = req.query.page ? parseInt(req.query.page) : 1;
  let limit = 12;
  let start = (_page - 1) * limit;
  const [totalProduct, totalFields] = await pool.execute(`SELECT count(*) as total FROM product`);
  const totalPage = Math.ceil(totalProduct[0].total / limit);

  // Tìm kiếm
  let searchQuery = "";
  let searchParams = [];
  if (req.query.search) {
      searchQuery = " WHERE ProductName LIKE ?";
      searchParams.push('%' + req.query.search + '%');
  }

  // Lọc theo giá
  let priceOrder = "";
  if (req.query.orderby === "price") {
      priceOrder = " ORDER BY Price ASC";
  } else if (req.query.orderby === "price-desc") {
      priceOrder = " ORDER BY Price DESC";
  }

  // Lọc theo ngày
  let idOrder = "";
  if (req.query.orderby === "date") {
      idOrder = " ORDER BY IDProduct DESC";
  }

  try {
      let query = `SELECT * FROM product ${searchQuery} ${priceOrder} ${idOrder} LIMIT ?, ?`;
      if (searchQuery && totalProduct[0].total === 1) {
          query = `SELECT * FROM product ${searchQuery}`;
          const [rows, fields] = await pool.execute(query, searchParams);
          res.render("./Client/shop.ejs", { 
              products: rows ? rows : [],
              totalPage: totalPage,
              page: _page,
              orderby: req.query.orderby 
          });
      } else {
          const [rows, fields] = await pool.execute(query, [...searchParams, start, limit]);
          await Promise.all(rows.map(async (element, index) => {
              const [detailiImage, detailImageFields] = await pool.execute('select * from productimagesdetails where IDProduct = ' + [element.IDProduct] + ' limit 1 ');
              const [image, imageFields] = await pool.execute("select * from images where IDImages = " + [detailiImage[0].IDImages] + " limit 1 ");
              const [nameSupplier, nameSupplierFields] = await pool.execute("select * from supplier where IDSupplier = " + [element.IDSupplier]);
              rows[index].url = image[0].UrlImages;
              rows[index].SupplierName = nameSupplier[0].SupplierName;
              rows[index].PriceVND = (element.Price * 23000).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
          }));
          res.render("./Client/shop.ejs", { 
              products: rows ? rows : [],
              totalPage: totalPage,
              page: _page > totalPage ? totalPage : _page,
              orderby: req.query.orderby 
          });
      }
  } catch (error) {
      console.error("Error retrieving products:", error);
      res.status(500).send("Internal Server Error");
  }
};
module.exports ={
    getShop
}