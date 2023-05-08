// const a = "b20081@students.iitmandi.ac.in";
// console.log(a[6], a[a.length - 1]);
// console.log(a.match("@students.iitmandi.ac.in").length);

// const axios = require("axios");
const reader = require("g-sheets-api");
const readerOptions = {
    sheetId: "1vgPjL2XV2C54EC5Sw6q7VIdOzMCD_iJuH-XD35zakD4",
    returnAllResults: true,
};
reader(readerOptions, (results) => {
    /* Do something amazing with the results */
    console.log("data = ", results);
});
