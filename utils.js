"use strict";
var url = require("url");
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

var folderIDList = [];
var destinationList = [];
var errorParsingPendingDL = false;

var downloadRetries = 0;

// readpendingDL function reads the list.txt file and add source folder link into folderList array
// and destination folder into destinationList.
function readpendingDL(data) {
	try {
		const { localpath, destpath } = data;
		// console.log("Inside readpendingDL  = ", localpath);
		folderIDList.push(localpath);

		if (destinationList.length === 0) {
			destinationList.push(destpath);			
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

function downloadFile(index) {
	// console.log(
	// 	">>>------ Copying Folder from " +
	// 		folderIDList[index] +
	// 		" to " +
	// 		destinationList[0]
	// );
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


	//create rclone process
	const rclone = spawn(
		rclonePath,
		[
			"--config",
			modified_config,
			"-P",
			"-v",
			"sync",
			`local:${folderIDList[index]}`,
			`teamdrive-jack:${destinationList[0]}`
			
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
		} else if (index + 1 == 1) {
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


module.exports = {
	readTokenFromOriginalConfig: async function (data) {
		try {
			let configContent = fs
				.readFileSync(original_config, { encoding: "utf-8" })
				.split(/\r?\n/);
			// console.log("config = ", configContent, "\n\n");
			for (let i = 0; i < configContent.length; i++) {
				if (configContent[i].startsWith("token = ")) {
					// console.log("token");
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
			readpendingDL(data);
			if (!errorParsingPendingDL && folderIDList.length != 0) {
				console.log(">>>------ Start");
				downloadFile(0);
			}
		}
	},
};
