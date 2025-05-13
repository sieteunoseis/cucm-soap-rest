const axlService = require("cisco-axl");

let service = new axlService("cucm01-pub.automate.builders", "perfmon", "perfmon","15.0");

var operation = "applyPhone";
var tags = {
  "applyPhone": {
    "name": "SEP0038DFB50658",
  }
};

service
  .executeOperation(operation, tags)
  .then((results) => {
    console.log("applyPhone UUID", results);
  })
  .catch((error) => {
    console.log(error);
  });