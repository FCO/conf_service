module.exports = ConfTree;
function ConfTree(name, paren) {
	this.name = name;
	this.parent = paren;
	this.children = [];
	this._value;
	this.signed_by = [];
	this.cbs = [];
	if(!this.isRoot())
		this.parent._value = undefined;
};

ConfTree.prototype = {
	set value(data) {
		if(typeof data === "object") {
			this._value = undefined;
			for(var key in data) {
				var node = this.createNode(key, this);
				node.value = data[key];
			}
		} else {
			setImmediate(function(){
				for(var child in this.children) {
					child.clear();
				}
			});
			
			this._value = data;
		}
		var cb;
		while((cb = this.cbs.shift()) !== undefined) {
			(function(cb) {
				setImmediate(cb.bind(this, this));
			}).call(this, cb);
		}
	},
	get value() {
		if(this.isLeaf())
			return this._value;
		else
			return this.toHash();
	},
	clear:		function() {
		for(var child in this.children) {
			child.clear();
		}
		for(var attr in this) {
			if(this.hasOwnProperty(attr))
				this[attr] = undefined;
		}
	},
	_transform_key:	function(key) {
		if(!(key instanceof Array)) {
			key = key.split(".");
		}
		return key;
	},
	toString:	function() {
		return JSON.stringify(this.toHash());
	},
	toHash:		function() {
		var hash;
		if(this._value !== undefined) {
			hash = this._value;
		} else {
			hash = {};
			for(var i = 0; i < this.children.length; i++) {
				var node = this.children[i];
				hash[node.name] = node.toHash();
			}
		}
		return hash;
	},
	set:		function(key, val) {
		this.createNode(key).value = val;
		return key;
	},
	get:		function(key) {
		var val = this.findNode(key).value;
		return val
	},
	keys:		function() {
		if(this.children.length <= 0)
			return [this.name];
		var keys = [];
		this.children.forEach(function(node){
			node.keys().forEach(function(key){
				var prefix = "";
				if(this.name !== undefined)
					prefix = this.name + ".";
				keys.push(prefix + key);
			}.bind(this));
		}.bind(this));
		return keys;
	},
	isLeaf:			function() {
		return this._value !== undefined && this.children.length == 0;
	},
	isRoot:			function() {
		return this.parent === undefined;
	},
	absName:		function() {
		if(this.parent.isRoot())
			return this.name;
		else
			return this.parent.absName() + "." + this.name;
	},
	sign:			function(ws) {
		this.signed_by.push(ws);
	},
	addCb:			function(cb) {
		this.cbs.push(cb);
	},
	notify:			function(func) {
		this.recursiveRun(function() {
			this.signed_by.forEach(func.bind(this));
		});
	},
	recursiveRun:		function(cb) {
		cb.call(this);
		if(!this.isRoot()) this.parent.recursiveRun(cb);
	},
	nearstNode:	function(key) {
		var keys = this._transform_key(key);
		var first_key = keys.shift();
		var ret;
		for(var i = 0; i < this.children.length; i++) {
			if(first_key === undefined)
				ret = this;
			else if(first_key.localeCompare(this.children[i].name) > 0) {
				ret = this;
			} else if(first_key == this.children[i].name) {
				if(keys.length > 0)
					ret = this.children[i].findNode(keys);
				else
					ret = this;
			}
		}
		if(first_key !== undefined) keys.unshift(first_key);
		return {node: ret, notFound: keys.join(".")};
	},
	findNode:	function(key) {
		var keys = this._transform_key(key);
		var first_key = keys.shift();
		for(var i = 0; i < this.children.length; i++) {
			if(first_key === undefined)
				break;
			else if(first_key.localeCompare(this.children[i].name) > 0) {
				break;
			} else if(first_key == this.children[i].name) {
				if(keys.length > 0)
					return this.children[i].findNode(keys);
				else
					return this.children[i];
			}
		}
	},
	createNode:	function(key) {
		var keys = this._transform_key(key);
		var first_key = keys.shift();
		var child;
		if(first_key == undefined)
			return this;
		for(var i = 0; i < this.children.length; i++) {
			if(first_key.localeCompare(this.children[i].name) > 0) {
				this.children.splice(i - 1, 0, child = new ConfTree(first_key, this));
				break;
			}else if(first_key == this.children[i].name) {
				child = this.children[i];
				break;
			}
		}
		if(child === undefined) {
			this.children.push(child = new ConfTree(first_key, this));
		}
		if(keys.length > 0)
			return child.createNode(keys);
		return child;
	},
	diffNode:	function(tree) {
		var ret = "";
		if(this.value != tree.value)
			ret = this.name;
		else if(this.children.length == tree.children.length) {
			for(var i = 0; i < this.children.length; i++) {
				if(this.children[i].name != tree.children[i].name) {
					ret = this.name;
				} else {
					if(this.name !== undefined)
						ret = this.name + ".";
					ret += this.children[i].diffNode(tree.children[i]);
				}
			}
		} else {
			ret = this.name;
		}
		return ret;
	}
};
