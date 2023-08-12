const mongoose = require("mongoose");
const url = process.env.MONGO_URL || "mongodb+srv://admin-umair:test123@cluster0.xg387ne.mongodb.net/PisosDB";

const ConnectToMongo = () => {
    mongoose
        .connect(url, {
            useNewUrlParser: true,
        })
        .then(() => {
            console.log("DB Connection Succesful");
        })
        .catch((e) => {
            console.log("Something went wrong Umair ! : ", e);
        });
};

module.exports = ConnectToMongo;
