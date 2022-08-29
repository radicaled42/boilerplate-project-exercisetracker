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

app.post("/api/users", (request, response) => {
  const newUsername = request.body.username;
  console.log(
    `Create a user ${newUsername} if it doesn't exists and return the ID`
  );
  User.find({ username: newUsername }, function (err, existingUser) {
    if (err) return console.error(err);
    // console.log(existingUser);
    if (existingUser.length === 0) {
      console.log("The user doesn't exist - Create user");
      let newUser = new User({
        username: newUsername,
      });
      newUser.save(function (err, resultCreation) {
        if (err) return console.error(err);
        // console.log(resultCreation);
        response.json(resultCreation);
      });
    } else {
      console.log("The user exist - Show User");
      response.json(existingUser);
    }
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

app.post("/api/users/:_id/exercises", (request, response) => {
  const userID = request.params._id;
  const description = request.body.description;
  const duration = request.body.duration;
  const date = new Date(request.body.date).toDateString();
  console.log(
    `Add Exercise - ID ${userID} - description: ${description} - duration ${duration} - date: ${date}`
  );

  // 1. Find if the user exist - If not, error
  User.findById(userID, function (err, existingUser) {
    if (err) {
      console.log(err);
    } else {
      console.log("Result : ", existingUser);
      if (existingUser) {
        let username = existingUser.username;

        // 2. Create the new exercise object
        const newExercise = new Exercise({
          userid: userID,
          description: description,
          duration: duration,
          date: date,
        });

        // 3. Add the new exercise to the DB
        newExercise.save(function (err, result) {
          if (err) {
            console.log(err);
          } else {
            console.log("New exercise create");
            // 4. response the json of the new exercise
            response.json({
              username: username,
              _id: result.userid,
              description: result.description,
              duration: result.duration,
              date: result.date.toDateString(),
            });
          }
        });
      } else {
        response.json({ Error: "Invaild user id." });
      }
    }
  });
});

app.get("/api/users/:_id/logs", (request, response) => {
  //Get the parameters
  const userID = request.params._id;
  const from = request.query.from;
  const to = request.query.to;
  const limit = request.query.limit;

  console.log(
    `Request recived from: ${userID}, from ${from} to ${to} number of records ${limit}`
  );

  // 1. Search for the user
  User.findById(userID, function (err, existingUser) {
    if (err) return console.log(err);
    if (existingUser) {
      let username = existingUser.username;

      console.log(`User ${username} found`);

      let query = {
        userid: userID,
      };

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

      console.log(`Query created ${query}`);

      Exercise.find(query)
        .limit(limit && !isNaN(limit) ? limit : 0)
        .select({ userid: 0 })
        .exec(function (err, existingExercise) {
          if (err) return console.error(err);
          console.log(`Exercise found: ${existingExercise}`);
          existingExercise = existingExercise.map((d) => {
            return {
              description: d.description,
              duration: d.duration,
              date: d.date.toDateString(),
            };
          });
          response.json({
            username: username,
            count: existingExercise.length ? existingExercise.length : 0,
            _id: userID,
            log: existingExercise,
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
