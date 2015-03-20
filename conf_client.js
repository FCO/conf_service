var ConfTree = require("./conf_tree.js");
function ConfigClient(url, sign, cb) {
	this.conf = new ConfTree();
	this.url = url;
	if(sign === undefined)
		this.waitingFor = [];
	else if(sign instanceof Array)
		this.waitingFor = sign;
	else
		this.waitingFor = [ sign ];
console.log("waitingFor 1: %j", this.waitingFor);
	this.cb = cb.bind(this)
	this.connect(this.url);
}

ConfigClient.prototype = {
	onMessage:	function(data, flags) {
console.log("onMessage(%j)", data);
		var data = JSON.parse(data);
		var keys = [];
		for(var key in data) {
			keys.push(this.conf.set(key, data[key]));
		}
		return keys;
	},
	waitForSignIn:	function(data, flags) {
console.log("waitForSignIn(%j)", data);
		var keys = this.onMessage(data, flags);
		keys.forEach(function(key) {
			for(var i = 0; i < this.waitingFor.length; i++) {
				if(this.waitingFor[i] === key) {
					var remove = this.waitingFor.splice(i, 1);
					console.log("removing '%s' from waiting list", remove);
				}
			}
		}.bind(this));
		this.didFinishWaiting();
	},
	didFinishWaiting:	function() {
		if(this.waitingFor.length === 0) {
			if(this.cb !== undefined)
				this.cb();
			this.ws.on("message", this.onMessage.bind(this));
		} else {
			this.ws.once('message', this.waitForSignIn.bind(this));
		}
	},
	onClose:	function() {
		this.connect(this.url);
	},
	connect:	function(url, cb) {
		this.WebSocket = require('ws');
		this.ws = new this.WebSocket(url);

		if(this.waitingFor.length > 0)
			this.ws.on("open", function(){
console.log("waitingFor 2: %j", this.waitingFor);
				this._send(JSON.stringify({GET: this.waitingFor}));
			}.bind(this));
		else
			this.ws.on("open", function(){
				setImmediate(this.didFinishWaiting.bind(this));
			}.bind(this));

		this.ws.on('close', this.onClose.bind(this));
		this.ws.on('error', this.onClose.bind(this));
		
		this.ws.once('message', this.waitForSignIn.bind(this));
		//this.ws.on('message', this.onMessage.bind(this));
	},
	_send:	function(msg) {
		this.ws.send(msg);
	},
	getConf:	function(key) {
		var node = this.conf.get(key);
	},
	setConf:	function(key, val) {
		var msg = {};
		msg[key] = val;
		this._send(JSON.stringify({SET: msg}));
	},
};

module.exports = ConfigClient;

