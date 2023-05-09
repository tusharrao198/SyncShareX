const router = require("express").Router();
// const {} = require("../utils");
var url = require("url");
// const { authCheck } = require("../middleware/auth");



router.post("/upload", async (req, res) => {
	console.log(req.body);
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({ msg: "data" }));
});

module.exports = router;
