const Joi = require('joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const crypto = require("crypto")
require("dotenv").config();




function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, length); // return required number of characters
}



async function verifyCaptchaToken(token) {
    const fetch = await import('node-fetch'); // Sử dụng import() động
    const url = `https://www.google.com/recaptcha/api/siteverify`; // URL của Google reCAPTCHA API
    const secretKey = process.env.SECRET_KEY; // Thay YOUR_RECAPTCHA_SECRET_KEY bằng secret key của bạn

    try {
        const response = await fetch.default(url, { // Sử dụng fetch.default vì fetch là một object module
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `secret=${secretKey}&response=${token}`
        });

        if (!response.ok) {
            throw new Error('Không thể xác minh mã token reCAPTCHA');
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Lỗi khi xác minh mã token reCAPTCHA:', error);
        return false;
    }
}

const validateRegistration = (firstName, lastName, email, password) => {
    const schema = Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    });

    const { error, value } = schema.validate({ firstName, lastName, email, password });

    if (error) {
        return { success: false, error: { field: error.details[0].context.key, message: error.details[0].message } };
    }

    return { success: true, data: value };
};


const validateSignin = (email, password) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    }).options({ allowUnknown: false }); // Không cho phép các trường không mong muốn

    const { error, value } = schema.validate({ email, password });

    if (error) {
        return { success: false, error: { field: error.details[0].context.key, message: error.details[0].message } };
    }

    return { success: true, data: value };
};




const comparePassword = async (password, hash) => {
    try {
        const result = await bcrypt.compare(password, hash);
        return result;
    } catch (error) {
        throw error
    }
};

const hashPassword = async (password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw error
    }
};




module.exports = { validateRegistration , validateSignin , hashPassword , comparePassword , verifyCaptchaToken , generateRandomString} ;
