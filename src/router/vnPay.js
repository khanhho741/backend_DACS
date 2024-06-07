const express = require("express");
const moment = require("moment");
const { encrypt } = require("../utils/helpers");
const middlewareCheckout = require("../controller/webClientController/checkoutController");
const { verifyAccessTokenCheckout } = require("../utils/jwt_services");
const pool = require("../models/connectDB");
const querystring = require("qs");
const crypto = require("crypto");

const router = express.Router();

router.post(
  "/create_payment_url",
  verifyAccessTokenCheckout,
  middlewareCheckout.postCheckout,
  async function (req, res, next) {
    process.env.TZ = "Asia/Ho_Chi_Minh";

    let date = new Date();
    let createDate = moment(date).format("YYYYMMDDHHmmss");

    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    const config = require("../../config/default.json");
    let tmnCode = config.vnp_TmnCode;
    let secretKey = config.vnp_HashSecret;
    let vnpUrl = config.vnp_Url;
    let returnUrl = config.vnp_ReturnUrl;

    let orderId = moment(date).format("DDHHmmss");
    let amount = 10000;
    let bankCode = "";

    let locale = "vn";
    if (locale === null || locale === "") {
      locale = "vn";
    }
    let currCode = "VND";
    let vnp_Params = {};

    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = tmnCode;
    vnp_Params["vnp_Locale"] = locale;
    vnp_Params["vnp_CurrCode"] = currCode;
    vnp_Params["vnp_TxnRef"] = orderId;
    vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + orderId;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = amount * req.payload.info.totalPrice;
    vnp_Params["vnp_ReturnUrl"] = returnUrl;
    vnp_Params["vnp_IpAddr"] = ipAddr;
    vnp_Params["vnp_CreateDate"] = createDate;

    if (bankCode !== null && bankCode !== "") {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;
    vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });

    // lưu vô database
    const order = JSON.stringify(req.payload.info);
    const orderUser = JSON.stringify(req.payload.infoUser);

    let encryptedOrder = encrypt(order, secretKey);
    let encryptedOrderUser = encrypt(orderUser, secretKey);

    console.log(vnp_Params);
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.execute(
        `
          INSERT INTO tamthoi (tenKhachHang, soDienThoai, diaChi, totalPrice, cartItems,
            tongsoluong, idUser, secretKey,transactionCode) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ? , ?)`,
        [
          req.payload.info.firstname,
          req.payload.info.email,
          req.payload.info.address,
          req.payload.info.totalPrice,
          JSON.stringify(req.payload.info.cartItems),
          req.payload.info.tongsoluong,
          req.payload.infoUser.Username,
          secretKey,
          orderId,
        ]
      );

      await connection.commit();
      connection.release();
      res.redirect(vnpUrl);
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error inserting into database:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);

router.get("/vnpay_return", async function (req, res, next) {
  console.log(req.query);

  let vnp_Params = req.query;

  console.log(vnp_Params);

  let secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  let config = require("../../config/default.json");
  let tmnCode = config.vnp_TmnCode;
  let secretKey = config.vnp_HashSecret;

  let signData = querystring.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  console.log("get vnpay_return");
  console.log(vnp_Params);

  // Lấy mã giao dịch từ vnp_Params
  let transactionCode = vnp_Params["vnp_TxnRef"];
  let connection;

  if (
    secureHash === signed &&
    vnp_Params["vnp_ResponseCode"] === "00" &&
    vnp_Params["vnp_TransactionStatus"] === "00"
  ) {
    try {
      // lay ket noi tu pool
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [rows, fields] = await connection.execute(
        `SELECT * FROM tamthoi WHERE secretKey = ? AND transactionCode = ?`,
        [secretKey, transactionCode]
      );
      console.log(rows[0]);
      const value = JSON.parse(JSON.parse(rows[0].cartItems));
      if (rows.length > 0) {
        const transaction = rows[0];
        if (transaction.isProcessed) {
          res.render("./Client/success", { code: "97" });
        } else {
          await connection.execute(
            `
            UPDATE tamthoi SET isProcessed = 1 WHERE secretKey = ? AND transactionCode = ?`,
            [secretKey, transactionCode]
          );

          // update table invoice , detailInvoice , deliverynotes

          // customer
          const [customerExists] = await connection.execute(
            "select * from customer where Username = ? ",
            [rows[0].idUser]
          );

          if (customerExists.length === 0) {
            await connection.rollback();
            throw new Error("Customer not found");
          }

          //invoice
          const currentDate = new Date().toISOString().slice(0, 10);
          const [invoiceResult] = await connection.execute(
            "INSERT INTO invoice (IDCustomer, IDStaff, DateCreated, Status) VALUES (?, ?, ?, ?)",
            [customerExists[0].IDCustomer, null, currentDate, 1]
          );
          const idInvoiced = invoiceResult.insertId;
          // invoice detail
          if (Array.isArray(value)) {
            for (const item of value) {
              const [invoiceDetailExists] = await connection.execute(
                "INSERT INTO invoicedetails (IDInvoice, IDProduct, TotalQuantity, Price) VALUES (?, ?, ?, ?)",
                [idInvoiced, item.IDProduct, item.soluong, item.Price]
              );
            }
          } else {
            console.error("Cart items is not an array");
            await connection.rollback();
            throw new Error("Cart items is not an array");
          }

          const invoiceId = invoiceResult.insertId;
          // deliveryNotes
          const [deliverynoteExists] = await connection.execute(
            "insert into deliverynotes (IDInvoice,DateCreated,DeliveryAddress,RecipientPhone,Status,IDStaff) values (?, ?, ?, ?, ?, ?)",
            [
              invoiceId,
              currentDate,
              rows[0].diaChi,
              rows[0].soDienThoai,
              1,
              null,
            ]
          );
          await connection.commit();
          res.render("./Client/success", {
            code: vnp_Params["vnp_ResponseCode"],
          });
        }
      } else {
        await connection.commit();
        // Nếu không có bản ghi trùng secretKey và transactionCode, xác nhận thanh toán thất bại
        res.render("./Client/success", { code: "97" });
      }
    } catch (error) {
      // neu co loi
      if (connection) await connection.rollback();

      console.error("Error checking database for secretKey:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.render("./Client/success", { code: "97" });
  }
});

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
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

module.exports = router;