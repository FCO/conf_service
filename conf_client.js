var ConfTree = require("./conf_tree.js");
function ConfigClient(url, sign, cb) {
	this.conf = new ConfTree();
	this.url = url;
	if(sign === undefined)
		this.sign = [];
	else if(sign instanceof Array)
		this.sign = sign;
	else
		this.sign = [ sign ];
	this.waitingFor = [];
	this.cb = cb.bind(this);
	this.connect(this.url);
}

ConfigClient.prototype = {
	time2retry:	50,
	onMessage:	function(data, flags) {
		var data = JSON.parse(data);
		console.log("msg: ", data);
		var keys = [];
		for(var key in data) {
			keys.push(this.conf.set(key, data[key]));
		}
		return keys;
	},
	waitForSignIn:	function(data, flags) {
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
			if(this.cb !== undefined) {
				this.cb();
				this.cb = undefined;
			}
			this.ws.on("message", this.onMessage.bind(this));
		} else {
			this.ws.once('message', this.waitForSignIn.bind(this));
		}
	},
	onClose:	function() {
		console.warn("Connection lost");
		this.ws.removeAllListeners();
		setTimeout(this.connect.bind(this, this.url), this.time2retry += this.time2retry * .5);
	},
	connect:	function(url) {
		this.WebSocket = require('ws');
		this.ws = new this.WebSocket(url);

		//this.waitingFor = this.sign;
		if(this.sign.length > 0) {
			this.ws.once("open", function(){
				console.warn("Connected");
				this._send(JSON.stringify({GET: this.sign}));
			}.bind(this));
		} else {
			this.ws.once("open", function(){
				console.warn("Connected");
				setImmediate(this.didFinishWaiting.bind(this));
			}.bind(this));
		}

		this.ws.on('close', this.onClose.bind(this));
		this.ws.on('error', this.onClose.bind(this));
		
		this.ws.once('message', this.waitForSignIn.bind(this));
	},
	_send:	function(msg, cb) {
		this.ws.send(msg, cb);
	},
	getConf:	function(key) {
		return this.conf.get(key);
	},
	setConf:	function(key, val, cb) {
		var msg = {};
		msg[key] = val;
		this.conf.createNode(key).addCb(cb);
		this._send(JSON.stringify({SET: msg}));
	},
};

module.exports = ConfigClient;

