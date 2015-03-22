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
				this.children.forEach(function(child){
					child.destroy();
				}.bind(this));
			}.bind(this));
			
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
	get absName() {
		if(this.parent.isRoot())
			return this.name;
		else
			return this.parent.absName + "." + this.name;
	},
	onDestroy:			function(key) {
		this.root.onDestroy.call(this, key);
	},
	destroy:			function() {
		this.onDestroy(this.absName);
console.log("destroy %j", this.toHash());
		this._value = undefined;
		for(var child in this.children) {
			child.destroy();
			child._value = undefined;
		}
		for(var attr in this) {
			if(this.hasOwnProperty(attr))
				this[attr] = undefined;
		}
	},
	get root() {
		if(this.isRoot()) return this;
		return this.parent.root;
	},
	_transform_key:			function(key) {
		if(!(key instanceof Array)) {
			key = key.split(".");
		}
		return key;
	},
	toString:			function() {
		return JSON.stringify(this.toHash());
	},
	toHash:				function() {
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
	set:				function(key, val) {
		this.createNode(key).value = val;
		return key;
	},
	get:		function(key) {
		var val = this.findNode(key).value;
		return val
	},
	keys:				function() {
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
	isLeaf:				function() {
		return this.children.length == 0;
	},
	isRoot:				function() {
		return this.parent === undefined;
	},
	sign:				function(ws) {
		this.signed_by.push(ws);
	},
	addCb:				function(cb) {
		this.cbs.push(cb);
	},
	notifyNode:			function(func) {
		this.signed_by.forEach(func.bind(this));
	},
	notifyParent:			function(func) {
		this.parentDo(function() {
			this.notifyNode(func);
		});
	},
	notifyChildren:			function(func) {
		this.childrenDo(function() {
			this.notifyNode(func);
		});
	},
	parentDo:		function(cb) {
		cb.call(this);
		if(!this.isRoot()) this.parent.parentDo(cb);
	},
	childrenDo:		function(cb) {
		setImmediate(function(cb){
			this.children.forEach(function(child){
				this.childrenDo(cb);
			}.bind(this));
		}.bind(this, cb));
		cb.call(this);
	},
	nearstNode:		function(key) {
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
