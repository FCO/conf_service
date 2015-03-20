var ConfTree = require("./conf_tree.js");
function ConfigService(data, cb) {
	this.conf = new ConfTree();
	setImmediate(function(){
		if(!(data instanceof Array)) data = [data];
		data.forEach(function(data){
			var arr = data.split("=");
			var key = arr[0];
			var val = arr[1];
			this.conf.set(key, val);
		}.bind(this));

		var WebSocketServer = require('ws').Server;
		var wss = new WebSocketServer({ port: 8080 });

		wss.on('connection', this.onConnection.bind(this));
		if(cb !== undefined) setImmediate(cb.bind(this));
	}.bind(this));
}

ConfigService.prototype = {
	onConnection:	function(ws) {
		console.log("onConnection()");
		var tmp = ws.send;
		ws.send = function(){
			console.log("send(%j)", arguments);
			tmp.apply(ws, Array.prototype.slice.call(arguments));
		};
		ws.on('message', this.onMessage.bind(this, ws));
	},
	onMessage:	function(ws, message) {
		console.log("onMessage(%j)", message);
		message = JSON.parse(message);
		for(var cmd in message) {
			setImmediate(this.commands[cmd].bind(this, ws, message[cmd]));
		}
	},
	notify:		function(key) {
		var node = this.conf.findNode(key);
		node.notify(function(ws){
			var msg = {};
			msg[key] = node.toHash();
			ws.send(JSON.stringify(msg));
		});
	},
	commands:	{
		GET:	function(ws, key) {
			if(!(key instanceof Array))
				key = [key];
			for(var i = 0; i < key.length; i++) {
				setImmediate(function(key) {
					var node = this.conf.findNode(key);
					node.sign(ws);
					var msg = {};
					msg[key] = node.toHash();
					ws.send(JSON.stringify(msg));
				}.bind(this, key[i]));
			}
		},
		SET:	function(ws, data) {
			for(var key in data) {
				setImmediate(function(key) {
					this.conf.set(key, data[key]);
					this.notify(key);
				}.bind(this, key));
			}
		},
	},
};

module.exports = ConfigService;
