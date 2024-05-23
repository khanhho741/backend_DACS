const pool = require("../../models/connectDB");

let getAdminV1Documents = (req,res) =>{
    res.render("./Admin/documents/documents.ejs")
}

module.exports = {
    getAdminV1Documents,
}
