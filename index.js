const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const uid2 = require("uid2");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/bike-chat");

const app = express();

// importer les models
const BikeModel = require("./models/Bike");
const MessageModel = require("./models/Message");
const ThreadModel = require("./models/Thread");
const UserModel = require("./models/User");

// creation des models par mongoose

// const Audrey = new UserModel({
//   username: "audrey"
// });
// Audrey.save();

// const Alexis = new UserModel({
//   username: "Alexis"
// });
// Alexis.save();

// const bike = new BikeModel({ brand: "Motobecane", user: Audrey });
// bike.save();

// const thread = new ThreadModel({
//   users: [Audrey, Alexis],
//   bike: bike
// });
// thread.save();

app.use(function(req, res) {
  res.send({ msg: "Hello Chat" });
});

//Recuperer historique des messages
app.get("/message/:thread", function(req, res) {
  // recuperer les messages d'une discussion
  MessageModel.find({ thread: req.params.thread })
    //recuperer d autres collections
    .populate({ path: "user" })
    .populate({ path: "thread", populate: { path: "bike" } })
    .sort({ createdAt: -1 }) //ordre des messges
    .exec((err, messages) => {
      res.send(messages);
    });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", function connection(ws, req) {
  console.log("someone is connected");
  //fonction qui se declenche quand on reçoit un message
  ws.on("message", function incoming(data) {
    try {
      const dataJSON = JSON.parse(data);
      console.log(dataJSON); // message envoyé objet {text et name}{ text: 'Test', name: 'Audrey' }

      // nouveau message

      //   text: String,
      //   createdAt: { type: Date, default: Date.now },
      //   user: {
      //     type: mongoose.Schema.Types.ObjectId,
      //     ref: "User"
      //   },
      //   thread: {
      //     type: mongoose.Schema.Types.ObjectId,
      //     ref: "Thread"
      //   },
      //   isRequest: {
      //     type: Boolean,
      //     default: false
      //   }
      // });

      // pour connaitre la reference user je dois chercher l'utilisateur
      // attention la recherche du user doit se faire par un token pour securiser
      UserModel.findOne({ username: dataJSON.username }).exec((err, user) => {
        //pour connaitre un message de dois savoir qui l'envoie
        // const message = new MessageModel({
        //   text: dataJSON.text,
        //   user: user,
        //associer le message à une discussion
        //   thread: dataJSON.thread
        // });
        MessageModel.find({ thread: dataJSON.thread })
          .count()
          .exec((err, count) => {
            let message;
            if (count === 0) {
              message = new MessageModel({
                text: dataJSON.text,
                user: user,
                thread: dataJSON.thread,
                isRequest: true
              });
            } else {
              message = new MessageModel({
                text: dataJSON.text,
                user: user,
                thread: dataJSON.thread,
                isRequest: false
              });
            }
            //asynchrone
            //si la sauvegarde fonctionne le message est envoyé à tout le monde
            message.save(err => {
              wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  if (dataJSON.text && dataJSON.name) {
                    client.send(
                      JSON.stringify({
                        // message recu par les autres participants
                        _id: message._id,
                        text: dataJSON.text,
                        user: { name: dataJSON.name },
                        createdAt: message.createdAt
                      })
                    );
                  }
                }
              });
            });
          });
      });
    } catch (e) {
      console.error(e.message);
    }
  });
});

server.listen(process.env.PORT || 2001, function listening() {
  console.log("Listening on %d", server.address().port);
});
