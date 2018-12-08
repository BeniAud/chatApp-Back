const mongoose = require("mongoose");

const UserModel = mongoose.model("User", {
  username: String
});

module.exports = UserModel;
