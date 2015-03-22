var ConfTree = require("./conf_tree.js");
function ConfigService(data, cb) {
	this.next_ws_id = 1;
	this.signed = {};
	this.conf = new ConfTree();
	this.conf.onDestroy = function(key){
		if(this.signed_by !== undefined)
			this.signed_by.forEach(function(ws){
				var msg = {};
				msg[key] = null;
				ws.send(JSON.stringify(msg));
			}.bind(this));
	};
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
		ws.id = this.next_ws_id++;
		console.log("onConnection()");
		var tmp = ws.send;
		ws.send = function(){
			console.log("send(%j)", arguments);
			try{
				tmp.apply(ws, Array.prototype.slice.call(arguments));
			} catch(err) {
				console.warn(err);
			}
		};
		ws.on('message', this.onMessage.bind(this, ws));
		ws.on('close', this.onClose.bind(this, ws));
	},
	onClose:	function(ws) {
		console.log("onClose(%d)", ws.id);
		if(this.signed[ws.id] !== undefined)
			this.signed[ws.id].forEach(function(key){
				var node = this.conf.findNode(key);
				if(node !== undefined) {
					node.unsign(ws);
				}
			}.bind(this));
	},
	onMessage:	function(ws, message) {
		console.log("onMessage(%j)", message);
		message = JSON.parse(message);
		for(var cmd in message) {
			setImmediate(this.commands[cmd].bind(this, ws, message[cmd]));
		}
	},
	notify:		function(meth, key) {
		var node = this.conf.findNode(key);
		node[meth](function(ws){
			var msg = {};
			msg[key] = node.toHash();
			try{ws.send(JSON.stringify(msg));}catch(err){console.warn(err);}
		});
	},
	commands:	{
		GET:	function(ws, key) {
			if(!(key instanceof Array))
				key = [key];
			for(var i = 0; i < key.length; i++) {
				setImmediate(function(key) {
					var node = this.conf.findNode(key);
					if(node === undefined) return;
					if(this.signed[ws.id] === undefined) this.signed[ws.id] = [];
					this.signed[ws.id].push(key);
					node.sign(ws);
					var msg = {};
					msg[key] = node.toHash();
					ws.send(JSON.stringify(msg));
				}.bind(this, key[i]));
			}
		},
		SET:	function(ws, data) {
			for(var key in data) {
				var node = this.conf.createNode(key);
				node.sign(ws);
				setImmediate(function(key) {
					var wasLeaf = node.isLeaf();
					node.value = data[key];
					if(!wasLeaf && node.isLeaf())
						this.notify("notifyChildren", key);
					this.notify("notifyParent", key);
				}.bind(this, key));
			}
		},
	},
};

module.exports = ConfigService;
