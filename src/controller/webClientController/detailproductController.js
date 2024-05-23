const pool = require("../../models/connectDB")

const getDetailProduct = async (req, res) => {
    try {
        const productId = req.params.productId; // Lấy productId từ URL
        // Truy vấn để lấy thông tin sản phẩm dựa trên productId
        const [productDetail, productDetailFields] = await pool.execute(
            "SELECT * FROM product WHERE IDProduct = ?",
            [productId]
        );

        if (productDetail.length === 0) {
            // Nếu không tìm thấy sản phẩm, trả về trang 404 hoặc thông báo không tìm thấy sản phẩm
            return res.status(404).send("Product not found");
        }

        // Lấy IDProductType từ chi tiết sản phẩm
        const productTypeId = productDetail[0].IDProductType;

        // Truy vấn để lấy thông tin loại sản phẩm dựa trên IDProductType
        const [producttype, productTypeFields] = await pool.execute(
            "SELECT * FROM producttype WHERE IDProductType = ? LIMIT 1",
            [productTypeId]
        );

        // Truy vấn để lấy hình ảnh chi tiết của sản phẩm
        const [detailImage, detailImageFields] = await pool.execute(
            "SELECT * FROM productimagesdetails WHERE IDProduct = ? LIMIT 1",
            [productId]
        );


        // Truy vấn để lấy tên nhà cung cấp của sản phẩm
        const [supplierInfo, supplierInfoFields] = await pool.execute(
            "SELECT * FROM supplier WHERE IDSupplier = ?",
            [productDetail[0].IDSupplier]
        );

        // Render trang detail sản phẩm
        res.render("./Client/detailproduct.ejs", {
            product: productDetail,
            producttype: producttype,
            detailImage: detailImage[0],
            supplierInfo: supplierInfo,
        });
    } catch (error) {
        console.error("Error retrieving product detail:", error);
        res.status(500).send("Internal Server Error");
    }
};
  
  module.exports = {
    getDetailProduct,
  };