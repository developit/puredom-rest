/** A synchronized model base class. */
(function(factory) {
	if (typeof window.define==='function' && window.define.amd) {
		window.define(['puredom'], factory);
	}
	else {
		factory(window.puredom);
	}
}(function($) {
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

	$.extend(rest.Resource.prototype, /** @lends rest.Resource# */ {
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
			return this._call('PUT /' + id, obj, callback);
		},

		del : function(id, callback) {
			return this._call('DELETE /' + id, null, callback);
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
			
			if (method==='POST') {
				body = $.querystring.stringify(body);
			}
			else if (body) {
				headers['content-type'] = 'application/json';
				body = $.json.stringify(body);
			}
			
			var req = {
				path : path,
				querystring : querystring,
				query : query,
				url : relativeUrl,
				fullUrl : url,
				method : method,
				headers : headers,
				body : body
			};
			this.fireEvent('req', req);
			this.fireEvent('req:' + relativeUrl, req);

			$.net.request({
				url : url,
				method : method,
				headers : headers,
				body : body,
				callback : function() {
					var res = {
							status : this.status,
							data : this.responseText + '',
							headers : {}
						},
						responseHeaders = this.request.getAllResponseHeaders(),
						reg = /^([a-z\-]+)\s*\:/gim,
						token, evts, i;
					reg.lastIndex = 0;
					while ( (token=reg.exec(responseHeaders)) ) {
						res.headers[token[1].toLowerCase()] = this.request.getResponseHeader(token[1]);
					}
					if (this.request.responseType==='json') {
						res.json = this.request.response;
					}
					else if (res.data.match(/^(\{[\s\S]+\}|\[[\s\S]+\]|\"[\s\S]+\")$/)) {
						res.json = $.json.parse(res.data);
					}

					res.error = res.status>=400 ? res.json || res.data : null;
					res.response = res.status<400 ? res.json || res.data : null;

					evts = [
						'status',
						'status:' + res.status,
						'res',
						'res:' + relativeUrl
					];
					for (i=0; i<evts.length; i++) {
						self.fireEvent(evts[i], [req, res]);
					}

					callback.call(self, res.error, res.response, res);
				}
			});

			return this;
		}
	});
	
	try {
		rest.Resource.prototype['delete'] = rest.Resource.prototype.del;
	} catch(err) {}

	$.rest = rest.rest = rest;
	return rest;
}));