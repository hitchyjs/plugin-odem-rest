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
const { start: Start, stop: Stop, query: { get: GET, post: POST } } = require( "hitchy-server-dev-tools" );

const Should = require( "should" );
require( "should-http" );

describe( "entries can be added", () => {
	let server;

	before( "starting hitchy server", () => {
		return Start( {
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

	after( "stopping hitchy server", () => Stop( server ) );


	it( "is creating new record", () => {
		return POST( "/api/string", { someString: "entry no. 0" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
			} );
	} );

	it( "lists created record now", () => {
		return GET( "/api/string" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].someString.should.equal( "entry no. 0" );
			} );
	} );

	it( `is creating 30 new records`, () => {
		const Promises = new Array( 30 );

		for ( let index = 1, length = 30; index < length; index++ ) {
			Promises[index] = POST( "/api/string", { someString: `entry no. ${index}` } )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
				} );
		}

		return Promise.all( Promises );
	} );

	it( "lists created record now", () => {
		return GET( "/api/string" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items.length.should.equal( 30 );
			} );
	} );

	it( "sorts list ascendingly on demand", () => {
		return GET( "/api/string?sortBy=someString" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for ( let i = 1, length = items.length; i < length; i++ ) {
					items[i].someString.should.be.greaterThan( items[i - 1].someString );
				}
			} );
	} );

	it( "sorts list descendingly on demand", () => {
		return GET( "/api/string?sortBy=someString&descending=true" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for ( let i = 1, length = items.length; i < length; i++ ) {
					items[i].someString.should.be.lessThan( items[i - 1].someString );
				}
			} );
	} );

	it( "creates another record lacking property used to sort by before", () => {
		return POST( "/api/string" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
			} );
	} );

	it( "sorts records providing value for sorting ascendingly and appends those missing related value", () => {
		return GET( "/api/string?sortBy=someString" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for ( let i = 1, length = items.length - 1; i < length; i++ ) {
					items[i].someString.should.be.greaterThan( items[i - 1].someString );
				}
				Should( items[items.length - 1].someString ).be.null();
			} );
	} );

	it( "sorts records providing value for sorting descendingly and appends those missing related value", () => {
		return GET( "/api/string?sortBy=someString&descending=1" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;

				for ( let i = 1, length = items.length - 1; i < length; i++ ) {
					items[i].someString.should.be.lessThan( items[i - 1].someString );
				}
				Should( items[items.length - 1].someString ).be.null();
			} );
	} );

	it( `lists correct number of entries if limit is used`, () => {
		const Promises = new Array( 31 );

		for ( let limit = 0; limit <= 31; limit++ ) {
			Promises[limit] = GET( `/api/string?limit=${limit}` )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array();

					res.data.items.length.should.be.equal( limit );
				} );
		}

		return Promise.all( Promises );
	} );

	it( `lists correct number of entries if limit is used in sorted list`, () => {
		const Promises = new Array( 31 );
		for ( let limit = 0; limit <= 31; limit++ ) {
			Promises[limit] = GET( `/api/string?limit=${limit}&sortBy=someString` )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array();

					res.data.items.length.should.be.equal( limit );
				} );
		}
		return Promise.all( Promises );
	} );


	it( `lists the correct items if offset is used`, () => {
		return GET( "/api/string?sortBy=someString" )
			.then( re => {
				const fullList = re.data.items;
				const length = fullList.length;
				const Promises = new Array( length );
				for ( let offset = 0; offset < length; offset++ ) {
					Promises[offset] = GET( `/api/string?sortBy=someString&offset=${offset}` )
						.then( res => {
							res.should.have.status( 200 ).and.be.json();
							res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array();

							Should( res.data.items[0].someString ).be.equal( fullList[offset].someString );
							res.data.items[0].uuid.should.be.equal( fullList[offset].uuid );
						} );
				}
				return Promise.all( Promises );
			} );
	} );

	it( `lists the correct items if offset and limit is used`, () => {
		return GET( "/api/string?sortBy=someString" )
			.then( re => {
				const fullList = re.data.items;
				const length = fullList.length;
				const Promises = new Array( length );
				for ( let offset = 0; offset < length - 5; offset++ ) {
					Promises[offset] = GET( `/api/string?sortBy=someString&offset=${offset}&limit=5` )
						.then( res => {
							res.should.have.status( 200 ).and.be.json();
							res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 5 );

							Should( res.data.items[0].someString ).be.equal( fullList[offset].someString );
							Should( res.data.items[res.data.items.length - 1].someString ).be.equal( fullList[offset + 4].someString );
							res.data.items[0].uuid.should.be.equal( fullList[offset].uuid );
						} );
				}
				return Promise.all( Promises );
			} );
	} );

} );
