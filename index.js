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

const { UUID: { ptnUuid } } = require( "hitchy-odem" );


module.exports = function() {
	return {
		policies() {
			const source = "ALL " + ( ( this.runtime.config.model || {} ).urlPrefix || "/api" );

			return {
				[source]: function( req, res, next ) {
					res.setHeader( "Access-Control-Allow-Origin", "*" );
					next();
				}
			};
		},
		blueprints() {
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
 * @param {Map<string,function(req:IncomingMessage,res:ServerResponse):Promise>} routes maps
 *        route patterns into function handling requests matching that pattern
 * @param {string} urlPrefix common prefix to use on every route regarding any model-related processing
 * @param {string} routeName name of model to be used in path name of request
 * @param {Model} model model instance
 * @returns {void}
 */
function addRoutesOnModel( routes, urlPrefix, routeName, model ) {
	// implement non-REST-compliant rules to simplify manual control of data via browser
	routes.set( "GET " + resolve( urlPrefix, routeName, "create" ), reqCreateItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "add" ), reqCreateItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "has", ":uuid" ), reqCheckItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "replace", ":uuid" ), reqReplaceItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "update", ":uuid" ), reqModifyItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "write", ":uuid" ), reqModifyItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "remove", ":uuid" ), reqRemoveItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "delete", ":uuid" ), reqRemoveItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "get", ":uuid" ), reqFetchItem );
	routes.set( "GET " + resolve( urlPrefix, routeName, "read", ":uuid" ), reqFetchItem );

	routes.set( "GET " + resolve( urlPrefix, routeName, "find" ), reqListMatches );

	// here comes the REST-compliant part
	routes.set( "GET " + resolve( urlPrefix, routeName ), reqFetchItems );
	routes.set( "GET " + resolve( urlPrefix, routeName, ":uuid" ), reqFetchItem );

	routes.set( "HEAD " + resolve( urlPrefix, routeName, ":uuid" ), reqCheckItem );
	routes.set( "HEAD " + resolve( urlPrefix, routeName ), ( req, res ) => res.status( 200 ).send() );
	routes.set( "HEAD " + resolve( urlPrefix, ":model" ), ( req, res ) => res.status( 404 ).send() );

	routes.set( "POST " + resolve( urlPrefix, routeName, ":uuid" ), ( req, res ) => res.status( 400 ).json( { error: "new entry can not be created with uuid" } ) );
	routes.set( "POST " + resolve( urlPrefix, routeName ), reqCreateItem );

	routes.set( "PUT " + resolve( urlPrefix, routeName, ":uuid" ), reqReplaceItem );
	routes.set( "PUT " + resolve( urlPrefix, routeName ), ( req, res ) => res.status( 400 ).json( { error: "PUT is not permited on collections" } ) );
	routes.set( "PATCH " + resolve( urlPrefix, routeName, ":uuid" ), reqModifyItem );
	routes.set( "PATCH " + resolve( urlPrefix, routeName ), ( req, res ) => res.status( 400 ).json( { error: "PATCH is not permited on collections" } ) );

	routes.set( "DELETE " + resolve( urlPrefix, routeName, ":uuid" ), reqRemoveItem );
	routes.set( "DELETE " + resolve( urlPrefix, routeName ), ( req, res ) => res.status( 403 ).json( { error: "DELETE is not permited on collections" } ) );
	routes.set( "DELETE " + resolve( urlPrefix, ":model" ), ( req, res ) => res.status( 404 ).json( { error: "no such collection" } ) );


	/**
	 * Handles request for checking whether some selected item of model exists
	 * or not.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise} promises request processed successfully
	 */
	function reqCheckItem( req, res ) {
		this.api.log( "hitchy:plugin:odem:rest" )( "got request checking if some item exists" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).send();
			return undefined;
		}

		const item = new model( uuid ); // eslint-disable-line new-cap

		return item.$exists
			.then( exists => {
				res.status( exists ? 200 : 404 ).send();
			} )
			.catch( error => {
				this.api.log( "hitchy:plugin:odem:rest" )( "checking %s:", routeName, error );
				res.status( 500 ).json( { error: error.message } );
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
		this.api.log( "hitchy:plugin:odem:rest" )( "got request fetching some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { error: "invalid UUID" } );
			return undefined;
		}

		const item = new model( uuid ); // eslint-disable-line new-cap

		return item.load()
			.then( loaded => res.json( loaded.toObject() ) )
			.catch( error => {
				this.api.log( "hitchy:plugin:odem:rest" )( "fetching %s:", routeName, error );
				switch ( error.code ) {
					case "ENOENT" : {
						res.status( 404 ).json( { error: "selected item not found" } );
						break;
					}
					default : {
						res.status( 500 ).json( { error: error.message } );
					}
				}
			} );
	}

	/**
	 * Fetches items of a collection optionally required to match some provided
	 * query.
	 *
	 * @param {IncomingMessage} req incoming request
	 * @param {ServerResponse} res response controller
	 * @returns {Promise} promises response sent
	 */
	function reqFetchItems( req, res ) {
		this.api.log( "hitchy:plugin:odem:rest" )( "got request fetching items" );
		if ( req.headers["x-list-as-array"] ) {
			res.status( 400 ).json( { error: "fetching items as array is deprecated for security reasons" } );
			return undefined;
		}

		return ( req.query.query || req.query.q ? reqListMatches : reqListAll ).call( this, req, res );
	}

	/**
	 * Handles request for listing all items of model.
	 *
	 * @param {IncomingMessage} req description of request
	 * @param {ServerResponse} res API for creating response
	 * @returns {Promise|undefined} promises request processed successfully
	 */
	function reqListMatches( req, res ) {
		this.api.log( "hitchy:plugin:odem:rest" )( "got request listing matching items" );

		const { offset = 0, limit = Infinity, sortBy = "", descending = false, loadRecords = false } = req.query;
		const query = req.query.query || req.query.q;
		const meta = req.headers["x-count"] ? {} : null;

		if ( !query ) {
			res.status( 400 ).json( { error: "missing query" } );
			return undefined;
		}

		const parsed = /^([^:]+):([^:]+):(.*)$/.exec( query );
		if ( !parsed ) {
			res.status( 400 ).json( { error: "invalid query, use query=operation:name:value" } );
			return undefined;
		}

		const [ , operation, name, value ] = parsed;

		return model.findByAttribute( { [operation]: { name, value } }, { offset, limit, sortBy, sortAscendingly: !descending }, {
			metaCollector: meta,
			loadRecords
		} )
			.then( matches => {
				if ( meta ) {
					res.set( "x-count", meta.count );
				}

				const result = {
					items: matches,
				};

				if ( meta ) {
					result.count = meta.count;
				}

				res.json( result );
			} )
			.catch( error => {
				this.api.log( "hitchy:plugin:odem:rest" )( "querying %s:", routeName, error );
				res.status( 500 ).json( { error: error.message } );
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
		this.api.log( "hitchy:plugin:odem:rest" )( "got request listing all items" );

		const { offset = 0, limit = Infinity, sortBy = null, descending = false, loadRecords = true } = req.query;
		const meta = req.headers["x-count"] ? {} : null;
		return model.list( { offset, limit, sortBy, sortAscendingly: !descending }, { loadRecords, metaCollector: meta } )
			.then( matches => {
				const result = {
					items: matches.map( m => m.toObject() ),
				};

				if ( meta ) {
					res.set( "x-count", meta.count || 0 );
					result.count = meta.count || 0;
				}

				res.json( result );
			} )
			.catch( error => {
				this.api.log( "hitchy:plugin:odem:rest" )( "listing %s:", routeName, error );
				res.status( 500 ).json( { error: error.message } );
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
		this.api.log( "hitchy:plugin:odem:rest" )( "got request creating item" );

		const item = new model(); // eslint-disable-line new-cap

		return ( req.method === "GET" ? Promise.resolve( req.query ) : req.fetchBody() )
			.then( record => {
				if( record.uuid ) {
					this.api.log( "hitchy:plugin:odem:rest" )( "creating %s:", routeName, "new entry can not be created with uuid" );
					res.status( 400 ).json( { error: "new entry can not be created with uuid" } );
					return undefined;
				}

				if ( record ) {
					const propNames = Object.keys( record );
					const numNames = propNames.length;

					for ( let i = 0; i < numNames; i++ ) {
						const propName = propNames[i];

						item.$properties[propName] = record[propName];
					}
				}

				return item.save().then( saved => {
					this.api.log( "hitchy:plugin:odem:rest" )( "created %s with %s", routeName, saved.uuid );
					res.json( { uuid: saved.uuid } );
				} )
					.catch( error => {
						this.api.log( "hitchy:plugin:odem:rest" )( "creating %s:", routeName, error );
						res.status( 500 ).json( { error: error.message } );
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
	function reqModifyItem( req, res ) {
		this.api.log( "hitchy:plugin:odem:rest" )( "got request to modify some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { error: "invalid UUID" } );
			return undefined;
		}

		const item = new model( uuid ); // eslint-disable-line new-cap

		return item.$exists
			.then( exists => {
				if ( !exists ) {
					res.status( 404 ).json( { error: "selected item not found" } );
					return undefined;
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

								loaded.$properties[propName] = record[propName];
							}
						}

						return loaded.save()
							.then( saved => {
								res.json( saved.toObject() );
							} )
							.catch( error => {
								this.api.log( "hitchy:plugin:odem:rest" )( "updating %s:", routeName, error );
								res.status( 500 ).json( { error: error.message } );
							} );
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
	function reqReplaceItem( req, res ) {
		this.api.log( "hitchy:plugin:odem:rest" )( "got request replacing some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { error: "invalid UUID" } );
			return undefined;
		}

		const item = new model( uuid ); // eslint-disable-line new-cap

		return Promise.all( [ item.$exists, req.method === "GET" ? Promise.resolve( req.query ) : req.fetchBody() ] )
			.then( ( [ exists, record ] ) => {
				return ( exists ? item.load() : Promise.resolve() ).then( () => {
					const propNames = Object.keys( model.schema.props );
					const numNames = propNames.length;

					for ( let i = 0; i < numNames; i++ ) {
						const propName = propNames[i];

						item.$properties[propName] = record[propName] || null;
					}
					return item.save( { ignoreUnloaded: !exists } );
				} );
			} )
			.then( saved => {
				res.json( { uuid: saved.uuid } );
			} )
			.catch( error => {
				this.api.log( "hitchy:plugin:odem:rest" )( "updating %s:", routeName, error );
				res.status( 500 ).json( { error: error.message } );
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
		this.api.log( "hitchy:plugin:odem:rest" )( "got request removing some item" );

		const { uuid } = req.params;
		if ( !ptnUuid.test( uuid ) ) {
			res.status( 400 ).json( { error: "invalid UUID" } );
			return undefined;
		}

		const item = new model( uuid ); // eslint-disable-line new-cap

		return item.$exists
			.then( exists => {
				if ( exists ) {
					return item.remove()
						.then( () => res.json( { uuid, status: "OK", action: "remove" } ) )
						.catch( error => {
							this.api.log( "hitchy:plugin:odem:rest" )( "removing %s:", routeName, error );
							res.status( 500 ).json( { error: error.message } );
						} );
				}

				this.api.log( "hitchy:plugin:odem:rest" )( "request for removing missing %s ignored", routeName );
				res.status( 404 ).json( { error: "no such entry" } );

				return undefined;
			} );
	}
}
