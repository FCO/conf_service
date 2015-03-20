var ConfigClient = require("../conf_client.js");
var conf = new ConfigClient("ws://127.0.0.1:8080", ["a.b.c"], function(){
   //console.log(conf);
   setInterval(function(){console.log("response: %j", conf.getConf("a.b.c"))}, 1000);

})
