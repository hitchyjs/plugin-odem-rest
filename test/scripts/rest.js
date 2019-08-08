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
const { start, stop, query: {
	get: GET,
	post: POST,
	put: PUT,
	patch: PATCH,
	head: HEAD,
	delete: DELETE,
} } = require( "hitchy-server-dev-tools" );

require( "should" );
require( "should-http" );


describe( "REST-API", () => {
	let server;
	let uuid1, uuid2;

	before( "starting hitchy server", () => {
		return start( {
			extensionFolder: Path.resolve( __dirname, "../.." ),
			testProjectFolder: Path.resolve( __dirname, "../project" ),
			options: {
				debug: false,
			},
		} )
			.then( instance => {
				server = instance;
			} );
	} );

	after( "stopping hitchy server", () => stop( server ) );


	describe( "GET /api/mixed", () => {
		it( "delivers successful result with empty list of matches", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object().which.is.deepEqual( { items: [] } );

					res.headers.should.not.have.property( "x-count" );
				} );
		} );

		it( "doesn't deliver raw array of matches on demand anymore", () => {
			return GET( "/api/mixed", null, { "x-list-as-array": "1" } )
				.then( res => {
					res.should.have.status( 400 ).and.be.json();
					res.data.should.be.an.Object().which.has.property( "error" ).which.is.a.String().and.not.empty();
				} );
		} );

		it( "separately provides total number of records, too", () => {
			return GET( "/api/mixed", null, { "x-count": "1" } )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();

					res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
					res.data.items.should.be.an.Array().which.is.empty();
					res.data.count.should.be.a.Number().and.equal( 0 );

					res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "0" );
				} );
		} );

		it( "doesn't deliver raw array of matches with total number in header on demand anymore", () => {
			return GET( "/api/mixed", null, { "x-count": "1", "x-list-as-array": "1" } )
				.then( res => {
					res.should.have.status( 400 ).and.be.json();
					res.data.should.be.an.Object().which.has.property( "error" ).which.is.a.String().and.not.empty();
				} );
		} );
	} );

	describe( "POST /api/mixed", () => {
		it( "creates new record assigning UUID automatically", () => {
			return POST( "/api/mixed", {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 201 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "uuid" )
						.which.is.a.String().and.match( /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i );

					uuid1 = res.data.uuid;
				} );
		} );

		it( "(GETting again returns created record now)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 1 );
					res.data.items[0].uuid.should.be.eql( uuid1 );
					res.data.items.map( r => r.uuid ).should.deepEqual( [uuid1] );
				} );
		} );

		it( "creates another new record every time", () => {
			return POST( "/api/mixed", {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 201 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "uuid" )
						.which.is.a.String().and.match( /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i );

					uuid2 = res.data.uuid;

					uuid1.should.not.be.equal( uuid2 );
				} );
		} );

		it( "(thus GETting again returns both created records now)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 2 );
					res.data.items.map( r => r.uuid ).should.deepEqual( [ uuid1, uuid2 ] );
				} );
		} );

		it( "is rejected with 400 on providing UUID as property of record to create", () => {
			return POST( "/api/mixed", {
				uuid: "12345678-1234-1234-1234-1234567890ab",
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 400 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.match( /\buuid\b/i );
				} );
		} );

		it( "(thus GETting again still returns both records created before, only)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 2 );
				} );
		} );
	} );

	describe( "POST /api/mixed/:uuid", () => {
		it( "is rejected with 405 when addressing particular item of collection", () => {
			return POST( "/api/mixed/12345678-1234-1234-12341234567890ab", {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 405 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );

		it( "(thus GETting again still returns both records created before, only)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 2 );
				} );
		} );
	} );

	describe( "GET /api/mixed/:uuid", () => {
		it( "fetches properties and UUID of a single existing record", () => {
			return GET( `/api/mixed/${uuid1}` )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.Object().which.has.size( 6 ).and.properties(
						"uuid", "myDateProp", "myStringProp", "myIntegerProp",
						"myNumericProp", "myBooleanProp" );
				} );
		} );

		it( "is rejected with 400 when addressing a collection's entity using malformed UUID", () => {
			return GET( "/api/mixed/12345678-1234-1234-1234-1234567890a" ) // <- last character removed
				.then( res => {
					res.should.have.status( 400 ).and.be.json();
					res.data.should.be.Object().which.have.property( "error" )
						.which.is.a.String().which.match( /\buuid\b/i );
				} );
		} );

		it( "is rejected with 404 when using UUID of missing record", () => {
			return GET( "/api/mixed/12345678-1234-1234-1234-1234567890ac" ) // <- last character replaced
				.then( res => {
					res.should.have.status( 404 ).and.be.json();
					res.data.should.be.Object().which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );
	} );

	describe( "PUT /api/mixed", () => {
		it( "is rejected with 400 when addressing collection", () => {
			return PUT( "/api/mixed", {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 405 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );

		it( "is rejected with 405 when addressing collection and providing UUID as property of record to create", () => {
			return PUT( "/api/mixed", {
				uuid: "12345678-1234-1234-1234-1234567890ab",
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 405 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );

		it( "(thus GETting again still returns both records created in section before, only)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 2 );
				} );
		} );
	} );

	describe( "PUT /api/mixed/:uuid", () => {
		it( "creates record with explicitly provided UUID", () => {
			return PUT( "/api/mixed/12345678-1234-1234-1234-1234567890ab", {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "uuid" )
						.which.is.a.String().and.equal( "12345678-1234-1234-1234-1234567890ab" );
				} );
		} );

		it( "(thus GETting again returns three records now)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 3 );
					res.data.items.filter( r => r.uuid === "12345678-1234-1234-1234-1234567890ab" ).should.have.length( 1 );
				} );
		} );

		it( "updates now existing record on succeeding calls using same URL", () => {
			return PUT( "/api/mixed/12345678-1234-1234-1234-1234567890ab", {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "uuid" )
						.which.is.a.String().and.equal( "12345678-1234-1234-1234-1234567890ab" );
				} );
		} );

		it( "(thus GETting again still returns the three records created before, only)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 3 );
					res.data.items.filter( r => r.uuid === "12345678-1234-1234-1234-1234567890ab" ).should.have.length( 1 );
				} );
		} );

		it( "always replaces whole existing record with provided one", () => {
			return GET( "/api/mixed/12345678-1234-1234-1234-1234567890ab" )
				.then( res => {
					res.should.have.status( 200 );
					res.data.should.be.Object().which.has.size( 6 ).and.properties(
						"uuid", "myDateProp", "myStringProp", "myIntegerProp",
						"myNumericProp", "myBooleanProp" );
				} )
				.then( () => PUT( "/api/mixed/12345678-1234-1234-1234-1234567890ab", {
					myIntegerProp: 600,
				} ) )
				.then( () => GET( "/api/mixed/12345678-1234-1234-1234-1234567890ab" ) )
				.then( res => {
					res.should.have.status( 200 );
					res.data.should.be.Object().which.has.size( 2 ).and.properties( "uuid", "myIntegerProp" );
				} )
				.then( () => PUT( "/api/mixed/12345678-1234-1234-1234-1234567890ab", {
					myDateProp: "2019-08-01",
					myStringProp: "some text",
					myIntegerProp: 500,
					myNumericProp: 2.81,
					myBooleanProp: true,
				} ) )
				.then( () => GET( "/api/mixed/12345678-1234-1234-1234-1234567890ab" ) )
				.then( res => {
					res.should.have.status( 200 );
					res.data.should.be.Object().which.has.size( 6 ).and.properties(
						"uuid", "myDateProp", "myStringProp", "myIntegerProp",
						"myNumericProp", "myBooleanProp" );
				} );
		} );
	} );

	describe( "PATCH /api/mixed", () => {
		it( "is rejected with 405 when addressing collection", () => {
			return PATCH( "/api/mixed", {
				myIntegerProp: 700,
			} )
				.then( res => {
					res.should.have.status( 405 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );

		it( "is rejected with 405 when addressing collection and providing UUID as property of record to create", () => {
			return PATCH( "/api/mixed", {
				uuid: "12345678-1234-1234-1234-1234567890ab",
				myIntegerProp: 700,
			} )
				.then( res => {
					res.should.have.status( 405 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );
	} );

	describe( "PATCH /api/mixed/:uuid", () => {
		it( "is rejected with 404 when providing UUID not used with any existing record", () => {
			return PATCH( "/api/mixed/12345678-1234-1234-1234-1234567890ac", { // <- last character replaced
				myIntegerProp: 700,
			} )
				.then( res => {
					res.should.have.status( 404 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "error" )
						.which.is.a.String().and.not.empty();
				} );
		} );

		it( "updates existing record using UUID of existing record", () => {
			return PATCH( `/api/mixed/${uuid1}`, {
				myDateProp: "2019-08-01",
				myStringProp: "some text",
				myIntegerProp: 500,
				myNumericProp: 2.81,
				myBooleanProp: true,
			} )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object()
						.which.has.property( "uuid" )
						.which.is.a.String().and.equal( uuid1 );
				} );
		} );

		it( "does not add another record on success", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 3 );
					res.data.items.filter( r => r.uuid === uuid1 ).should.have.length( 1 );
				} );
		} );

		it( "replaces provided properties of selected record, only", () => {
			return PATCH( `/api/mixed/${uuid1}` )
				.then( res => {
					res.should.have.status( 200 );
					res.data.should.be.Object().which.has.size( 6 ).and.properties(
						"uuid", "myDateProp", "myStringProp", "myIntegerProp",
						"myNumericProp", "myBooleanProp" );
				} )
				.then( () => PATCH( `/api/mixed/${uuid1}`, {
					myIntegerProp: 800,
				} ) )
				.then( res => {
					res.should.have.status( 200 );
					res.data.should.be.Object().which.has.size( 6 ).and.properties(
						"uuid", "myDateProp", "myStringProp", "myIntegerProp",
						"myNumericProp", "myBooleanProp" );
				} )
				.then( () => PATCH( `/api/mixed/${uuid1}`, {
					myDateProp: "2019-08-01",
					myStringProp: "some text",
					myIntegerProp: 900,
					myNumericProp: 3.14,
					myBooleanProp: true,
				} ) )
				.then( res => {
					res.should.have.status( 200 );
					res.data.should.be.Object().which.has.size( 6 ).and.properties(
						"uuid", "myDateProp", "myStringProp", "myIntegerProp",
						"myNumericProp", "myBooleanProp" );
				} );
		} );
	} );

	describe( "HEAD /api/mixed", () => {
		it( "succeeds when addressing existing collection", () => {
			return HEAD( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 );
				} );
		} );

		it( "is rejected with 404 when addressing missing collection", () => {
			return HEAD( "/api/missing" )
				.then( res => {
					res.should.have.status( 404 );
				} );
		} );
	} );

	describe( "HEAD /api/mixed/:uuid", () => {
		it( "succeeds when using UUID of existing record", () => {
			return HEAD( "/api/mixed/12345678-1234-1234-1234-1234567890ab" )
				.then( res => {
					res.should.have.status( 200 );
				} );
		} );

		it( "is rejected with 400 when addressing a collection's entity using malformed UUID", () => {
			return HEAD( "/api/mixed/12345678-1234-1234-1234-1234567890a" ) // <- last character removed
				.then( res => {
					res.should.have.status( 400 );
				} );
		} );

		it( "is rejected with 404 when using UUID of missing record", () => {
			return HEAD( "/api/mixed/12345678-1234-1234-1234-1234567890ac" ) // <- last character replaced
				.then( res => {
					res.should.have.status( 404 );
				} );
		} );
	} );

	describe( "DELETE /api/mixed", () => {
		it( "is rejected with 405 when addressing existing collection", () => {
			return DELETE( "/api/mixed" )
				.then( res => {
					res.should.have.status( 405 ).and.be.json();
					res.data.should.be.Object().which.has.property( "error" )
						.which.is.String().and.not.empty();
				} );
		} );

		it( "is rejected with 404 when addressing missing collection", () => {
			return DELETE( "/api/missing" )
				.then( res => {
					res.should.have.status( 404 ).and.be.json();
					res.data.should.be.Object().which.has.property( "error" )
						.which.is.String().and.not.empty();
				} );
		} );
	} );

	describe( "DELETE /api/mixed/:uuid", () => {
		it( "succeeds when using UUID of existing record", () => {
			return DELETE( "/api/mixed/12345678-1234-1234-1234-1234567890ab" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.Object().which.has.property( "uuid" )
						.which.is.String().and.equal( "12345678-1234-1234-1234-1234567890ab" );
				} );
		} );

		it( "(thus GETting again returns all but the removed record now)", () => {
			return GET( "/api/mixed" )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.items.should.be.Array().which.has.length( 2 );
					res.data.items.filter( r => r.uuid === "12345678-1234-1234-1234-1234567890ab" ).should.be.empty();
				} );
		} );

		it( "is rejected when using same UUID of previously existing and now missing record again", () => {
			return DELETE( "/api/mixed/12345678-1234-1234-1234-1234567890ab" )
				.then( res => {
					res.should.have.status( 404 ).and.be.json();
					res.data.should.be.Object().which.has.property( "error" )
						.which.is.String().and.not.empty();
				} );
		} );

		it( "is rejected with 400 when addressing a collection's entity using malformed UUID", () => {
			return DELETE( "/api/mixed/12345678-1234-1234-1234-1234567890a" ) // <- last character removed
				.then( res => {
					res.should.have.status( 400 ).and.be.json();
					res.data.should.be.Object().which.has.property( "error" )
						.which.is.String().and.not.empty();
				} );
		} );

		it( "is rejected with 404 when using UUID of missing record", () => {
			return DELETE( "/api/mixed/12345678-1234-1234-1234-1234567890ac" ) // <- last character replaced
				.then( res => {
					res.should.have.status( 404 ).and.be.json();
					res.data.should.be.Object().which.has.property( "error" )
						.which.is.String().and.not.empty();
				} );
		} );
	} );
} );
