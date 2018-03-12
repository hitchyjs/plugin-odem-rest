# plugin-odem-rest

exposing RESTful access on Hitchy's ODM

[Hitchy](http://hitchyjs.org) is a server-side framework for developing web applications with [NodeJS](https://nodejs.org). [Odem](https://www.npmjs.com/package/hitchy-odem) is Hitchy's object document management providing data backends like regular file systems, LevelDBs and temporary in-memory databases. This plugin is the missing glue between these two components.

## Installation

In your Hitchy-based application run

```bash
npm install --save hitchy-plugin-odem-rest
```

This will install [hitchy-odem](https://www.npmjs.com/package/hitchy-odem) implicitly.

## Usage

In your Hitchy-based application create a subfolder **api/models** and add a module file for every model to be available in ODM there. Every such module is exposing the model's schema like this example:

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

### Model's Name

The model's name is derived from filename used to name the module file. You might use property **name** in module itself to selected model's name explicitly.

When you put this in a file **api/models/employee.js** the plugin is using odem to define a model named **EmployeeInfos** due to the explicitly provided property **name** in module. By omitting this property the model's name is derived from module's filename. Filenames are considered case-insensitive and thus converted to all lowercase characters, first. After that the filename is converted from kebap-case to PascalCase becoming the model's name. So, if there were no property **name** in example above the resulting model's name would be **Employee**.

### Blueprint Routes

The plugin is injecting blueprint routes exposing controllers for common actions per model in a RESTful way. 

> Routes always rely on the all-lowercase filename used on module defining model.

#### Reading Item

* `GET /api/employee/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/read/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/get/12345678-1234-1234-1234-1234567890ab`

  Requests like these will return the selected item's attributes and computed attributes in JSON format. 
  
  In opposition to requests for listing items this request doesn't include used UUID with response.

#### Updating Item

* `POST /api/employee/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/update/12345678-1234-1234-1234-1234567890ab`    
  `GET /api/employee/write/12345678-1234-1234-1234-1234567890ab`  

  These requests are available for adjusting properties of existing items. The first version expects JSON-formatted object in request's body list names and new values of attributes to be updated. The latter two formats are provided e.g. for conveniently simulating updates in browser with names and values of attributes provided in query parameters.

#### Checking Item

* `HEAD /api/employee/12345678-1234-1234-1234-1234567890ab`  
  `GET /api/employee/has/12345678-1234-1234-1234-1234567890ab`

  These requests are checking whether some item is available or not. They don't return any properties of found item but some object in JSON format describing whether selected item exists or not.

#### Creating Item

* `PUT /api/employee`  
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
