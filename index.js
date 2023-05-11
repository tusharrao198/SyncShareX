const path = require("path");
const express = require("express");
const port = process.env.PORT || 5000;
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { authCheck } = require("./middleware/auth");
const authRoutes = require("./routes/authroutes");
const syncroutes = require("./routes/syncroutes");
var url = require("url");
const chokidar = require('chokidar');
const { readTokenFromOriginalConfig } = require("./utils");


"use strict";
var url = require("url");
const fs = require("fs");
const { spawn } = require("child_process");
const original_config = "rclone.conf";
const rclonePath = "rclone"; // Change the rclonePath if rclone is not in the system path
var folderIDList = [];
var destinationList = [];


const connectDB = require("./config/db");

// Watch for changes in the local folder and sync with the remote folder using rsync
var localPath = path.join(__dirname, './source');
const watcher = chokidar.watch(localPath, {
	persistent: true
});


// Load config
require("dotenv").config({ path: "./config/config.env" });

// Passport Config
require("./config/passport")(passport);

// connect to Database
connectDB();

// Set up Express app
const app = express();
const http = require('http').createServer(app);

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

// Sessions middleware
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: false,
		store: MongoStore.create({ mongoUrl: process.env.MONGO_DATABASE_URI }),
	})
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/", syncroutes);

// Set up Socket.IO server
const io = require('socket.io')(http);

// Set up Socket.IO server to handle client connections
io.on('connection', (socket) => {
  	console.log(`Client ${socket.id} connected`);

	// socket.on('log', (message) => {
	// 	console.log(`Received log message inside index.js: ${message}`);
	// 	io.emit('log', message);
	// });

	socket.on('transfer', (source, dest) => {
		// Run Rclone with the progress flag and parse the output
			
			console.log("Run Rclone with the progress flag and parse the output");
			const gclone = spawn(
				rclonePath,
				[
					"--config",
					original_config,
					"-P",
					"-v",
					"sync",
					`local:${source}`,
					`teamdrive-jack:${dest}`
					
				],
				{ stdio: ['inherit', 'pipe', 'pipe'], }
			);
				
			gclone.stdout.on('data', (data) => {
				const lines = data.toString().split('\n');
				// console.log("\n\nlinesssss = ", lines, "\n\n");
				lines.forEach((line) => {
					// console.log("A = " ,line);
					socket.emit('progress', line);
				});
			});

			gclone.stderr.on('data', (data) => {
				console.error(data.toString());
			});

			gclone.on('close', (code) => {
				console.log(`Rclone process exited with code ${code}`);
			});
	});

	socket.on('sync', (message) => {
		console.log(`Received log message inside index.js: ${message}`);
			context = {
		localpath: localPath,
		destpath: "uploads",
	}
		readTokenFromOriginalConfig(context)
		io.emit('sync-output', message);
	});
	
	// Handle client disconnections
	socket.on('disconnect', () => {
		console.log(`Client ${socket.id} disconnected`);
	});
});


watcher.on('change', async (event, path) => {
	// console.log("\n\n\nwatcher = ", event, " \npath = ", path);
	context = {
		localpath: localPath,
		destpath: "uploads",
	}
	const data = await readTokenFromOriginalConfig(context);
});


app.get("/", async (req, res) => {
	console.log("req.session.user = ", req.session.user);
	const userDetails = require("./models/User");

	if (req.isAuthenticated()) {
		const userID = req.user._id;
		let user = await userDetails.findOne({ _id: userID });
		res.render("index", {
			authenticated: req.isAuthenticated(),
			username:
				user != null || user !== undefined ? user.displayName : null,
		});
	} else {
		// console.log("NOT AUTHENTICATED");
		res.render("index", {
			authenticated: req.isAuthenticated(),
		});
		// res.setHeader("Content-Type", "application/json");
		// res.end(JSON.stringify({ msg: "No user logged in!" }));

	}

	// res.render("index", { authenticated: false, });

});

//The 404 Route (ALWAYS Keep this as the last route)
app.get("*", function (req, res) {
	res.status(404).send("<h1>404 NOT FOUND!</h1>");
});

http.listen(port, (err) => {
	if (err) throw err;
	console.log(`Connection Established!! http://localhost:${port}`);
});
