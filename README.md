# plugin-odem-rest

exposing RESTful access on Hitchy's ODM

[Hitchy](http://hitchyjs.org) is a server-side framework for developing web applications with [Node.js](https://nodejs.org). [Odem](https://www.npmjs.com/package/hitchy-plugin-odem) is plugin for Hitchy implementing an object document management (ODM) using data backends like regular file systems, LevelDBs and temporary in-memory databases.
 
This plugin is defining blueprint routes for accessing data managed in ODM using REST API.


## Installation

In your Hitchy-based application run

```bash
npm i hitchy-plugin-odem-rest
```

This will install this plugin and the underlying [hitchy-plugin-odem](https://www.npmjs.com/package/hitchy-plugin-odem) implicitly. Thus you don't have to add it as a dependency explicitly.

## Usage

This module strongly depends on [hitchy-plugin-odem](https://www.npmjs.com/package/hitchy-plugin-odem) and its preparation of model definitions discovered by [Hitchy's core](https://hitchyjs.github.io/core/). There are separate documentations for either feature.

For a quick start create folder **api/models** in your Hitchy-based project and add another file for every model of your application.

Let's assume there is a file **api/models/local-employee.js** containing this code:

```javascript
module.exports = {
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
			type: "number",
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
};
```

When starting your Hitchy-based application it will discover a model named **LocalEmployee** and expose it via REST API using URLs like `/api/local-employee` just because of this module and its two dependencies in context of your application as mentioned before.

#### Models of Hitchy Plugins

Due to the way Hitchy is discovering plugins and compiling [components](https://hitchyjs.github.io/core/internals/components.html) defined there this plugin is always covering models defined in installed plugins as well.


### How it works

This plugin is defining a set of [blueprint routes](https://hitchyjs.github.io/core/internals/routing-basics.html#focusing-on-routes) implementing REST API for every model defined in file system as described before.

Those routes comply with this pattern:

* `<prefix>/<model>` is addressing a model or its collection of items
* `<prefix>/<model>/<uuid>` is addressing a single item of a model

The prefix is `/api` by default. It is adjustable by putting content like this into file **config/model.js**:

```javascript
exports.model = {
    urlPrefix: "/my/custom/prefix"
};
```

The model's segment in URL `<model>` is derived as the kebab-case version of model's name which is given in PascalCase. Thus the model in file **api/models/my-fancy-model.js** is assumed to define model named **MyFancyModel** by default, resulting in model's URL segment to be **my-fancy-model** again. So the URL path for the collection of items is `/api/my-fancy-model`.

In Hitchy's ODM all model instances or items are uniquely addressable via UUID. By appending an item's UUID to the given URL path of a collection you get the URL path of that item, e.g. `/api/my-fancy-model/01234567-1234-1234-1234-56789abcdef0`.


### The REST API

The provided routes implement these actions:

| Method | URL | Action |
|---|---|---|
| GET | `/api/model` | Lists items of selected model. |
| GET | `/api/model/<uuid>` | Fetches properties of selected item. |
| PUT | `/api/model/<uuid>` | Replaces all properties of selected item with those given in request body. Selected item is created when missing. |
| PATCH | `/api/model/<uuid>` | Adjusts selected item by replacing values of properties given in request body (leaving those missing in request body untouched). |
| POST | `/api/model` | Creates new item initialized with properties provided in request body. |
| DELETE | `/api/model/<uuid>`  | Removes selected item from model's collection. |
| HEAD | `/api/model` | Tests if selected model exists. |
| HEAD | `/api/model/<uuid>` | Tests if selected item exists. |

The API is accepting and returning data in JSON format.

Response status code is used to indicate basic result of either requests.

| Status | Reason |
|---|---|
| 200 | A request was successful. In case of HEAD-request the tested model or item exists. |
| 201 | A POST request was successful in creating another item. |
| 400 | A given UUID is malformed. |
| 403 | A requested action is forbidden, e.g. trying to delete a model. |
| 404 | A requested model or item wasn't found. |
| 405 | A given method isn't allowed on selected model or item. This is basically a more specific information related to performing some invalid request like trying to PATCH a whole model instead of a single item. |


### Convenience Routes

By default, the module is exposing another set of routes for every model that enables requesting either supported action using GET-requests. This is assumed to be very useful in development e.g. to conveniently add or remove items using regular browser.

The URL path is extended to insert an action's name after the model's name and before some optionally given UUID.

| Convenience Route | Related REST Action |
|---|---|
| `GET /api/model/create` | `POST /api/model` |
| `GET /api/model/write/<uuid>` | `PATCH /api/model/<uuid>` |
| `GET /api/model/replace/<uuid>` | `PUT /api/model/<uuid>` |
| `GET /api/model/has/<uuid>` | `HEAD /api/model/<uuid>` |
| `GET /api/model/remove/<uuid>` | `DELETE /api/model/<uuid>` |

There are no extra routes following this pattern for actions that are exposed via GET-methods already.

All request data is provided in query parameters instead of request body for GET requests don't have a body.

#### Disabling Feature

This feature may be disabled using configuration in file **config/model.js** exposing configuration like this one:

```javascript
exports.model = {
    convenience: false,
};
``` 


### Extended Fetching of Items

Whenever fetching a list of items using GET request on a model's URL there are additional options for controlling the retrieved list.

#### Sorting

Using query parameter `sortBy=lastName` a fetched list of items is sorted by values of named property (which is `lastName` in this example) in ascending order. By providing another query parameter `descending=1` the sorting is done in descending order.


#### Slicing

Query parameter `limit=n` is requesting to fetch at most **n** items. Parameter `offset=n` is requesting to skip **n** items before starting retrieval.


#### Filtering

Using query parameter `q` the list of fetched items can be limited to those items matching criteria given in that query parameter. The abbreviated name `q` just refers to a _search query_.

##### Simple Comparisons

The search query may comply with the pattern `name:operation:value` to compare every item's property with a given value using one of these operations:
  
| Name | Operation                |
|------|--------------------------|
| eq   | is equal                 |
| neq  | is not equal             |
| lt   | is less than             |
| lte  | is less than or equal    |
| gt   | is greater than          |
| gte  | is greater than or equal |

For example, a GET-request for `/api/localEmployee?q=lastName:eq:Doe` will deliver all items of model **LocalEmployee** with property **lastName** equal given value **Doe**. The value may contain further colons.

##### Complex Tests

There will be more complex tests supported in future versions using different formats in query parameter `q`.
