const pool = require("../../models/connectDB");
const moment = require('moment');
const axios = require("axios");
let postCheckout = async (req, res, next) => {
  try {
    const {
      tenKhachHang,
      soDienThoai,
      diaChi,
      totalPrice,
      cartItems,
      tongsoluong,
    } = req.body;

    let totalPriceDb = 0;
    const [user, userFields] = await pool.execute(
      "select * from user where Username = ? ",
      [req.payload.userID.trim()]
    );

    if (user.length > 0) {
      if (cartItems) {
        Promise.all(
          cartItems.map((item) => {
            return new Promise(async (resolve, reject) => {
              try {
                const [products, FieldProducts] = await pool.execute(
                  "select * from product where IDProduct = ?",
                  [item.IDProduct]
                );
                totalPriceDb += item.soluong * products[0].Price;
                resolve(products[0]);
              } catch (error) {
                reject(error);
              }
            });
          })
        )
          .then((list_product) => {
            if (parseFloat(totalPriceDb) === parseFloat(totalPrice)) {
              req.user = user[0];
              next();
            } else {
              return res.status(403).json({
                message:
                  "vui lòng ko thay đổi thông tin giá sản phẩm khi thanh toán",
              });
            }
          })
          .catch((error) => {});
      }
    }
  } catch (error) {
    if (error.status && error.message) {
      res.status(error.status).json({ message: error.message });
    } else {
      next(error);
    }
  }
};

let getCheckout = (req, res) => {
  res.render("./Client/checkout.ejs");
};

let postCheckout2 = async (req, res , next) => {
  let connection;
  try {
    // Lấy kết nối từ pool
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      tenKhachHang,
      soDienThoai,
      diaChi,
      totalPrice,
      cartItems,
      tongsoluong,
      paymentMethod,
    } = req.body;
    const { Username, Email, Password, Check, id } = req.user;

    const [customer, customerFields] = await connection.execute(
      "SELECT * FROM customer WHERE Username = ?",
      [Username]
    );
    if (paymentMethod === "cash") {
      if (customer.length > 0) {
        const currentDate = new Date().toISOString().slice(0, 10);

        // Thêm thông tin hóa đơn vào bảng invoice
        const [invoiceResult] = await connection.execute(
          "INSERT INTO invoice (IDCustomer, IDStaff , DateCreated, Status) VALUES (?, ?, ?, ?)",
          [customer[0].IDCustomer, null, currentDate, 1]
        );
        const invoiceId = invoiceResult.insertId;

        // Thêm thông tin chi tiết hóa đơn vào bảng invoiceDetail
        for (const item of cartItems) {
          await connection.execute(
            "INSERT INTO invoicedetails (IDInvoice , IDProduct, TotalQuantity, Price) VALUES (?, ?, ?, ?)",
            [
              invoiceId,
              item.IDProduct,
              parseInt(item.soluong) * parseInt(item.Price),
              item.Price,
            ]
          );
        }

        // Thêm thông tin vận chuyển vào bảng deliveryNotes
        await connection.execute(
          "INSERT INTO deliverynotes (IDInvoice,DateCreated,DeliveryAddress,RecipientPhone,Status,IDStaff) VALUES (?,?,?,?,?,?)",
          [invoiceId, currentDate, diaChi, soDienThoai, 1, null]
        );

        // Commit giao dịch
        await connection.commit();

        return res.status(200).json({ message: "thanh toán thành công" });
      } else {
        return res
          .status(500)
          .json({ message: "Đã xảy ra lỗi trong quá trình thanh toán" });
      }
    } else {
      // thanh toan online
      next()
    }
  } catch (error) {
    // Nếu có lỗi xảy ra, rollback giao dịch
    if (connection) {
      await connection.rollback();
    }
    console.error("Error during transaction:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình thanh toán" });
  } finally {
    // Đảm bảo trả kết nối về pool sau khi sử dụng
    if (connection) {
      connection.release();
    }
  }
};


let thanhtoanonline = async (req, res) => {
  try {



    process.env.TZ = 'Asia/Ho_Chi_Minh';
    
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    
    let ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
 
    const config = require("../../../config/default.json")
    let tmnCode = config.vnp_TmnCode
    let secretKey = config.vnp_HashSecret
    let vnpUrl = config.vnp_Url
    let returnUrl = config.vnp_ReturnUrl
    
    let orderId = moment(date).format('DDHHmmss');
    let amount = 1000;
    let bankCode = "VNPAYQR";
    
    let locale = req.body.language;
    if(locale === null || locale === ''){
        locale = 'vn';
    }
    let currCode = 'VND';
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount ;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    if(bankCode !== null && bankCode !== ''){
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require("crypto");     
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex"); 
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
    console.log("123")
    res.redirect("http://localhost:8082/home")
    
  } catch (error) {
    console.error("Error during transaction:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình thanh toán" });
  }
};



function sortObject(obj) {
	let sorted = {};
	let str = [];
	let key;
	for (key in obj){
		if (obj.hasOwnProperty(key)) {
		str.push(encodeURIComponent(key));
		}
	}
	str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}




module.exports = {
  getCheckout,
  postCheckout,
  postCheckout2,
  thanhtoanonline,
};
