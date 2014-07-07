puredom-rest
============

A high-level network abstraction that makes working with REST APIs simple.

If you prefer a server-synchronized resource model (`sync()` / `fetch()` paradigm), check out [puredom-model](http://github.com/developit/puredom-model).


---


Instantiation
-------------

**Using AMD:**  

```JavaScript
require('puredom-rest', function(rest) {
	var users = rest('/api/users');
	
	// users is a rest.Resource instance:
	alert(users instanceof rest.Resource);
});
```

**Without AMD:**  

```HTML
<script src="puredom-rest.js"></script>
<script>
	var users = rest('/api/users');
	
	// users is a rest.Resource instance:
	alert(users instanceof rest.Resource);
</script>
```


---

API
---


# rest(url) / new rest.Resource(url)
Create a new `rest.Resource` instance for the resource at a given URL.  

```JavaScript
var users = rest('/api/users');
// equivalent to:
var users = new rest.Resource('/api/users');
```


# .index(callback)
Get a list of resources

```JavaScript
users.index(function(list) {
	// list is an Array of users
	console.log('Users: ', list);
});
```


# .get(id, callback)
Get a single resource

```JavaScript
users.get('myid', function(user) {
	console.log('User "myid": ', user);
});
```


# .post(data, callback)
Create a new resource.

```JavaScript
users.post({
	username : 'joe',
	password : 'super secret password'
}, function(user) {
	console.log('New user: ', user);
});
```


# .put(id, data, callback)
Update an existing resource, indicated by its ID.

```JavaScript
users.put('myid', {
	status : 'awesome'
}, function(user) {
	console.log('Updated user: ', user);
});
```


# .del(id, callback)
Update an existing resource, indicated by its ID.  
*If you don't care about IE, you can also use this as:* `delete()`  

```JavaScript
users.del('myid', function(res) {
	console.log('Delete response: ', res);
});
```


# .param(key [, value])
Get or set a querystring parameter to send on each request.  

- If `value` is set: adds a global querystring parameter `key` with a value of `value`  
- If `value` is empty: returns the current value of the global parameter `key`  
- If `key` is an Object: adds `key`'s key-value property pairs as global parameters  

```JavaScript
// Send a token on all subsequent requests:
users.param('token', 'abcdefg');

// Get the current token value:
var token = users.param('token');
console.log(token);
```


---

Events
------


# req
`function handler(req) {}`  
Hook the `req` event to be notified prior to all requests.  
Event handlers get passed the `puredom.HttpRequest` instance `req`.  

```JavaScript
users.on('req', function(req) {
	console.log('Request: ', req.method, req.url, req.body);
});
```


# req:/url
`function handler(req) {}`  
Add an event handler for "req:" followed by relative URL (ex: `req:/users`) to be notified when a request is made to the given URL.  
This is just a more specific version of the `req` event.  

```JavaScript
users.on('req:/users', function(req) {
	console.log('User list request: ', req.method);
});
```


# status
`function handler(req, res) {}`  
Hook the `status` event to be notified of the status of every response.  
Event handlers get passed the `puredom.HttpRequest` instance (`req`), and the response object (`res`).  

```JavaScript
users.on('status', function(req, res) {
	console.log('Status: ', res.status);
});
```


# status:N
`function handler(req, res) {}`  
Add an event handler for "status:" followed by a specific response status code (ex: `status:401`) to be notified when a response is issued with that status.  
This is just a more specific version of the `status` event.  

```JavaScript
users.on('status', function(req, res) {
	console.log('Status: ', res.status);
});
```


# res
`function handler(req, res) {}`  
Hook the `res` event to be notified of all responses.  
Event handlers get passed the `puredom.HttpRequest` instance (`req`), and the response object (`res`).  

```JavaScript
users.on('res', function(req, res) {
	console.log('Response: ', req.url, res.headers, res.json);
});
```


# res:/url
`function handler(req, res) {}`  
Add an event handler for "res:" followed by relative URL (ex: `res:/users`) to be notified when a response is received from the given URL.  
This is just a more specific version of the `res` event.  

```JavaScript
users.on('res:/users', function(req, res) {
	console.log('User list response: ', res.headers, res.json);
});
```


