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

module.exports = function() {
	const api = this;
	const { runtime: { services: Services, models: Models }, utility: { case: Case } } = api;

	return {
		policies() {
			const { config: { model: modelConfig = {} } } = api;
			const CORS = Services.OdemRestCors;

			const urlPrefix = modelConfig.urlPrefix || "/api";
			const modelNames = Object.keys( Models );
			const before = new Map();
			const after = new Map();

			before.set( `ALL ${urlPrefix}`, CORS.getCommonRequestFilter() );
			after.set( `ALL ${resolve( urlPrefix, ".schema" )}`, reqNotSupported );

			for ( let i = 0, numNames = modelNames.length; i < numNames; i++ ) {
				const name = modelNames[i];
				const routeName = Case.pascalToKebab( name );
				const model = Models[name] || {};

				before.set( `ALL ${resolve( urlPrefix, routeName )}`, CORS.getRequestFilterForModel( model ) );
				after.set( `ALL ${resolve( urlPrefix, routeName )}`, reqNotSupported );
			}

			return { before, after };

			/**
			 * Responds on failure in case of not having handled request before.
			 *
			 * @param {HitchyIncomingMessage} req request descriptor
			 * @param {HitchyServerResponse} res response manager
			 * @returns {void}
			 */
			function reqNotSupported( req, res ) {
				if ( !res.headersSent ) {
					res.status( 400 ).json( { error: "unsupported request" } );
				}
			}
		},

		blueprints() {
			const modelNames = Object.keys( Models );
			const routes = new Map();
			const modelConfig = api.config.model || {};
			const urlPrefix = modelConfig.urlPrefix || "/api";
			const convenience = modelConfig.convenience == null ? true : Boolean( modelConfig.convenience );

			addGlobalRoutes( routes, urlPrefix, Models );

			for ( let i = 0, numNames = modelNames.length; i < numNames; i++ ) {
				const name = modelNames[i];
				const routeName = Case.pascalToKebab( name );
				const model = Models[name] || {};

				addRoutesOnModel( routes, urlPrefix, routeName, model, convenience );
			}

			routes.set( "HEAD " + resolve( urlPrefix, ":model" ), ( _, res ) => res.status( 404 ).send() );
			routes.set( "DELETE " + resolve( urlPrefix, ":model" ), ( _, res ) => res.status( 404 ).json( { error: "no such collection" } ) );

			return routes;
		},
	};

	/**
	 * Adds routes handling common requests not related to particular model.
	 *
	 * @param {Map<string,function(req:IncomingMessage,res:ServerResponse):Promise>} routes maps
	 *        route patterns into function handling requests matching that pattern
	 * @param {string} urlPrefix common prefix to use on every route regarding any model-related processing
	 * @param {object<string,class<Model>>} models lists all currently available models
	 * @returns {void}
	 */
	function addGlobalRoutes( routes, urlPrefix, models ) {
		const { runtime: { services: { Model: BaseModel, OdemRestSchema } }, utility: { case: { pascalToKebab } } } = api;

		routes.set( `GET ${resolve( urlPrefix, ".schema" )}`, reqFetchSchemata );

		/**
		 * Handles request for listing schemata of all available models.
		 *
		 * @param {HitchyIncomingMessage} req request descriptor
		 * @param {HitchyServerResponse} res response manager
		 * @returns {void}
		 */
		function reqFetchSchemata( req, res ) {
			const modelKeys = Object.keys( models );
			const numModels = modelKeys.length;

			const result = {};

			for ( let i = 0; i < numModels; i++ ) {
				const model = models[modelKeys[i]];

				if ( model.prototype instanceof BaseModel &&
				     OdemRestSchema.mayBeExposed( req, model ) &&
				     OdemRestSchema.mayBePromoted( req, model ) ) {
					const slug = pascalToKebab( model.name );

					result[slug] = OdemRestSchema.extractPublicData( model );
				}
			}

			res.json( result );
		}
	}

	/**
	 * Adds routes handling common requests related to selected model.
	 *
	 * @param {Map<string,function(req:IncomingMessage,res:ServerResponse):Promise>} routes maps
	 *        route patterns into function handling requests matching that pattern
	 * @param {string} urlPrefix common prefix to use on every route regarding any model-related processing
	 * @param {string} routeName name of model to be used in path name of request
	 * @param {class<Model>} Model model class
	 * @param {boolean} includeConvenienceRoutes set true to include additional set of routes for controlling all action via GET-requests
	 * @returns {void}
	 */
	function addRoutesOnModel( routes, urlPrefix, routeName, Model, includeConvenienceRoutes ) {
		const { Model: BaseModel, OdemRestSchema: Schema, OdemUtilityUuid: { ptnUuid } } = Services;

		const modelUrl = resolve( urlPrefix, routeName );

		const reqBadModel = Model.prototype instanceof BaseModel ? null : ( _, res ) => {
			res.status( 500 ).json( { error: "incomplete discovery of model on server-side, looks like hitchy-plugin-odem issue" } );
		};

		if ( includeConvenienceRoutes ) {
			// implement non-REST-compliant rules to simplify manual control of data via browser
			routes.set( "GET " + resolve( modelUrl, "create" ), reqBadModel || reqCreateItem );
			routes.set( "GET " + resolve( modelUrl, "write", ":uuid" ), reqBadModel || reqModifyItem );
			routes.set( "GET " + resolve( modelUrl, "replace", ":uuid" ), reqBadModel || reqReplaceItem );
			routes.set( "GET " + resolve( modelUrl, "has", ":uuid" ), reqBadModel || reqCheckItem );
			routes.set( "GET " + resolve( modelUrl, "remove", ":uuid" ), reqBadModel || reqRemoveItem );
		}

		routes.set( "GET " + resolve( modelUrl, ".schema" ), reqBadModel || reqFetchSchema );

		// here comes the REST-compliant part
		routes.set( "GET " + resolve( modelUrl ), reqBadModel || reqFetchItems );
		routes.set( "GET " + resolve( modelUrl, ":uuid" ), reqBadModel || reqFetchItem );

		routes.set( "HEAD " + resolve( modelUrl, ":uuid" ), reqBadModel || reqCheckItem );
		routes.set( "HEAD " + resolve( modelUrl ), reqBadModel || reqSuccess );

		routes.set( "POST " + resolve( modelUrl, ":uuid" ), reqBadModel || reqError( 405, "new entry can not be created with uuid" ) );
		routes.set( "POST " + resolve( modelUrl ), reqBadModel || reqCreateItem );

		routes.set( "PUT " + resolve( modelUrl, ":uuid" ), reqBadModel || reqReplaceItem );
		routes.set( "PUT " + resolve( modelUrl ), reqBadModel || reqError( 405, "PUT is not permitted on collections" ) );
		routes.set( "PATCH " + resolve( modelUrl, ":uuid" ), reqBadModel || reqModifyItem );
		routes.set( "PATCH " + resolve( modelUrl ), reqBadModel || reqError( 405, "PATCH is not permitted on collections" ) );

		routes.set( "DELETE " + resolve( modelUrl, ":uuid" ), reqBadModel || reqRemoveItem );
		routes.set( "DELETE " + resolve( modelUrl ), reqBadModel || reqError( 405, "DELETE is not permitted on collections" ) );


		/**
		 * Responds on success.
		 *
		 * @param {HitchyIncomingMessage} req request descriptor
		 * @param {HitchyServerResponse} res response manager
		 * @returns {void}
		 */
		function reqSuccess( req, res ) {
			if ( Services.OdemRestSchema.mayBeExposed( req, Model ) ) {
				res.status( 200 ).send();
			} else {
				res.status( 403 ).send();
			}
		}

		/**
		 * Responds on success.
		 *
		 * @param {int} code HTTP status code to respond with
		 * @param {string} message error message to provide in JSON response body
		 * @returns {function(IncomingMessage, ServerResponse)} handler responding according to parameters
		 */
		function reqError( code, message ) {
			return ( _, res ) => {
				res.status( code ).json( { error: message } );
			};
		}

		/**
		 * Handles request for fetching schema of selected model.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {void}
		 */
		function reqFetchSchema( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request fetching schema" );

			if ( !Services.OdemRestSchema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return;
			}

			res.json( Schema.extractPublicData( Model ) );
		}

		/**
		 * Handles request for checking whether some selected item of model exists
		 * or not.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqCheckItem( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request checking if some item exists" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { uuid } = req.params;
			if ( !ptnUuid.test( uuid ) ) {
				res.status( 400 ).send();
				return undefined;
			}

			const item = new Model( uuid ); // eslint-disable-line new-cap

			return item.$exists
				.then( exists => {
					res.status( exists ? 200 : 404 ).send();
				} )
				.catch( error => {
					this.api.log( "hitchy:odem:rest" )( "checking %s:", routeName, error );
					res.status( 500 ).json( { error: error.message } );
				} );
		}

		/**
		 * Handles request for fetching data of selected item.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise} promises request processed successfully
		 */
		function reqFetchItem( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request fetching some item" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { uuid } = req.params;
			if ( !ptnUuid.test( uuid ) ) {
				res.status( 400 ).json( { error: "invalid UUID" } );
				return undefined;
			}

			const item = new Model( uuid ); // eslint-disable-line new-cap

			return item.load()
				.then( loaded => res.json( loaded.toObject() ) )
				.catch( error => {
					this.api.log( "hitchy:odem:rest" )( "fetching %s:", routeName, error );
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
		 * @param {HitchyIncomingMessage} req incoming request
		 * @param {HitchyServerResponse} res response controller
		 * @returns {Promise} promises response sent
		 */
		function reqFetchItems( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request fetching items" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			if ( req.headers["x-list-as-array"] ) {
				res.status( 400 ).json( { error: "fetching items as array is deprecated for security reasons" } );
				return undefined;
			}

			return ( req.query.q ? reqListMatches : reqListAll ).call( this, req, res );
		}

		/**
		 * Parsing provided query and compiling it for Model.find().
		 *
		 * @param {string} query value of query parameter
		 * @returns {object|undefined} compiled test description for Model.find(), undefined if no valid query was found
		 */
		function parseQuery( query ) {
			const simpleTernary = /^([^:\s]+):between:([^:]+):([^:]+)$/i.exec( query );

			if ( simpleTernary ) {
				const [ , name, lower, upper ] = simpleTernary;

				return { between: { name, lower, upper } };
			}

			const simpleBinary = /^([^:\s]+):([a-z]{2,}):(.*)$/i.exec( query );
			if ( simpleBinary ) {
				const [ , name, operation, value ] = simpleBinary;

				return { [operation.toLowerCase()]: { name, value } };
			}

			const simpleUnary = /^([^:\s]+):((?:not)?null)$/i.exec( query );
			if ( simpleUnary ) {
				const [ , name, operation ] = simpleUnary;

				return { [operation.toLowerCase()]: { name } };
			}

			return undefined;
		}

		/**
		 * Handles request for listing all items of model.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqListMatches( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request listing matching items" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { q: query = "", offset = 0, limit = Infinity, sortBy = null, descending = false, loadRecords = true, count = false } = req.query;

			if ( !query ) {
				res.status( 400 ).json( { error: "missing query" } );
				return undefined;
			}

			const parsedQuery = parseQuery( query );
			if ( !parsedQuery ) {
				res.status( 400 ).json( { error: "invalid query, e.g. use ?q=name:operation:value" } );
				return undefined;
			}

			const meta = count || req.headers["x-count"] ? {} : null;

			return Model.find( parsedQuery, { offset, limit, sortBy, sortAscendingly: !descending }, {
				metaCollector: meta,
				loadRecords
			} )
				.then( matches => {
					const result = {
						items: matches.map( m => m.toObject() ),
					};

					if ( meta ) {
						res.set( "x-count", meta.count );
						result.count = meta.count || 0;
					}

					res.json( result );
				} )
				.catch( error => {
					this.api.log( "hitchy:odem:rest" )( "querying %s:", routeName, error );
					res.status( 500 ).json( { error: error.message } );
				} );
		}

		/**
		 * Handles request for listing all items of model matching single given
		 * condition.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqListAll( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request listing all items" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { offset = 0, limit = Infinity, sortBy = null, descending = false, loadRecords = true, count = false } = req.query;
			const meta = count || req.headers["x-count"] ? {} : null;
			return Model.list( {
				offset,
				limit,
				sortBy,
				sortAscendingly: !descending
			}, { loadRecords, metaCollector: meta } )
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
					this.api.log( "hitchy:odem:rest" )( "listing %s:", routeName, error );
					res.status( 500 ).json( { error: error.message } );
				} );
		}

		/**
		 * Handles request for adding new item.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqCreateItem( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request creating item" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const item = new Model(); // eslint-disable-line new-cap

			return ( req.method === "GET" ? Promise.resolve( req.query ) : req.fetchBody() )
				.then( record => {
					if ( record.uuid ) {
						this.api.log( "hitchy:odem:rest" )( "creating %s:", routeName, "new entry can not be created with uuid" );
						res.status( 400 ).json( { error: "new entry can not be created with uuid" } );
						return undefined;
					}

					if ( record ) {
						const names = Object.keys( record );
						const numNames = names.length;

						const definedProps = Model.schema.props;
						const definedComputed = Model.schema.computed;

						for ( let i = 0; i < numNames; i++ ) {
							const name = names[i];

							if ( definedProps[name] ) {
								item.$properties[name] = record[name];
							} else if ( definedComputed[name] ) {
								item[name] = record[name];
							}
						}
					}

					return item.save().then( saved => {
						this.api.log( "hitchy:odem:rest" )( "created %s with %s", routeName, saved.uuid );
						res.status( 201 ).json( { uuid: saved.uuid } );
					} );
				} )
				.catch( error => {
					this.api.log( "hitchy:odem:rest" )( "creating %s:", routeName, error );
					res.status( 500 ).json( { error: error.message } );
				} );
		}

		/**
		 * Handles request for updating properties of a selected item.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqModifyItem( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request to modify some item" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { uuid } = req.params;
			if ( !ptnUuid.test( uuid ) ) {
				res.status( 400 ).json( { error: "invalid UUID" } );
				return undefined;
			}

			const item = new Model( uuid ); // eslint-disable-line new-cap

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
								const names = Object.keys( record );
								const numNames = names.length;

								const definedProps = Model.schema.props;
								const definedComputed = Model.schema.computed;

								for ( let i = 0; i < numNames; i++ ) {
									const name = names[i];

									if ( definedProps[name] ) {
										loaded.$properties[name] = record[name];
									} else if ( definedComputed[name] ) {
										loaded[name] = record[name];
									}
								}
							}

							return loaded.save()
								.then( saved => {
									res.json( saved.toObject() );
								} );
						} );
				} )
				.catch( error => {
					this.api.log( "hitchy:odem:rest" )( "updating %s:", routeName, error );
					res.status( 500 ).json( { error: error.message } );
				} );
		}


		/**
		 * Handles request for updating properties of a selected item.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqReplaceItem( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request replacing some item" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { uuid } = req.params;
			if ( !ptnUuid.test( uuid ) ) {
				res.status( 400 ).json( { error: "invalid UUID" } );
				return undefined;
			}

			const item = new Model( uuid ); // eslint-disable-line new-cap

			return Promise.all( [ item.$exists, req.method === "GET" ? Promise.resolve( req.query ) : req.fetchBody() ] )
				.then( ( [ exists, record ] ) => {
					return ( exists ? item.load() : Promise.resolve() ).then( () => {
						const propNames = Object.keys( Model.schema.props );
						const numPropNames = propNames.length;

						const computedNames = Object.keys( Model.schema.computed );
						const numComputedNames = computedNames.length;

						// drop all properties
						for ( let i = 0; i < numPropNames; i++ ) {
							const propName = propNames[i];
							item.$properties[propName] = null;
						}

						// commit changes of properties to prevent invalid
						// warning/error on re-assigning
						item.$properties.$context.commit();

						// assign all posted actual properties
						for ( let i = 0; i < numPropNames; i++ ) {
							const propName = propNames[i];
							const value = record[propName];
							if ( value != null ) {
								item.$properties[propName] = value;
							}
						}

						// assign all posted computed properties
						for ( let i = 0; i < numComputedNames; i++ ) {
							const computedName = computedNames[i];
							item[computedName] = record[computedName];
						}

						return item.save( { ignoreUnloaded: !exists } );
					} );
				} )
				.then( saved => {
					res.json( { uuid: saved.uuid } );
				} )
				.catch( error => {
					this.api.log( "hitchy:odem:rest" )( "updating %s:", routeName, error );
					res.status( 500 ).json( { error: error.message } );
				} );
		}

		/**
		 * Handles request for removing selected item.
		 *
		 * @param {HitchyIncomingMessage} req description of request
		 * @param {HitchyServerResponse} res API for creating response
		 * @returns {Promise|undefined} promises request processed successfully
		 */
		function reqRemoveItem( req, res ) {
			this.api.log( "hitchy:odem:rest" )( "got request removing some item" );

			if ( !Schema.mayBeExposed( req, Model ) ) {
				res.status( 403 ).json( { error: "access forbidden by model" } );
				return undefined;
			}

			const { uuid } = req.params;
			if ( !ptnUuid.test( uuid ) ) {
				res.status( 400 ).json( { error: "invalid UUID" } );
				return undefined;
			}

			const item = new Model( uuid ); // eslint-disable-line new-cap

			return item.$exists
				.then( exists => {
					if ( exists ) {
						return item.remove()
							.then( () => res.json( {
								uuid,
								status: "OK",
								action: "remove"
							} ) )
							.catch( error => {
								this.api.log( "hitchy:odem:rest" )( "removing %s:", routeName, error );
								res.status( 500 ).json( { error: error.message } );
							} );
					}

					this.api.log( "hitchy:odem:rest" )( "request for removing missing %s ignored", routeName );
					res.status( 404 ).json( { error: "no such entry" } );

					return undefined;
				} );
		}
	}
};
