const path = require("path");
const express = require("express");
const port = process.env.PORT || 5000;
// const passport = require("passport");
// const mongoose = require("mongoose");
const bodyParser = require("body-parser");
// const session = require("express-session");
// const MongoStore = require("connect-mongo");
// const { authCheck } = require("./middleware/auth");
// const authRoutes = require("./routes/authroutes");
const syncroutes = require("./routes/syncroutes");
var url = require("url");

// Load config
require("dotenv").config({ path: "./config/config.env" });
const app = express();

// Configure bodyParser
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);

// set template view engine
app.set("views", "./templates");
app.set("view engine", "ejs");

app.use(express.static(__dirname + "/static"));
app.use("/images", express.static(__dirname + "static/images"));

app.use(function (req, res, next) {
	if (!req.user) {
		res.header(
			"Cache-Control",
			"private, no-cache, no-store, must-revalidate"
		);
		res.header("Expires", "-1");
		res.header("Pragma", "no-cache");
	}
	next();
});


// Routes
// app.use("/auth", authRoutes);
app.use("/", syncroutes);

app.get("/", async (req, res) => {
	res.render("index", {});
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get("*", function (req, res) {
	res.status(404).send("<h1>404 NOT FOUND!</h1>");
});

app.listen(port, (err) => {
	if (err) throw err;
	console.log(`Connection Established!! http://localhost:${port}`);
});
