/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const { posix: { resolve } } = require( "path" );

const { Model, Adapter, MemoryAdapter, String: { kebapToCamel }, Uuid: { ptnUuid } } = require( "hitchy-odem" );
const Log = require( "debug" )( "plugin-odem" );


module.exports = function( options ) {
	const api = this;

	return {
		blueprints: function( options ) {
			const { runtime: { models, config } } = this;

			const modelNames = Object.keys( models );
			const routes = new Map();

			let adapter = ( config.database || {} ).default;
			if ( adapter ) {
				if ( !( adapter instanceof Adapter ) ) {
					Log( "invalid adapter:", adapter );
					return;
				}
			} else {
				adapter = new MemoryAdapter();
			}

			const urlPrefix = ( config.model || {} ).urlPrefix || "/api";


			for ( let i = 0, numNames = modelNames.length; i < numNames; i++ ) {
				const name = modelNames[i];
				const definition = models[name] || {};

				const routeName = name.toLocaleLowerCase();
				const modelName = definition.name || ( routeName.slice( 0, 1 ).toLocaleUpperCase() + kebapToCamel( routeName ).slice( 1 ) );

				const schema = {};

				mergeAttributes( schema, definition.attributes || {} );
				mergeComputeds( schema, definition.computeds || {} );
				mergeHooks( schema, definition.hooks || {} );

				const model = Model.define( modelName, schema, null, adapter );

				addRoutesOnModel( routes, urlPrefix, routeName, model );
			}

			return routes;
		},
	};
};

/**
 * Merges separately defined map of static attributes into single schema
 * matching expectations of hitchy-odem.
 *
 * @param {object} target resulting schema for use with hitchy-odem
 * @param {object<string,function>} source maps names of attributes into either one's definition of type and validation requirements
 * @returns {void}
 */
function mergeAttributes( target, source ) {
	const propNames = Object.keys( source );

	for ( let i = 0, numNames = propNames.length; i < numNames; i++ ) {
		const name = propNames[i];
		const attribute = source[name];

		switch ( typeof attribute ) {
			case "object" :
				if ( attribute ) {
					break;
				}

			// falls through
			default :
				throw new TypeError( `invalid definition of attribute named "${name}": must be object` );
		}

		target[name] = attribute;
	}
}

/**
 * Merges separately defined map of computed attributes into single schema
 * matching expectations of hitchy-odem.
 *
 * @param {object} target resulting schema for use with hitchy-odem
 * @param {object<string,function>} source maps names of computed attributes into the related computing function
 * @returns {void}
 */
function mergeComputeds( target, source ) {
	const propNames = Object.keys( source );

	for ( let i = 0, numNames = propNames.length; i < numNames; i++ ) {
		const name = propNames[i];
		const computer = source[name];

		switch ( typeof computer ) {
			case "function" :
				break;

			default :
				throw new TypeError( `invalid definition of computed attribute named "${name}": must be a function` );
		}

		target[name] = computer;
	}
}

/**
 * Merges separately defined map of lifecycle hooks into single schema matching
 * expectations of hitchy-odem.
 *
 * @param {object} target resulting schema for use with hitchy-odem
 * @param {object<string,(function|function[])>} source maps names of lifecycle hooks into the related callback or list of callbacks
 * @returns {void}
 */
function mergeHooks( target, source ) {
	const propNames = Object.keys( source );

	for ( let i = 0, numNames = propNames.length; i < numNames; i++ ) {
		const name = propNames[i];
		let hook = source[name];

		if ( typeof hook === "function" ) {
			hook = [hook];
		}

		if ( !Array.isArray( hook ) ) {
			throw new TypeError( `invalid definition of hook named "${name}": must be a function or list of functions` );
		}

		for ( let hi = 0, numHooks = hook.length; hi < numHooks; hi++ ) {
			if ( typeof hook[hi] !== "function" ) {
				throw new TypeError( `invalid definition of hook named "${name}": not a function at index #${hi}` );
			}
		}

		target[name] = hook;
	}
}

/**
 * Adds routes handling common requests related to selected model.
 *
 * @param {Map<string,function(req:IncomingMessage,res:ServerResponse):Promise>} routes maps route patterns into function handling requests matching that pattern
 * @param {string} urlPrefix common prefix to use on every route regarding any model-related processing
 * @param {string} routeName name of model to be used in path name of request
 * @param {Model} model model instance
 * @returns {void}
 */
function addRoutesOnModel( routes, urlPrefix, routeName, model ) {
	routes.set( "GET " + resolve( urlPrefix, routeName, "create" ), reqCreateItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "add" ), reqCreateItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "has", ":uuid" ), reqCheckItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "update", ":uuid" ), reqUpdateItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "write", ":uuid" ), reqUpdateItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "remove", ":uuid" ), reqRemoveItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "delete", ":uuid" ), reqRemoveItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "get", ":uuid" ), reqFetchItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "read", ":uuid" ), reqFetchItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "find", ":attribute", ":operator", ":value" ), reqListMatches );

	routes.set( "GET " + resolve( urlPrefix, routeName, ":uuid" ), reqFetchItem );

	routes.set( "GET " + resolve( urlPrefix, routeName ), reqListAll );

	routes.set( "HEAD " + resolve( urlPrefix, routeName, ":uuid" ), reqCheckItem );

	routes.set( "SEARCH " + resolve( urlPrefix, routeName, ":attribute", ":operator", ":value" ), reqListMatches );

	routes.set( "SEARCH " + resolve( urlPrefix, routeName ), reqListAll );

	routes.set( "PUT " + resolve( urlPrefix, routeName ), reqCreateItem );

	routes.set( "POST " + resolve( urlPrefix, routeName, ":uuid" ), reqUpdateItem );

	routes.set( "DELETE " + resolve( urlPrefix, routeName, ":uuid" ), reqRemoveItem );


	/**
	 * Handles request for checking whether some selected item of model exists
	 * or not.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqCheckItem( req, res ) {
		Log( "got request checking if some item exists" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { message: "invalid UUID" } );
			return;
		}

		const item = new model( uuid );

		return item.exists
			.then( exists => {
				res.json( { exists } );
			} )
			.catch( error => {
				Log( "checking %s:", routeName, error );
				res.status( 500 ).json( { message: error.message } );
			} );
	}

	/**
	 * Handles request for fetching data of selected item.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqFetchItem( req, res ) {
		Log( "got request fetching some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { message: "invalid UUID" } );
			return;
		}

		const item = new model( uuid );
		if ( !item.exists ) {
			res.status( 404 ).json( { message: "selected item not found" } );
			return;
		}

		return item.load()
			.then( loaded => res.json( loaded.properties ) )
			.catch( error => {
				Log( "fetching %s:", routeName, error );
				res.status( 500 ).json( { message: error.message } );
			} );
	}

	/**
	 * Handles request for listing all items of model.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqListMatches( req, res ) {
		Log( "got request listing matching items" );

		const { offset = 0, limit = Infinity } = req.query;
		const { attribute, value, operator } = req.params;

		return model.findByAttribute( attribute, value, operator, offset, limit )
			.then( matches => {
				res.json( matches.map( match => match.toObject() ) );
			} )
			.catch( error => {
				Log( "querying %s:", routeName, error );
				res.status( 500 ).json( { message: error.message } );
			} );
	}

	/**
	 * Handles request for listing all items of model matching single given
	 * condition.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqListAll( req, res ) {
		Log( "got request listing all items" );

		const { offset = 0, limit = Infinity } = req.query;

		return model.list( offset, limit, true )
			.then( matches => {
				res.json( matches.map( match => match.toObject() ) );
			} )
			.catch( error => {
				Log( "listing %s:", routeName, error );
				res.status( 500 ).json( { message: error.message } );
			} );
	}

	/**
	 * Handles request for adding new item.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqCreateItem( req, res ) {
		Log( "got request creating item" );

		const item = new model();

		const record = ( req.method === "GET" ? req.query : req.body ) || {};
		const propNames = Object.keys( record );
		for ( let ni = 0, numNames = propNames.length; ni < numNames; ni++ ) {
			const propName = propNames[ni];

			item.properties[propName] = record[propName];
		}

		return item.save()
			.then( saved => {
				Log( "created %s with %s", routeName, saved.uuid );
				res.json( { uuid: saved.uuid } );
			} )
			.catch( error => {
				Log( "creating %s:", routeName, error );
				res.status( 500 ).json( { message: error.message } );
			} );
	}

	/**
	 * Handles request for updating properties of a selected item.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqUpdateItem( req, res ) {
		Log( "got request updating some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { message: "invalid UUID" } );
			return;
		}

		const item = new model( uuid );
		return item.exists
			.then( exists => {
				if ( !exists ) {
					res.status( 404 ).json( { message: "selected item not found" } );
					return;
				}

				return item.load()
					.then( loaded => {
						const record = ( req.method === "GET" ? req.query : req.body ) || {};
						const propNames = Object.keys( record );
						for ( let ni = 0, numNames = propNames.length; ni < numNames; ni++ ) {
							const propName = propNames[ni];

							loaded.properties[propName] = record[propName];
						}

						return loaded.save()
							.then( saved => {
								res.json( { uuid: saved.uuid } );
							} )
							.catch( error => {
								Log( "updating %s:", routeName, error );
								res.status( 500 ).json( { message: error.message } );
							} );
					} );
			} );
	}

	/**
	 * Handles request for removing selected item.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqRemoveItem( req, res ) {
		Log( "got request removing some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { message: "invalid UUID" } );
			return;
		}

		const item = new model( uuid );
		return item.exists
			.then( exists => {
				if ( exists ) {
					return item.remove()
						.then( () => res.json( { uuid, status: "OK", action: "remove" } ) )
						.catch( error => {
							Log( "removing %s:", routeName, error );
							res.status( 500 ).json( { message: error.message } );
						} );
				}

				Log( "request for removing missing %s ignored", routeName );
				res.json( { uuid, status: "OK", action: "remove" } );
			} );
	}
}
