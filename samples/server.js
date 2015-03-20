var ConfigService = require("../index.js");

var conf = new ConfigService(["a.b.c=123", "a.b.d=234"], function(){
	console.log(this);
});
