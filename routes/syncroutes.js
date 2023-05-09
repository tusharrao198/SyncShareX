const router = require("express").Router();
const path = require("path");
const {readTokenFromOriginalConfig} = require("../utils");
var url = require("url");
const { authCheck } = require("../middleware/auth");

router.post("/upload", authCheck, async (req, res) => {
	console.log(req.body);
	var { localpath } = req.body;
	sourcedir = localpath;
	console.log("After localpath = ", localpath)
	const data = await readTokenFromOriginalConfig(req.body);
	console.log("data return = ", data);
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({ msg: data }));
});

module.exports = router;
