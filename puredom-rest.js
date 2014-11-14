/** A synchronized model base class. */
(function(root, factory) {
	if (typeof define==='function' && define.amd) {
		define(['puredom'], factory);
	}
	else if (typeof module==='object' && module.exports) {
		module.exports = factory(require('puredom'));
	}
	else {
		window.puredom.rest = factory(window.puredom);
	}
}(this, function($) {
	/** @exports rest as puredom.rest */

	/**	Create a new rest Resource, representing one resource type exposed by a RESTful API.
	 *	@param {String} [url=/]		The full base URL for the resource (Example: http://a.com/api/users/)
	 *	@returns {rest.Resource} resource
	 */
	function rest(url) {
		return new rest.Resource(url);
	}

	/**	Represents a single resource type exposed by a RESTful API.
	 *	@constructor Create a representation of a given REST resource.
	 *	@augments puredom.EventEmitter
	 *	@param {String} [url=/]		The full base URL for the resource (Example: http://a.com/api/users/)
	 */
	rest.Resource = function(url) {
		$.EventEmitter.call(this);

		this.url = url || this.url;
		this.query = $.extend({}, this.query);
	};

	$.inherits(rest.Resource, $.EventEmitter);

	var proto = rest.Resource.prototype;
	$.extend(proto, /** @lends rest.Resource# */ {
		url : '/',

		query : {},

		/**	Get or set the value of a named parameter to send with each request. */
		param : function(key, value) {
			if (typeof key==='string') {
				if (arguments.length===1) return this.query[key];
				this.query[key] = value;
			}
			if (typeof key==='object') {
				$.extend(this.query, key);
			}
			return this;
		},

		index : function(callback) {
			return this._call('GET /', null, callback);
		},

		get : function(id, callback) {
			return this._call('GET /' + id, null, callback);
		},

		post : function(obj, callback) {
			return this._call('POST /', obj, callback);
		},

		put : function(id, obj, callback) {
			if (id && typeof id==='object' && typeof obj==='function') {
				callback = obj;
				obj = id;
				id = obj[this.idKey];
			}
			return this._call('PUT /' + id, obj, callback);
		},

		del : function(id, callback) {
			return this._call('DELETE /' + id, null, callback);
		},

		/** Used to grab the identifier if you pass an object directly to put() */
		idKey : 'id',

		serializeBody : function(body, req) {
			if (req.method==='POST') {
				return $.querystring.stringify(body);
			}
			else if (body) {
				if (!req.headers['content-type']) {
					req.headers['content-type'] = 'application/json';
				}
				return $.json.stringify(body);
			}
		},

		_call : function(url, body, callback, options) {
			var self = this,
				method = 'GET',
				headers = {},
				query = $.extend({}, this.query),
				parts = url.split(' '),
				path, relativeUrl, querystring;
			options = options || {};

			if (options.headers) {
				$.extend(headers, options.headers);
			}
			if (options.query) {
				$.extend(query, options.query);
			}

			if (parts[0]===parts[0].toUpperCase()) {
				method = parts.splice(0, 1)[0];
			}
			url = parts.join(' ');
			url = '/' + url.replace(/(^\/+|\/+$)/g, '');
			path = url;

			querystring = $.querystring.stringify(query);
			if (querystring) {
				url += (url.indexOf('?')<0?'?':'&') + querystring;
			}

			relativeUrl = url;
			url = this.url.replace(/(?:^([a-z]+\:\/\/)|(\/)\/+|\/+$)/g, '$1$2') + url;

			var req = {
				path : path,
				querystring : querystring,
				query : query,
				url : url,
				fullUrl : url,
				relativeUrl : relativeUrl,
				method : method,
				headers : headers,
				body : body,
				rawBody : body
			};

			if (typeof this.serializeBody==='function') {
				req.body = this.serializeBody(body, req) || req.body;
			}

			this.fireEvent('req', req);
			this.fireEvent('req:' + relativeUrl, req);

			$.net.request(req, function() {
				var res = {
						status : this.status,
						data : this.responseText + '',
						headers : {}
					},
					responseHeaders = this.request.getAllResponseHeaders(),
					reg = /^([a-z\-]+)\s*\:/gim,
					msgProp = self.errorMessageProp || self.messageProp,
					token, evts, i, r;
				reg.lastIndex = 0;
				while ( (token=reg.exec(responseHeaders)) ) {
					res.headers[token[1].toLowerCase()] = this.request.getResponseHeader(token[1]);
				}
				if (this.request.responseType==='json') {
					res.json = this.request.response;
				}
				else if (res.data.match(/^(\{[\s\S]*\}|\[[\s\S]*\]|\"[\s\S]*\")$/)) {
					res.json = $.json.parse(res.data);
				}

				res.error = res.status>=400 ? (res.json || res.data || 'Error '+res.status) : null;
				res.response = res.status<400 ? res.json || res.data : null;
				r = res.error ? 'error' : 'success';
				if (res.error && msgProp) {
					res.error = $.delve(res.error, msgProp, false, true) || res.error;
				}

				evts = [
					'status',
					'status:' + res.status,
					'res',
					'res:' + relativeUrl,
					r,
					r + ':' + relativeUrl
				];
				for (i=0; i<evts.length; i++) {
					self.fireEvent(evts[i], [req, res]);
				}

				if (typeof callback==='function') {
					callback.call(self, res.error, res.response, res);
				}
			});

			return this;
		}
	});

	proto.create = proto.post;
	proto.read = proto.get;
	proto.update = proto.put;
	proto.remove = proto.del;
	try {
		proto['delete'] = proto.del;
	} catch(err) {}

	$.rest = rest.rest = rest;
	return rest;
}));
