// setting up the server
const express = require("express");
const cors = require("cors");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const my_secret_key = "secret_key";

let db = null;
const dbPath = path.join(__dirname, "database.db");

// for telling the server to treat incoming requests as JSON objects
app.use(express.json());
app.use(cors());

// starting the server and connecting to the database
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3001, () => {
      console.log("http://localhost:3001");
    });
  } catch (error) {
    console.log("Error in connection DB And Server", error);
  }
};
initializeDbAndServer();

// Admin signup
app.post("/signup", async (req, res) => {
  const body = req.body;
  const { username, password } = body;

  try {
    // checking if the username exists
    const sqlQuery = `
        select *
        from user
        where username = '${username}';
    `;
    const dbResponse = await db.get(sqlQuery);

    if (dbResponse !== undefined) {
      res.status(400).send("Username exists");
    } else {
      const hashedPwd = await bcrypt.hash(password, 10);
      const query = `
            insert into user (username, password)
            values('${username}', '${hashedPwd}')
        `;
      await db.run(query);
      const token = jwt.sign({ username }, my_secret_key, { expiresIn: "7d" });
      res.send({ jwt_token: token });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

// Admin login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // checking if the username exists
    const sqlQuery = `
        select *
        from user
        where username = '${username}';
    `;
    const dbResponse = await db.get(sqlQuery);

    if (dbResponse !== undefined) {
      const isPresent = await bcrypt.compare(password, dbResponse.password);
      if (isPresent) {
        const token = jwt.sign({ username }, my_secret_key, {
          expiresIn: "7d",
        });
        // username and password matches
        res.send({ jwt_token: token });
      } else {
        //   password is wrong
        res.status(404).send("Check your password");
      }
    } else {
      //   username is wrong
      res.status(404).send("Check your username");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

// used to verify jwt_token
const middleWare = (req, res, next) => {
  const authHeader = req.headers.authorization;

  //   check if authHeader is empty
  if (authHeader === undefined) {
    return res.status(401).send("No Authorization Header Available");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, my_secret_key, (err, payload) => {
    if (err) {
      res.status(401).send("Unauthorized");
    } else {
      next();
    }
  });
};

// Get all Categories
app.get("/categories", middleWare, async (req, res) => {
  try {
    // execute only after the jwt_token is verified
    const query = `
        select *
        from categories
    `;
    const dbResponse = await db.all(query);
    res.send(dbResponse);
  } catch (error) {
    res.status(500).send(error);
  }
});
