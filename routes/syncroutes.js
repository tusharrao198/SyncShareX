const router = require("express").Router();
const {readTokenFromOriginalConfig, readTokensFromModifiedConfig, downloadFile, readpendingDL } = require("../utils");
var url = require("url");
const { authCheck } = require("../middleware/auth");



router.post("/upload", async (req, res) => {
	console.log(req.body);
	const data = await readTokenFromOriginalConfig(req.body);
	console.log("data return = ", data);
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({ msg: data }));
});

module.exports = router;
