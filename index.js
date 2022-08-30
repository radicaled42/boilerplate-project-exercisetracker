const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// Add body-parser to manage request body
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Config Mongoose
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI);

//Set up User Schema
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: { type: String, required: true },
  },
  { versionKey: false }
);

let User = mongoose.model("User", userSchema);

//Set up Exercise Schema
const exerciseSchema = new Schema(
  {
    userid: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { versionKey: false }
);

let Exercise = mongoose.model("Exercise", exerciseSchema);

// {
//   username: "fcc_test",
//   _id: "5fb5853f734231456ccb3b05"
// }

app
  .route("/api/users")
  .get((req, res) => {
    User.find({}, function (err, data) {
      if (err) return console.error(err);
      res.json(data);
    });
  })
  .post((req, res) => {
    let newUser = new User({
      username: req.body.username,
    });

    newUser.save(function (err, data) {
      if (err) return console.log(err);
      res.json(data);
    });
  });

app.post("/api/users/remove", (request, response) => {
  const newUsername = request.query.username;
  console.log("User to delete: " + newUsername);
  User.remove({ username: newUsername }, function (err, removeResult) {
    if (err) {
      console.log(err);
    } else {
      console.log("Result :", removeResult);
      return;
    }
  });
});

// {
//   username: "fcc_test",
//   description: "test",
//   duration: 60,
//   date: "Mon Jan 01 1990",
//   _id: "5fb5853f734231456ccb3b05"
// }

//Create Exercise
app.post("/api/users/:_id/exercises", function (req, res) {
  //Check if user can be find, if not, return user not found
  User.findById(req.params["_id"], function (err, data) {
    if (err) return console.log(err);
    if (data) {
      //
      let username = data.username;
      //Check if date string is exist, if yes, convert to date, if not, apply current date
      let newExercise = new Exercise({
        userid: req.params["_id"],
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date ? new Date(req.body.date) : new Date(),
      });

      newExercise.save(function (err, data) {
        if (err) return console.log(err);
        console.log(data);
        res.json({
          username: username,
          description: data.description,
          duration: data.duration,
          date: data.date.toDateString(),
          _id: data.userid,
        });
      });
    } else {
      res.json({ Error: "Invaild user id." });
    }
  });
});

app.get("/api/users/:_id/logs", function (req, res) {
  //Get the parameters
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  console.log(
    `Request ID: ${req.params["_id"]} - From: ${from} - To: ${to} - Limit: ${limit}`
  );

  //Get user info first
  User.findById(req.params["_id"], function (err, data) {
    if (err) return console.log(err);
    if (data) {
      //
      let username = data.username;
      let userid = data._id;
      //Check if date string is exist, if yes, convert to date, if not, apply current date
      let query = {
        userid: userid,
      };

      console.log(username);

      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (
        from &&
        from.match(regex) !== null &&
        to &&
        to.match(regex) !== null
      ) {
        query.date = { $gte: from, $lte: to };
      } else if (
        from &&
        from.match(regex) !== null &&
        (!to || to.match(regex) === null)
      ) {
        query.date = { $gte: from };
      } else if (
        to &&
        to.match(regex) !== null &&
        (!from || from.match(regex) === null)
      ) {
        query.date = { $lte: to };
      }

      Exercise.find(query)
        .limit(limit && !isNaN(limit) ? limit : 0)
        .select({ userid: 0 })
        .exec(function (err, data) {
          if (err) return console.error(err);
          data = data.map((d) => {
            return {
              description: d.description,
              duration: d.duration,
              date: d.date.toDateString(),
            };
          });
          res.json({
            _id: userid,
            username: username,
            count: data.length ? data.length : 0,
            log: data,
          });
        });
    } else {
      res.json({ Error: "Invaild user id." });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
