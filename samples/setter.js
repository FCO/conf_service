var ConfigClient = require("../conf_client.js");
var conf = new ConfigClient("ws://127.0.0.1:8080", [], function(){

   conf.setConf("a.b.c", {d: "bla"});
});
