var ConfigClient = require("../conf_client.js");
var bconf = process.argv.slice(2).map(function(line){
	var d = line.split("=");
	var data = {};
	data[d[0]] = d[1];
	return data;
});
var conf = new ConfigClient("ws://127.0.0.1:8080", [], function(){
	conf.setConf(bconf, process.exit.bind(process));
});
