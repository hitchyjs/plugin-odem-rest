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

const Path = require( "path" );

const { describe, it, before, after } = require( "mocha" );
const { start: Start, stop: Stop, query: { get: GET, post: POST, put: PUT, patch: PATCH } } = require( "hitchy-server-dev-tools" );

require( "should" );
require( "should-http" );


describe( "model containing a computed enum", () => {
	let server;

	before( "starting hitchy server", function() {
		this.timeout( 5000 );

		return Start( {
			extensionFolder: Path.resolve( __dirname, "../.." ),
			testProjectFolder: Path.resolve( __dirname, "../project" ),
			options: {
				// debug: true,
			},
		} )
			.then( instance => {
				server = instance;
			} );
	} );

	after( "stopping hitchy server", () => Stop( server ) );

	it( "is exposed", () => {
		return GET( "/api/computed-enum" )
			.then( res => {
				res.should.have.status( 200 );
			} );
	} );

	it( "does not have any record initially", () => {
		return GET( "/api/computed-enum" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.empty();
			} );
	} );

	it( "provides number of records when setting request header x-count, too", () => {
		return GET( "/api/computed-enum", null, { "x-count": "1" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
				res.data.items.should.be.an.Array().which.is.empty();
				res.data.count.should.be.a.Number().and.equal( 0 );
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "0" );
			} );
	} );

	it( "provides number of records when setting query parameter count, too", () => {
		return GET( "/api/computed-enum?count=1" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
				res.data.items.should.be.an.Array().which.is.empty();
				res.data.count.should.be.a.Number().and.equal( 0 );
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "0" );
			} );
	} );

	it( "is creating new record by setting computed property", () => {
		return POST( "/api/computed-enum", { state: "prepared" } )
			.then( res => {
				res.should.have.status( 201 ).and.be.json();
			} );
	} );

	it( "lists created record now", () => {
		return GET( "/api/computed-enum" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].should.have.properties( "stateEnum", "state" );
				res.data.items[0].stateEnum.should.equal( 1 );
				res.data.items[0].state.should.equal( "prepared" );
			} );
	} );

	it( "provides updated number of records on setting request header x-count", () => {
		return GET( "/api/computed-enum", null, { "x-count": "1" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
				res.data.items.should.be.an.Array().which.is.not.empty();
				res.data.count.should.be.a.Number().and.equal( 1 );
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "1" );
			} );
	} );

	it( "provides updated number of records on passing query parameter count", () => {
		return GET( "/api/computed-enum?count=1" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
				res.data.items.should.be.an.Array().which.is.not.empty();
				res.data.count.should.be.a.Number().and.equal( 1 );
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "1" );
			} );
	} );

	it( "updates previously created record by setting computed property (PATCH)", () => {
		return GET( "/api/computed-enum" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const uuid = res.data.items[0].uuid;

				return PATCH( "/api/computed-enum/" + uuid, { state: "processing" } )
					.then( res2 => {
						res2.should.have.status( 200 ).and.be.json();

						return GET( "/api/computed-enum" )
							.then( res3 => {
								res3.should.have.status( 200 ).and.be.json();
								res3.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

								res3.data.items[0].should.have.property( "uuid" ).which.is.equal( uuid );
								res3.data.items[0].should.have.properties( "stateEnum", "state" );
								res3.data.items[0].stateEnum.should.equal( 2, "expected stateEnum to have changed" );
								res3.data.items[0].state.should.equal( "processing" );
							} );
					} );
			} );
	} );

	it( "updates previously created record by setting computed property (GET)", () => {
		return GET( "/api/computed-enum" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const uuid = res.data.items[0].uuid;

				return GET( `/api/computed-enum/write/${uuid}?state=created` )
					.then( res2 => {
						res2.should.have.status( 200 ).and.be.json();

						return GET( "/api/computed-enum" )
							.then( res3 => {
								res3.should.have.status( 200 ).and.be.json();
								res3.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

								res3.data.items[0].should.have.property( "uuid" ).which.is.equal( uuid );
								res3.data.items[0].should.have.properties( "stateEnum", "state" );
								res3.data.items[0].stateEnum.should.equal( 0, "expected stateEnum to have changed" );
								res3.data.items[0].state.should.equal( "created" );
							} );
					} );
			} );
	} );

	it( "replaces previously created record by setting computed property", () => {
		return GET( "/api/computed-enum" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const uuid = res.data.items[0].uuid;

				return PUT( "/api/computed-enum/" + uuid, { state: "finished" } )
					.then( res2 => {
						res2.statusCode.should.equal( 200, `Unexpected status code ${res2.statusCode}`
							+ ` - ${res2.data ? "error" : "body"}: ${res2.data ? res2.data.error : res2.body.toString()}` );
						res2.should.have.status( 200 ).and.be.json();

						return GET( "/api/computed-enum" )
							.then( res3 => {
								res3.should.have.status( 200 ).and.be.json();
								res3.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

								res3.data.items[0].should.have.property( "uuid" ).which.is.equal( uuid );
								res3.data.items[0].should.have.properties( "stateEnum", "state" );
								res3.data.items[0].stateEnum.should.equal( 3, "expected stateEnum to have changed" );
								res3.data.items[0].state.should.equal( "finished" );
							} );
					} );
			} );
	} );
} );
