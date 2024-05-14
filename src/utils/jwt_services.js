const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateforgotpasswordToken = async (userID, role , secret) => {
  try {
    return new Promise((resolve, reject) => {
      const payload = {
        userID,
        role,
      };
      const options = {
        expiresIn: "2m",
      };
      jwt.sign(payload, secret, options, (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
  } catch (error) {
    throw error;
  }
};


const verifyforgotpasswordToken = async (secret, token) => {
  try {
    const result = await new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, payload) => {
        if (err && err.name === 'TokenExpiredError') resolve("token hết hạn bạn phải đăng nhập");
        if (err && err.name === 'JsonWebTokenError') resolve("invalid signature token ko hợp lệ");
        payload.status = true
        resolve(payload);
      });
    });
    return result;
  } catch (err) {
    throw err;
  }
}



const generateAccessToken = async (userID, role) => {
  try {
    return new Promise((resolve, reject) => {
      const payload = {
        userID,
        role,
      };
      const secret = process.env.ACCESS_TOKEN_SECRET;
      const options = {
        expiresIn: "1h",
      };
      jwt.sign(payload, secret, options, (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
  } catch (error) {
    throw error;
  }
};


const verifyAccessToken = (req, res, next) => {
  if (!req.cookies.Token) res.status(409).json({message:"bạn phải đăng nhập"});
  jwt.verify( req.cookies.Token , process.env.ACCESS_TOKEN_SECRET , (err, payload) => {
    if (err && err.name === 'TokenExpiredError') return res.status(400).json({message:"token hết hạn bạn phải đăng nhập"});
    if (err && err.name === 'JsonWebTokenError') return res.status(410).json({message:"invalid signature token ko hợp lệ"});
      req.payload = payload;
      next();
    }
  );
};



const verifyAccessTokenCheckout = async (req, res, next) => {
  try {
    if (!req.cookies.Token) {
      return res.status(409).json({ message: "Bạn phải đăng nhập trước khi đặt hàng" });
    }

    const payload = await jwt.verify(req.cookies.Token, process.env.ACCESS_TOKEN_SECRET);
    req.payload = payload;
    next(); 
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: "Token hết hạn, bạn phải đăng nhập lại" });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(410).json({ message: "Token không hợp lệ" });
    } else {
      return res.status(500).json({ message: "Đã xảy ra lỗi khi xác minh token" });
    }
  }
};



module.exports = {
  generateAccessToken,
  verifyAccessToken, 
  verifyAccessTokenCheckout,
  generateforgotpasswordToken ,
  verifyforgotpasswordToken
  
};
