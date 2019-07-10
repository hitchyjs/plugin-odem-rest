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
	return {
		policies: function( options ) {
			const source = "ALL " + ( ( this.runtime.config.model || {} ).urlPrefix || "/api" );

			return {
				[source]: function( req, res, next ) {
					res.setHeader( "Access-Control-Allow-Origin", "*" );
					next();
				}
			};
		},
		blueprints: function( options ) {
			const { runtime: { models, config } } = this;

			const modelNames = Object.keys( models );
			const routes = new Map();
			const urlPrefix = ( config.model || {} ).urlPrefix || "/api";

			for ( let i = 0, numNames = modelNames.length; i < numNames; i++ ) {
				const name = modelNames[i];
				const routeName = name.toLocaleLowerCase();
				const model = models[name] || {};

				addRoutesOnModel( routes, urlPrefix, routeName, model );
			}

			return routes;
		},
	};
};

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

	routes.set( "POST " + resolve( urlPrefix, routeName ), reqCreateItem );

	routes.set( "PUT " + resolve( urlPrefix, routeName, ":uuid" ), reqUpdateItem );

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

		const { offset = 0, limit = Infinity, sortBy = "", descending = false } = req.query;
		const { attribute, value, operator } = req.params;
		const meta = req.headers["x-count"] ? {} : null;

		const sortModification = descending? -1: 1;

		return model.findByAttribute( attribute, value, operator, 0, Infinity, meta )
			.then( matches => {
				const result = {
					items: matches.map( match => match.toObject() ).sort(( l , r ) => {
						const lAtt = l[sortBy];
						const rAtt = r[sortBy];
						if( (lAtt == null && rAtt == null) || lAtt === rAtt ){
							return 0;
						}
						if( lAtt == null ){
							return 1;
						}
						if( rAtt == null){
							return -1;
						}
						return lAtt > rAtt? sortModification: -sortModification;
					}).slice(offset, offset + limit),
				};

				if ( meta ) {
					res.set( "x-count", meta.count );
				}

				if ( req.headers["x-list-as-array"] ) {
					res.json( result.items );
				} else {
					if ( meta ) {
						result.count = meta.count;
					}

					res.json( result );
				}
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

		const { offset = 0, limit = Infinity, sortBy = "uuid", descending = false } = req.query;
		const meta = req.headers["x-count"] ? {} : null;

		const sortModification = descending? -1: 1;

		return model.list( 0, Infinity, true, meta )
			.then( matches => {
				const result = {
					items: matches.map( match => match.toObject() ).sort(( l , r ) => {
						const lAtt = l[sortBy];
						const rAtt = r[sortBy];
						if( (lAtt == null && rAtt == null) || lAtt === rAtt  ){
							return 0;
						}
						if( lAtt == null ){
							return 1;
						}
						if( rAtt == null){
							return -1;
						}
						return lAtt > rAtt? sortModification: -sortModification;
					}).slice(Number(offset), Number(offset) + Number(limit)),
				};

				if ( meta ) {
					res.set( "x-count", meta.count );
				}

				if ( req.headers["x-list-as-array"] ) {
					res.json( result.items );
				} else {
					if ( meta ) {
						result.count = meta.count;
					}

					res.json( result );
				}
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

		return ( req.method === "GET" ? Promise.resolve( req.query ) : req.fetchBody() )
			.then( record => {
				if ( record ) {
					const propNames = Object.keys( record );
					const numNames = propNames.length;

					for ( let i = 0; i < numNames; i++ ) {
						const propName = propNames[i];

						item.properties[propName] = record[propName];
					}
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

				return Promise.all( [
					item.load(),
					req.method === "GET" ? Promise.resolve( req.query ) : req.fetchBody(),
				] )
					.then( ( [ loaded, record ] ) => {
						if ( record ) {
							const propNames = Object.keys( record );
							const numNames = propNames.length;

							for ( let i = 0; i < numNames; i++ ) {
								const propName = propNames[i];

								loaded.properties[propName] = record[propName];
							}
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
