# plugin-odem-rest

exposing RESTful access on Hitchy's ODM

[Hitchy](http://hitchyjs.org) is a server-side framework for developing web applications with [Node.js](https://nodejs.org). [Odem](https://www.npmjs.com/package/hitchy-plugin-odem) is plugin for Hitchy implementing an object document management (ODM) using data backends like regular file systems, LevelDBs and temporary in-memory databases.
 
This plugin is defining blueprint routes for accessing data managed in ODM using REST API.


## Installation

In your Hitchy-based application run

```bash
npm i hitchy-plugin-odem-rest
```

This will install [hitchy-plugin-odem](https://www.npmjs.com/package/hitchy-plugin-odem) implicitly. Thus you don't have to add it as a dependency explicitly.

## Usage

Create **api/models** in your Hitchy-based project and add a file there for every model to be managed by ODM. See the [documentation of hitchy-plugin-odem]() for additional information on how to define models in filesystem.

Let's assume there is a file **api/models/employee.js** containing this code:

```javascript
module.exports = {
	name: "EmployeeInfos",
	attributes: {
		lastName: {
			type: "string",
			required: true,
		},
		firstName: {
			type: "string",
			required: true,
		},
		birthday: {
			type: "date",
		},
		salary: {
			type: "decimal",
		},
		availableForOutsourcing: {
			type: "boolean",
		},
	},
	computeds: {
		fullName: function() {
			return `${this.lastName}, ${this.firsName}`;
		}
	},
	hooks: {
		beforeValidate: [
			function( errors ) {
				if ( isNaN( this.birthday ) ) {
					errors.push( new Error( "invalid birthday" ) );
				}
			},
		],
	},
};
```


### Blueprint Routes

This plugin is defining a set of blueprint routes implementing REST API for every model defined in file system.

Those routes comply with this pattern:

* `<prefix>/<model>` is addressing a model or its collection of items
* `<prefix>/<model>/<uuid>` is addressing a single item of a model

The prefix is `/api` by default. This is adjustable by putting content like this into file **config/model.js**:

```javascript
exports.model = {
    urlPrefix: "/my/custom/prefix"
};
```

The model's segment in URL is derived as the kebab-case version of model's name which is given in PascalCase. Thus the model in file **api/models/my-fancy-model.js** will be exposed as **MyFancyModel** on server-side, which is available via URL path names starting with `/api/my-fancy-model`.


#### Reading Item

* `GET /api/employee/12345678-1234-1234-1234-1234567890ab`  

Requests like these will return the selected item's attributes and computed attributes in JSON format. 
  
In opposition to requests for listing items this request doesn't include used UUID with response.

#### Updating Item

* `PUT /api/employee/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/update/12345678-1234-1234-1234-1234567890ab`    
  `GET /api/employee/write/12345678-1234-1234-1234-1234567890ab`  

These requests are available for adjusting properties of existing items. The first version expects JSON-formatted object in request's body list names and new values of attributes to be updated. The latter two formats are provided e.g. for conveniently simulating updates in browser with names and values of attributes provided in query parameters.

#### Checking Item

* `HEAD /api/employee/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/has/12345678-1234-1234-1234-1234567890ab`

  These requests are checking whether some item is available or not. They don't return any properties of found item but some object in JSON format describing whether selected item exists or not.

#### Creating Item

* `POST /api/employee`  
  `GET /api/employee/add`    
  `GET /api/employee/create`  

  With these requests new items may be created. Properties are provided JSON-formatted in request body in case of first version and in query parameters in the remaining variants. On success, the created item's UUID is returned in a JSON-formatted object.

#### Deleting Item

* `DELETE /api/employee/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/delete/12345678-1234-1234-1234-1234567890ab`    
  `GET /api/employee/remove/12345678-1234-1234-1234-1234567890ab`  

  These requests remove a selected item. The response is a JSON-formatted object describing whether removing item succeeded or not.

#### Listing All Items

* `SEARCH /api/employee`  
  `GET /api/employee`  

  These requests unconditionally list all items available. Query parameters `offset` and `limit` can be used to fetch a slice of resulting list, only.

#### Finding Items

* `SEARCH /api/employee/:attribute/:operation/:value`  
  `GET /api/employee/find/:attribute/:operation/:value`  

  These requests list all items matching provided test. Query parameters `offset` and `limit` can be used to fetch a slice of matching items, only.
  
  The three segments `:attribute`, `:operation` and `:value` describe a test to be performed on all items of model. Succeeding items are considered matches to be included with resulting list. `:attribute` selects name of (basic, not computed) attribute to be tested on every existing item. `:operation` is the name of a unary or binary operation used as a test. On binary operations `:value` is compared with value of either existing item's attribute. On unary operations `:value` must be given to match the routing pattern but is ignored. These operations are available:
  
  | Name    | Operation                | Binary? |
  | ------- | ------------------------ | ------- |
  | eq      | is equal                 | yes     |
  | noteq   | is not equal             | yes     |
  | lt      | is less than             | yes     |
  | lte     | is less than or equal    | yes     |
  | gt      | is greater than          | yes     |
  | gte     | is greater than or equal | yes     |
  | null    | is not set               | no      |
  | notnull | is set                   | no      |
  | not     | is falsy                 | no      |

## Defining Models in Extensions

Installed extensions may provide the same set of files using subfolder **api/models**, too. They are discovered by Hitchy's bootstrap and obeyed by this plugin automatically.
