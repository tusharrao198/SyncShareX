"use strict";
const fs = require("fs");
const { spawn } = require("child_process");
const { EOL } = require("os");
const pendingDL = "list.txt";
const original_config = "rclone.conf";
const modified_config = "rclone_modified.conf";
const rclonePath = "rclone"; // Change the rclonePath if rclone is not in the system path
const retriesBeforeExit = 1; // Retries of the progress

var token = null;
var tokenExpTime = null;
function readTokenFromOriginalConfig() {
	try {
		let configContent = fs
			.readFileSync(original_config, { encoding: "utf-8" })
			.split(/\r?\n/);
		// console.log("config = ", configContent, "\n\n");
		for (let i = 0; i < configContent.length; i++) {
			if (configContent[i].startsWith("token = ")) {
				console.log("token");
				token = configContent[i].replace("token = ", "");
				tokenExpTime = Date.parse(JSON.parse(token).expiry);
			}
		}
	} catch (e) {
		console.log(
			">>>------ Encountered error while trying to read the token:\n>>>------ " +
				e
		);
	}

	if (token != null) {
		readpendingDL();
		if (!errorParsingPendingDL && folderIDList.length != 0) {
			console.log("B");
			console.log(">>>------ Start");
			downloadFile(0);
		}
	}
}

var folderIDList = [];
var destinationList = [];
var errorParsingPendingDL = false;

// readpendingDL function reads the list.txt file and add source folder link into folderList array
// and destination folder into destinationList.
function readpendingDL() {
	try {
		let pendingDLContent = fs
			.readFileSync(pendingDL, { encoding: "utf-8" })
			.split(/\r?\n/);
		for (let i = 0; i < pendingDLContent.length; i++) {
			// console.log("Reads List.txt file = ", pendingDLContent);
			// console.log("\nReads List.txt file\n")
			if (pendingDLContent[i] != "") {
				let array = pendingDLContent[i].split("===");
				if (array.length != 2) {
					console.log(
						">>>------ 2. Encountered error while parsing this line:\n>>>------ " +
							pendingDLContent[i]
					);
					errorParsingPendingDL = true;
				} else {
					folderIDList.push(array[0]);
					destinationList.push(array[1]);
				}
			}
		}
		console.log("FolderList = ", folderIDList);
		console.log("destination = ", destinationList);
	} catch (e) {
		console.log(
			">>>------ 3. Encountered error while trying to read the file list:\n>>>------ " +
				e
		);
		errorParsingPendingDL = true;
	}
}

var downloadRetries = 0;
function downloadFile(index) {
	console.log(
		">>>------ Copying Folder from " +
			folderIDList[index] +
			" to " +
			destinationList[index]
	);
	if (fs.existsSync(modified_config)) fs.unlinkSync(modified_config);
	fs.copyFileSync(original_config, modified_config);
	fs.appendFileSync(
		modified_config,
		EOL +
			"[local]" +
			EOL +
			"type = local" +
			EOL
	);
	console.log("running rclone now");

	// //create rclone process
	// const rclone = spawn(
	// 	rclonePath,
	// 	[
	// 		"--drive-server-side-across-configs",
	// 		"--drive-acknowledge-abuse",
	// 		"--max-transfer=750G",
	// 		"--config",
	// 		modified_config,
	// 		"-P",
	// 		"sync",
	// 		"tmp:",
	// 		destinationList[index]
	// 	],
	// 	{ stdio: 
	// 		"inherit" }
	// );

	//create rclone process
	const rclone = spawn(
		rclonePath,
		[
			"--drive-acknowledge-abuse",
			"--max-transfer=750G",
			"--config",
			modified_config,
			"-P",
			"-v",
			"sync",
			`local:${folderIDList[index]}`,
			destinationList[index]
		],
		{ stdio: "inherit" }
	);

	rclone.on("close", (code) => {
		readTokensFromModifiedConfig();
		console.log(">>>------ Child process exited with code " + code);
		if (code != 0) {
			if (downloadRetries < retriesBeforeExit) {
				downloadRetries++;
				downloadFile(index);
			} else {
				console.log(">>>------ Encountered an error.");
			}
		} else if (index + 1 == folderIDList.length) {
			console.log(">>>------ Finished.");
		} else {
			downloadRetries = 0;
			downloadFile(index + 1);
		}
	});
}

function readTokensFromModifiedConfig() {
	try {
		let modifiedConfigContent = fs
			.readFileSync(modified_config, { encoding: "utf-8" })
			.split(/\r?\n/);
		// console.log("modifiedConfigContent = ", modifiedConfigContent);
		for (let i = 0; i < modifiedConfigContent.length; i++) {
			// console.log("modifiedConfigContent[i] = ", modifiedConfigContent[i]);
			if (modifiedConfigContent[i].startsWith("token = ")) {
				let tmp_token = modifiedConfigContent[i].replace(
					"token = ",
					""
				);
				let tmp_tokenExpTime = Date.parse(JSON.parse(tmp_token).expiry);
				
				// console.log("\n",token,"\n", tmp_token, "\n",tmp_tokenExpTime,"\n", tokenExpTime, "\n");

				if (token != tmp_token && tmp_tokenExpTime > tokenExpTime) {
					let originalConfigFileContent = fs.readFileSync(
						original_config,
						{ encoding: "utf-8" }
					);
					originalConfigFileContent =
						originalConfigFileContent.replace(token, tmp_token);
					fs.writeFileSync(
						original_config,
						originalConfigFileContent
					);
					token = tmp_token;
				}
			}
		}
	} catch (e) {
		console.log(
			">>>------ 3. Encountered error trying to read token:\n>>>------ " +
				e
		);
	}
}

readTokenFromOriginalConfig();
