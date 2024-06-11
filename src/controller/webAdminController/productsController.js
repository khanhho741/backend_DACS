const pool = require("../../models/connectDB");
const { promisify } = require("util");
const getConnection = promisify(pool.getConnection).bind(pool);
const iconv = require("iconv-lite");

const postAdminV1ProductEdit = async (req, res) => {
  try {
    // Lấy các trường dữ liệu từ req.body
    const { productId, ProductName, Price, sale, radio, productType, Supplier, ProductDescription } = req.body;
    // Tiến hành cập nhật sản phẩm trong cơ sở dữ liệu
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Câu truy vấn SQL để cập nhật sản phẩm
      const updateProductQuery = `
        UPDATE product 
        SET 
          ProductName = ?, 
          ProductDescription = ?, 
          IDProductType = ?, 
          IDSupplier = ?, 
          Price = ?, 
          Sale = ?, 
          Status = ?
        WHERE IDProduct = ?
      `;
      await conn.query(updateProductQuery, [ProductName,ProductDescription,productType,Supplier,Price,sale,radio,productId]);

      // Commit transaction nếu mọi thứ thành công
      await conn.commit();
      conn.release();

      // Trả về phản hồi thành công
      res.status(200).json({ message: "Product updated successfully" });
    } catch (error) {
      // Rollback transaction nếu có lỗi xảy ra
      await conn.rollback();
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Internal Server Error - Transaction rollback" });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Internal Server Error - Database connection" });
  }
};


const postAdminV1ProductsCreate = async (req, res) => {
  console.log("This is the post create function.");
  try {
    const {
      ProductDescription,
      ProductName,
      Price,
      sale,
      productType,
      Supplier,
      radio,
    } = req.body;
    const { filename, NameReal, path } = req.file;
    console.log(req.file);
    console.log(req.body);

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Thêm sản phẩm vào bảng product
      const productQuery =
        "INSERT INTO product (ProductName, ProductDescription, IDProductType, IDSupplier, Price, Sale, Status) VALUES (?, ?, ?, ?, ?, ?, ?)";
      await conn.query(productQuery, [
        ProductName,
        ProductDescription,
        parseInt(productType),
        parseInt(Supplier),
        parseFloat(Price),
        parseFloat(sale),
        parseInt(radio),
      ]);

      // Lấy ID của sản phẩm vừa được thêm
      const productIdQuery = "SELECT LAST_INSERT_ID() as productId";
      const [productIdResult] = await conn.query(productIdQuery);
      const productId = productIdResult[0].productId;

      console.log("Inserting into the images table.");

      // Thêm hình ảnh vào bảng images
      const imageQuery =
        "INSERT INTO images (NameImages, UrlImages) VALUES (?, ?)";
      await conn.query(imageQuery, [NameReal, path]);

      // Lấy ID của hình ảnh vừa được thêm
      const imageIdQuery = "SELECT LAST_INSERT_ID() as imageId";
      const [imageIdResult] = await conn.query(imageIdQuery);
      const imageId = imageIdResult[0].imageId;

      console.log("Inserting into the productimagesdetails table.");

      // Thêm chi tiết hình ảnh sản phẩm vào bảng productimagesdetails
      const productImageQuery =
        "INSERT INTO productimagesdetails (IDImages, IDProduct) VALUES (?, ?)";
      await conn.query(productImageQuery, [imageId, productId]);

      console.log("Committing the transaction.");

      // Commit transaction nếu mọi thứ thành công
      await conn.commit();
      conn.release();
      res.status(200).json({ message: "Product created successfully" });
    } catch (error) {
      await conn.rollback();
      console.error("Error inserting data:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error - Transaction rollback" });
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error - Database connection" });
  }
};

let getAdminV1ProductsCreate = async (req, res) => {
  const [supplier, supplierFields] = await pool.execute(
    "select * from supplier"
  );
  const [categoryData, categoryDataFields] = await pool.execute(
    "select * from producttype"
  );
  const [rows, fields] = await pool.execute("SELECT * FROM `producttype`");
  if (rows.length <= 0) {
    res.render("./Admin/product/productCreate.ejs", {
      data: [],
      supplierData: supplier,
      categoryData: categoryData,
    });
  } else {
    res.render("./Admin/product/productCreate.ejs", {
      data: rows,
      supplierData: supplier,
      categoryData: categoryData,
    });
  }
};

let getAdminV1ProductsEdit = async (req, res) => {
  const productId = req.params.id;
  const [productRows, productFields] = await pool.execute(
    "SELECT * FROM product WHERE IDProduct = ?",
    [productId]
  );

  const [categoryRows, categoryFields] = await pool.execute(
    "SELECT * FROM `producttype`"
  );

  const [supplier, supplierFields] = await pool.execute(
    "select * from supplier"
  );

  const [productimagesdetails, productimagesdetailsFields] = await pool.execute(
    `
    select * from productimagesdetails where IDProduct = ?
  `,
    [productId]
  );

  const list_img = [];

  await Promise.all(
    productimagesdetails.map(async (element, index) => {
      const [image, imageDetail] = await pool.execute(
        `SELECT * FROM images WHERE IDImages = ?`,
        [productimagesdetails[index].IDImages]
      );
      list_img.push(...image);
    })
  );



  if (productRows.length > 0) {
    res.render("./Admin/product/productEdit.ejs", {
      productData: productRows[0],
      categoryData: categoryRows,
      supplierData: supplier,
      image: list_img,
    });
  } else {
    // Handle case when product is not found
    res.redirect("/admin/v1/product");
  }
};

let getAdminV1ProductsTypeEdit = async (req, res) => {
  const itemId = req.params.id;
  console.log("Đây là id: ", req.params.id);

  try {
    const [rows, fields] = await pool.execute(
      "SELECT * FROM `producttype` WHERE IDProductType = ?",
      [itemId]
    );

    // Kiểm tra xem truy vấn có lỗi không
    if (!rows || rows.length === 0) {
      console.log("Không tìm thấy dữ liệu hoặc lỗi truy vấn.");
      return res.json("Lỗi server hoặc không tìm thấy dữ liệu.");
    }

    // Dữ liệu tồn tại, render trang chỉnh sửa
    res.render("./Admin/product/productTypeEdit.ejs", {
      row: rows,
    });
  } catch (error) {
    console.error("Lỗi truy vấn SQL:", error);
    return res.json("Lỗi server.");
  }
};

let getAdminV1ProductsTypeCreate = async (req, res) => {
  res.render("./Admin/product/productTypeCreate.ejs");
};

const postAdminV1ProductsTypeEdit = async (req, res) => {
  try {
    const itemId = req.params.id;
    const { name, radio } = req.body;

    if (!name || !radio == undefined || !itemId) {
      console.log("Thông tin không đủ hoặc không hợp lệ.");
      return res
        .status(400)
        .json({ message: "Thông tin không đủ hoặc không hợp lệ." });
    }
    const [rows, fields] = await pool.execute(
      "SELECT * FROM `producttype` WHERE IDProductType = ?",
      [itemId]
    );

    if (!rows || rows.length === 0) {
      console.log("Loại sản phẩm không tồn tại.");
      return res.status(404).json({ message: "Loại sản phẩm không tồn tại." });
    }

    const [existingRows, existingFields] = await pool.execute(
      "SELECT * FROM `producttype` WHERE ProductTypeName = ?",
      [name]
    );

    if (
      existingRows &&
      existingRows.length > 0 &&
      existingRows[0].start == radio
    ) {
      console.log("Tên loại sản phẩm đã tồn tại.");
      return res.status(400).json({ message: "Tên loại sản phẩm đã tồn tại." });
    }
    if (
      existingRows &&
      existingRows.length > 0 &&
      existingRows[0].start == radio
    ) {
      const [updateRows, updateFields] = await pool.execute(
        "UPDATE `producttype` SET ProductTypeName = ?, Status = ? WHERE IDProductType = ?",
        [name, radio, itemId]
      );
      console.log("Đã cập nhật tên loại sản phẩm thành công.");
      return res
        .status(200)
        .json({ message: "Đã cập nhật tên loại sản phẩm thành công." });
    }

    const [updateRows, updateFields] = await pool.execute(
      "UPDATE `producttype` SET ProductTypeName = ?, Status = ? WHERE IDProductType = ?",
      [name, radio, itemId]
    );

    if (updateRows.affectedRows > 0) {
      console.log("Đã cập nhật tên loại sản phẩm thành công.");
      return res
        .status(200)
        .json({ message: "Đã cập nhật tên loại sản phẩm thành công." });
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

let postAdminV1ProductsTypeCreate = async (req, res) => {
  console.log(req.body);
  const { name, radio } = req.body;

  try {
    const [existingRows, existingFields] = await pool.execute(
      `SELECT * FROM producttype WHERE ProductTypeName = ?`,
      [name]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Product type with the same name already exists.",
      });
    }

    const [rows, fields] = await pool.execute(
      `INSERT INTO producttype (ProductTypeName, Status) VALUES (?, ?)`,
      [name, radio]
    );

    res
      .status(200)
      .json({ success: true, message: "Product type created successfully." });
  } catch (error) {
    console.error("Error creating product type:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create product type." });
  }
};

let getAdminV1ProductsType = async (req, res) => {
  let _page = req.query.page ? req.query.page : 1;
  let limit = 5;
  let start = (_page - 1) * limit;
  // let totalRow = 20;
  let name = req.query.name;
  // total tổng các item trong database
  const [total, fields] = await pool.execute(
    "select count(*) as total from producttype"
  );
  let totalRow = total[0].total;
  // tong so trang
  let totalPage = Math.ceil(totalRow / limit);
  //
  if (name) {
    const [rows, fields] = await pool.execute(
      "SELECT * FROM `producttype` where `ProductTypeName` like ? limit ? , ? ",
      [`%${ProductTypeName}%`, start, limit]
    );
    res.render("./Admin/product/productType.ejs", {
      dataUser: rows ? rows : [],
      totalPage: totalPage,
      page: parseInt(_page),
    });
  } else {
    const [rows, fields] = await pool.execute( "SELECT * FROM `producttype` limit " + start + "," + limit );
    res.render("./Admin/product/productType.ejs", {
      dataUser: rows ? rows : [],
      totalPage: totalPage,
      page: parseInt(_page),
    });
  }
};
let getAdminV1Products = async (req, res) => {
  try {
    let _page = req.query.page ? req.query.page : 1;
    let limit = 10;
    let start = (_page - 1) * limit;
    let name = req.query.name;

    // Tính tổng số sản phẩm trong database
    const [total, fields] = await pool.execute(
      "SELECT count(*) as total from product"
    );
    let totalRow = total[0].total;

    // Tính tổng số trang
    let totalPage = Math.ceil(totalRow / limit);

    if (name) {
      const [rows, fields] = await pool.execute(
        "SELECT p.*, c.*, s.SupplierName, i.UrlImages FROM product p JOIN category c ON p.IDProductType = c.IDProductType JOIN supplier s ON p.IDSupplier = s.IDSupplier LEFT JOIN productimagesdetails pid ON p.IDProduct = pid.IDProduct LEFT JOIN images i ON pid.IDImages = i.IDImages WHERE p.ProductTypeName LIKE ? LIMIT ?, ?",
        [`%${name}%`, start, limit]
      );

      res.render("ProductsAdmin.ejs", {
        dataProduct: rows ? rows : [],
        totalPage: totalPage,
        page: parseInt(_page),
      });
    } else {
      const [rows, fields] = await pool.execute(
        "SELECT p.*, c.*, s.SupplierName, i.UrlImages FROM product p JOIN producttype c ON p.IDProductType = c.IDProductType JOIN supplier s ON p.IDSupplier = s.IDSupplier LEFT JOIN productimagesdetails pid ON p.IDProduct = pid.IDProduct LEFT JOIN images i ON pid.IDImages = i.IDImages LIMIT ?, ?",
        [start, limit]
      );

      res.render("./Admin/product/product.ejs", {
        dataProduct: rows ? rows : [],
        totalPage: totalPage,
        page: parseInt(_page),
      });
    }
  } catch (error) {
    console.error("Error in gethomeControllerProduct:", error);
  }
};

let handleUploadFileCould = async (req, res) => {
  try {
  const { filename, NameReal, path } = req.files[0];
  const {id } = req.body

  // Dùng hàm decode của iconv-lite để chuyển đổi tên file sang định dạng đúng
  const correctName = await iconv.decode(
    Buffer.from(req.files[0].originalname, "binary"),
    "utf-8"
  );

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // Thêm hình ảnh vào bảng images
      const imageQuery =
        "INSERT INTO images (NameImages, UrlImages) VALUES (?, ?)";
      await conn.query(imageQuery, [correctName, path]);

      // Lấy ID của hình ảnh vừa được thêm
      const imageIdQuery = "SELECT LAST_INSERT_ID() as imageId";
      const [imageIdResult] = await conn.query(imageIdQuery);
      const imageId = imageIdResult[0].imageId;

      console.log("Inserting into the productimagesdetails table.");

      // Thêm chi tiết hình ảnh sản phẩm vào bảng productimagesdetails
      // Giả sử productId đã được truyền vào từ phía client
      const productId = req.body.productId; // Cần cập nhật dòng này để lấy ID sản phẩm từ client

      const productImageQuery =
        "INSERT INTO productimagesdetails (IDImages, IDProduct) VALUES (?, ?)";
      await conn.query(productImageQuery, [imageId, id]);

      console.log("Committing the transaction.");

      // Commit transaction nếu mọi thứ thành công
      await conn.commit();
      conn.release();
      res.status(200).json({ message: "Images uploaded successfully" });
    } catch (error) {
      await conn.rollback();
      console.error("Error inserting data:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error - Transaction rollback" });
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error - Database connection" });
  }
};



let handleDeleteFileCould = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { productId, publicId, imageUrl } = req.body;

    const[image,fieldsImage] = await pool.execute('select * from images where UrlImages = ? limit 1 ',[imageUrl])
   
    // Xóa chi tiết hình ảnh sản phẩm từ bảng productimagesdetails
    const deleteDetailsQuery = "DELETE FROM productimagesdetails WHERE IDProduct = ? and IDImages = ?";
    const detailsDeleteResult = await connection.query(deleteDetailsQuery, [productId,image[0].IDImages]);
   
    if (detailsDeleteResult[0].affectedRows > 0) {
      // Xóa hình ảnh từ bảng images
      const deleteImageQuery = "DELETE FROM images WHERE IDImages = ?";
      const imageDeleteResult = await connection.query(deleteImageQuery, [image[0].IDImages]);

      if (imageDeleteResult[0].affectedRows > 0) {
        // Commit transaction nếu cả hai bảng đều xóa thành công
        await connection.commit();
        res.status(200).json({ message: "Image and related details deleted successfully" });
      } else {
        // Rollback transaction nếu xóa hình ảnh từ bảng images thất bại
        await connection.rollback();
        res.status(500).json({ message: "Failed to delete image" });
      }
    } else {
      // Rollback transaction nếu xóa chi tiết hình ảnh sản phẩm thất bại
      await connection.rollback();
      res.status(500).json({ message: "Failed to delete product image details" });
    }
  } catch (error) {
    console.error("Error deleting image and details:", error);
    // Rollback transaction nếu có lỗi xảy ra trong quá trình xóa
    await connection.rollback();
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    // Release connection sau khi sử dụng
    connection.release();
  }
};

const deleteAdminV1Product = async (req, res) => {
  const productId = req.params.id;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Kiểm tra xem sản phẩm có tồn tại không
      const [existingRows, existingFields] = await connection.execute(
        "SELECT * FROM `product` WHERE IDProduct = ?",
        [productId]
      );

      if (!existingRows || existingRows.length === 0) {
        console.log("Sản phẩm không tồn tại.");
        await connection.rollback();
        return res.status(404).json({ message: "Sản phẩm không tồn tại." });
      }

      // Thực hiện xóa sản phẩm
      const [deleteRows, deleteFields] = await connection.execute(
        "DELETE FROM `product` WHERE IDProduct = ?",
        [productId]
      );

      if (deleteRows.affectedRows > 0) {
        console.log("Sản phẩm đã được xóa thành công.");
        await connection.commit();
        return res
          .status(200)
          .json({ message: "Sản phẩm đã được xóa thành công." });
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

const deleteAdminV1ProductsType = async (req, res) => {
  const itemId = req.params.id;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Kiểm tra xem loại sản phẩm có tồn tại không
      const [existingRows, existingFields] = await connection.execute(
        "SELECT * FROM `producttype` WHERE IDProductType = ?",
        [itemId]
      );

      if (!existingRows || existingRows.length === 0) {
        console.log("Loại sản phẩm không tồn tại.");
        await connection.rollback();
        return res.status(404).json({ message: "Loại sản phẩm không tồn tại." });
      }

      // Thực hiện xóa loại sản phẩm
      const [deleteRows, deleteFields] = await connection.execute(
        "DELETE FROM `producttype` WHERE IDProductType = ?",
        [itemId]
      );

      if (deleteRows.affectedRows > 0) {
        console.log("Loại sản phẩm đã được xóa thành công.");
        await connection.commit();
        return res
          .status(200)
          .json({ message: "Loại sản phẩm đã được xóa thành công." });
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




module.exports = {
  getAdminV1Products,
  getAdminV1ProductsType,
  getAdminV1ProductsEdit,
  getAdminV1ProductsCreate,
  getAdminV1ProductsTypeEdit,
  getAdminV1ProductsTypeCreate,
  postAdminV1ProductsTypeCreate,
  postAdminV1ProductsTypeEdit,

  postAdminV1ProductEdit,
  postAdminV1ProductsCreate,
  deleteAdminV1Product,
  deleteAdminV1ProductsType,
  handleUploadFileCould,
  handleDeleteFileCould
  

};
