const Admin = require('../Models/Admin.model');
require('dotenv').config();

const createDefaultAdmin = async () => {
    try {
        const adminExists = await Admin.findOne({ role: "admin" }).select('_id').lean();

        if (!adminExists) {
            await Admin.create({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
                role: "admin",
                email: process.env.ADMIN_EMAIL
            });
            console.log("✅ Default admin created");
        }
    } catch (error) {
        console.error("Error creating admin:", error);
    }
};

module.exports = createDefaultAdmin;