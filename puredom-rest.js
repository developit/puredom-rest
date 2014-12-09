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
		this.headers = $.extend({}, this.headers);
	};

	$.inherits(rest.Resource, $.EventEmitter);

	var proto = rest.Resource.prototype;
	$.extend(proto, /** @lends rest.Resource# */ {
		url : '/',

		query : {},

		headers : {},

		/**	Get or set global parameters, sent with each request.
		 *	@param {String} key
		 *	@param {String} value
		 */
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

		/**	Get or set global headers, sent with each request.
		 *	@param {String} header
		 *	@param {String} value
		 */
		header : function(header, value) {
			var i;
			if (typeof header==='string') {
				if (arguments.length===1) return this.headers[key];
				this.headers[header.toLowerCase()] = value;
			}
			if (typeof header==='object') {
				for (i in header) if (header.hasOwnProperty(i)) {
					this.header(i, header[i]);
				}
			}
			return this;
		},

		index : function(callback, options) {
			return this._call('GET /', null, callback, options);
		},

		get : function(id, callback, options) {
			return this._call('GET /' + id, null, callback, options);
		},

		post : function(obj, callback, options) {
			return this._call('POST /', obj, callback, options);
		},

		put : function(id, obj, callback, options) {
			if (id && typeof id==='object' && typeof obj==='function') {
				callback = obj;
				obj = id;
				id = obj[this.idKey];
			}
			return this._call('PUT /' + id, obj, callback, options);
		},

		del : function(id, callback, options) {
			return this._call('DELETE /' + id, null, callback, options);
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
				headers = $.extend({}, this.headers),
				query = $.extend({}, this.query),
				parts = url.split(' '),
				path, relativeUrl, querystring;
			options = options || {};

			if (options.headers) {
				$.forEach(options.headers, function(value, key) {
					headers[key.toLowerCase()] = value;
				});
			}
			if (options.query) {
				$.extend(query, options.query);
			}

			if (parts[0]===parts[0].toUpperCase()) {
				method = parts.splice(0, 1)[0];
			}
			url = parts.join(' ');
			url = ('/' + url.replace(/(^\/+|\/+$)/g, '')).replace(/\/+$/g,'');
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

			if (options.responseType) {
				req.responseType = options.responseType;
			}

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
					isError = !res.status || res.status>=400,
					token, evts, i, r;
				reg.lastIndex = 0;
				while ( (token=reg.exec(responseHeaders)) ) {
					res.headers[token[1].toLowerCase()] = this.request.getResponseHeader(token[1]);
				}
				if (this.request.responseType==='json') {
					res.json = this.request.response;
				}
				else if (res.data.match(/^(?:\s|\n)*(\{[\s\S]*\}|\[[\s\S]*\]|\"[\s\S]*\")(?:\s|\n)*$/)) {
					res.json = $.json.parse(res.data);
				}

				res.error = isError ? (res.json || res.data || 'Error '+res.status) : null;
				res.response = !isError ? res.json || res.data : null;
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
