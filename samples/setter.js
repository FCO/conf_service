var ConfigClient = require("../conf_client.js");
var bconf = process.argv.slice(2).map(function(line){return line.split("=")});
var conf = new ConfigClient("ws://127.0.0.1:8080", [], function(){
	bconf.forEach(function(data){
		conf.setConf(data[0], data[1], process.exit.bind(process));
	});
});
