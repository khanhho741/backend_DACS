const pool = require("../../models/connectDB")

let postLogout = async(req,res) =>{

    const [userAlreadyExists , userFields] = await pool.execute("select * from user where Username =  ?", [req.payload.userID])
    if(userAlreadyExists[0]){
        
        res.setHeader("Set-Cookie", [
            "Token=; max-age=0 ; path=/; ",
            "Username=; max-age=0 ; path=/; ",
          ]);

        return res.status(200).json({
            message: "dang xuat thanh cong"
        })
    }
    return res.status(500).json({message:"lỗi server"})
}

module.exports = {postLogout};