// Node v10.15.3
const axios = require('axios').default; // npm install axios
const CryptoJS = require('crypto-js'); // npm install crypto-js
const moment = require('moment'); // npm install moment
const qs = require('qs')
require("../../config/bodyParser")
const router = require("express").Router()

const config = {
    app_id: "553",
    key1: "9phuAOYhan4urywHTh0ndEXiV3pKHr5Q",
    key2: "eG4r0GcoNtRGbO8",
    endpoint: "https://sb-openapi.zalopay.vn/v2/create"
};

 router.get("/create" ,(req,res,next)=>{
         // APP INFO
        const embed_data = {
            redirecturl : "https://dungchinh.onrender.com/shop"
        };
        
        const items = [{}];
        const transID = Math.floor(Math.random() * 1000000);
        const order = {
            app_id: config.app_id,
            app_trans_id: `${moment().format('YYMMDD')}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
            app_user: "user123",
            app_time: Date.now(), // miliseconds
            item: JSON.stringify(items),
            embed_data: JSON.stringify(embed_data),
            amount: 50000,
            description: `Lazada - Payment for the order #${transID}`,
            bank_code: "",
            callback_url : "https://dungchinh.onrender.com/api/zalo/callback"
        };
        
        // appid|app_trans_id|appuser|amount|apptime|embeddata|item
        const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
        order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
        
        axios.post(config.endpoint, null, { params: order })
            .then(res => {
                console.log(res.data);
            })
            .catch(err => console.log(err));
 })



 router.post('/callback', async (req, res) => {
    let result = {};
  
    try {
      let dataStr = req.body.data;
      let reqMac = req.body.mac;
  
      let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
      console.log("mac =", mac);
  
  
      // kiểm tra callback hợp lệ (đến từ ZaloPay server)
      if (reqMac !== mac) {
        // callback không hợp lệ
        result.return_code = -1;
        result.return_message = "mac not equal";
      }
      else {
        // thanh toán thành công
        // merchant cập nhật trạng thái cho đơn hàng
        let dataJson = JSON.parse(dataStr, config.key2);
        console.log("update order's status = success where app_trans_id =", dataJson["app_trans_id"]);
  
        result.return_code = 1;
        result.return_message = "success";
      }
    } catch (ex) {
      result.return_code = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
      result.return_message = ex.message;
    }
  
    // thông báo kết quả cho ZaloPay server
    res.json(result);
  });


  router.get("/check:app_trans_id",(req,res)=>{
    console.log("12345")
    const app_trans_id = req.params.app_trans_id
    let postData = {
        app_id: config.app_id,
        app_trans_id: app_trans_id, // Input your app_trans_id
    }
    
    let data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1; // appid|app_trans_id|key1
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
    
    
    let postConfig = {
        method: 'post',
        url: "https://sb-openapi.zalopay.vn/v2/query" ,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify(postData)
    };
    
    axios(postConfig)
        .then(function (response) {
            console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
            console.log(error);
        });
  })


module.exports = router