const Admin = require('../Models/Admin.model');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const createDefaultAdmin = async () => {
    try {

        const adminExists = await Admin.findOne({ role: "admin" });
   
        if (!adminExists) {
            await Admin.create({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
                role: "admin",
                email: process.env.ADMIN_EMAIL
            });

            const token = jwt.sign({ username: process.env.ADMIN_USERNAME }, process.env.JWT_SECRET,
               { expiresIn: "15d" }
            );
            res.cookie('token', token, { httpOnly: true });
            console.log("✅ Default admin created");
        } else {
            console.log("⚡ Admin already exists");
        }

    } catch (error) {
        console.log("Error creating admin:", error);
    }
}

module.exports = createDefaultAdmin;