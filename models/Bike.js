const mongoose = require("mongoose");

const BikeModel = mongoose.model("Bike", {
  brand: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

module.exports = BikeModel;
