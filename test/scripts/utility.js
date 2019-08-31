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
		return POST( "/api/mixed", {
			myStringProp: "entry no. 00",
			myIndexedStringProp: "entry no. 00",
			myIntegerProp: 0,
		} )
			.then( res => {
				res.should.have.status( 201 ).and.be.json();
			} );
	} );

	it( "lists created record now", () => {
		return GET( "/api/mixed" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].myStringProp.should.equal( "entry no. 00" );
			} );
	} );

	it( `is creating 30 new records`, () => {
		const Promises = new Array( 30 );

		for ( let index = 1, length = 30; index < length; index++ ) {
			Promises[index] = POST( "/api/mixed", {
				myStringProp: `entry no. ${String( "0" + index ).slice( -2 )}`,
				myIndexedStringProp: `entry no. ${String( "0" + index ).slice( -2 )}`,
				myNullableStringProp: index % 2 ? `entry no. ${String( "0" + index ).slice( -2 )}` : null,
				myIndexedNullableStringProp: index % 2 ? `entry no. ${String( "0" + index ).slice( -2 )}` : null,
				myIntegerProp: index % 2 ? index : null,
			} )
				.then( res => {
					res.should.have.status( 201 ).and.be.json();
				} );
		}

		return Promise.all( Promises );
	} );

	it( "lists created record now", () => {
		return GET( "/api/mixed" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items.length.should.equal( 30 );
			} );
	} );

	it( "sorts list ascendingly on demand", () => {
		return GET( "/api/mixed?sortBy=myStringProp" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for ( let i = 1, length = items.length; i < length; i++ ) {
					items[i].myStringProp.should.be.greaterThan( items[i - 1].myStringProp );
				}
			} );
	} );

	it( "sorts list descendingly on demand", () => {
		return GET( "/api/mixed?sortBy=myStringProp&descending=true" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for ( let i = 1, length = items.length; i < length; i++ ) {
					items[i].myStringProp.should.be.lessThan( items[i - 1].myStringProp );
				}
			} );
	} );

	it( "creates another record lacking property used to sort by before", () => {
		return POST( "/api/mixed" )
			.then( res => {
				res.should.have.status( 201 ).and.be.json();
			} );
	} );

	it( "sorts records providing value for sorting ascendingly and appends those missing related value", () => {
		return GET( "/api/mixed?sortBy=myStringProp" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for ( let i = 1, length = items.length - 1; i < length; i++ ) {
					items[i].myStringProp.should.be.greaterThan( items[i - 1].myStringProp );
				}

				Should( items[items.length - 1].myStringProp ).be.undefined();
			} );
	} );

	it( "sorts records providing value for sorting descendingly and appends those missing related value", () => {
		return GET( "/api/mixed?sortBy=myStringProp&descending=1" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;

				for ( let i = 1, length = items.length - 1; i < length; i++ ) {
					items[i].myStringProp.should.be.lessThan( items[i - 1].myStringProp );
				}

				Should( items[items.length - 1].myStringProp ).be.undefined();
			} );
	} );

	it( `lists correct number of entries if limit is used`, () => {
		const Promises = new Array( 31 );

		for ( let limit = 0; limit <= 31; limit++ ) {
			Promises[limit] = GET( `/api/mixed?limit=${limit}` )
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
			Promises[limit] = GET( `/api/mixed?limit=${limit}&sortBy=myStringProp` )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
					res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array();

					res.data.items.length.should.be.equal( limit );
				} );
		}
		return Promise.all( Promises );
	} );

	it( `lists the correct items if offset is used`, () => {
		return GET( "/api/mixed?sortBy=myStringProp" )
			.then( re => {
				const fullList = re.data.items;
				const length = fullList.length;
				const Promises = new Array( length );
				for ( let offset = 0; offset < length; offset++ ) {
					Promises[offset] = GET( `/api/mixed?sortBy=myStringProp&offset=${offset}` )
						.then( res => {
							res.should.have.status( 200 ).and.be.json();
							res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array();

							Should( res.data.items[0].myStringProp ).be.equal( fullList[offset].myStringProp );
							res.data.items[0].uuid.should.be.equal( fullList[offset].uuid );
						} );
				}
				return Promise.all( Promises );
			} );
	} );

	it( `lists the correct items if offset and limit is used`, () => {
		return GET( "/api/mixed?sortBy=myStringProp" )
			.then( re => {
				const fullList = re.data.items;
				const length = fullList.length;
				const Promises = new Array( length );
				for ( let offset = 0; offset < length - 5; offset++ ) {
					Promises[offset] = GET( `/api/mixed?sortBy=myStringProp&offset=${offset}&limit=5` )
						.then( res => {
							res.should.have.status( 200 ).and.be.json();
							res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 5 );

							Should( res.data.items[0].myStringProp ).be.equal( fullList[offset].myStringProp );
							Should( res.data.items[res.data.items.length - 1].myStringProp ).be.equal( fullList[offset + 4].myStringProp );
							res.data.items[0].uuid.should.be.equal( fullList[offset].uuid );
						} );
				}
				return Promise.all( Promises );
			} );
	} );

	it( `fetches items with property equal given value querying "prop:eq:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:eq:entry%20no.%2005" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 1 );
			} );
	} );

	it( `fetches items with property less than given value querying "prop:lt:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:lt:entry%20no.%2005" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 5 );
			} );
	} );

	it( `fetches items with property less than or equal given value querying "prop:lte:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:lte:entry%20no.%2005" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 6 );
			} );
	} );

	it( `fetches items with property greater than given value querying "prop:gt:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:gt:entry%20no.%2005" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 24 );
			} );
	} );

	it( `fetches items with property greater than or equal given value querying "prop:gte:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:gte:entry%20no.%2005" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 25 );
			} );
	} );

	it( `fetches items with property between two given values querying "prop:between:value:value"`, () => {
		return GET( "/api/mixed?q=myIndexedStringProp:between:entry%20no.%2005:entry%20no.%2011" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 7 );
			} );
	} );

	it( `fetches items with property unset querying "prop:null"`, () => {
		return GET( "/api/mixed?q=myStringProp:null" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array()
					.which.has.length( 0 + 1 ); // one extra item has been POSTed w/o any properties before

				return GET( "/api/mixed?q=myIndexedStringProp:null" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array().which.has.length( 0 + 1 ); // including that extra item mentioned above

				return GET( "/api/mixed?q=myNullableStringProp:null" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array().which.has.length( 15 + 1 ); // including that extra item mentioned above

				return GET( "/api/mixed?q=myIndexedNullableStringProp:null" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array().which.has.length( 15 + 1 ); // including that extra item mentioned above
			} );
	} );

	it( `fetches items with property unset querying "prop:notnull"`, () => {
		return GET( "/api/mixed?q=myStringProp:notnull" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array()
					.which.has.length( 30 );

				return GET( "/api/mixed?q=myIndexedStringProp:notnull" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array().which.has.length( 30 );

				return GET( "/api/mixed?q=myNullableStringProp:notnull" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array().which.has.length( 15 );

				return GET( "/api/mixed?q=myIndexedNullableStringProp:notnull" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object()
					.which.has.size( 1 )
					.and.has.property( "items" )
					.which.is.an.Array().which.has.length( 15 );
			} );
	} );

	it( `supports slicing when fetching items with property equal given value when querying "prop:eq:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:eq:entry%20no.%2005&offset=0" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 1 );

				return GET( "/api/mixed?q=myStringProp:eq:entry%20no.%2005&offset=5" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 0 );

				return GET( "/api/mixed?q=myStringProp:eq:entry%20no.%2005&offset=0&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 1 );

				return GET( "/api/mixed?q=myStringProp:eq:entry%20no.%2005&offset=5&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 0 );
			} );
	} );

	it( `supports slicing when fetching items with property less than given value when querying "prop:lt:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:lt:entry%20no.%2005&offset=0" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 5 );

				return GET( "/api/mixed?q=myStringProp:lt:entry%20no.%2005&offset=5" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 0 );

				return GET( "/api/mixed?q=myStringProp:lt:entry%20no.%2005&offset=0&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );

				return GET( "/api/mixed?q=myStringProp:lt:entry%20no.%2005&offset=5&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 0 );
			} );
	} );

	it( `supports slicing when fetching items with property less than or equal given value when querying "prop:lte:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:lte:entry%20no.%2005&offset=0" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 6 );

				return GET( "/api/mixed?q=myStringProp:lte:entry%20no.%2005&offset=5" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 1 );

				return GET( "/api/mixed?q=myStringProp:lte:entry%20no.%2005&offset=0&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );

				return GET( "/api/mixed?q=myStringProp:lte:entry%20no.%2005&offset=5&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 1 );
			} );
	} );

	it( `supports slicing when fetching items with property greater than given value when querying "prop:gt:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:gt:entry%20no.%2005&offset=0" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 24 );

				return GET( "/api/mixed?q=myStringProp:gt:entry%20no.%2005&offset=5" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 19 );

				return GET( "/api/mixed?q=myStringProp:gt:entry%20no.%2005&offset=0&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );

				return GET( "/api/mixed?q=myStringProp:gt:entry%20no.%2005&offset=5&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );
			} );
	} );

	it( `supports slicing when fetching items with property greater than or equal given value when querying "prop:gte:value"`, () => {
		return GET( "/api/mixed?q=myStringProp:gte:entry%20no.%2005&offset=0" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 25 );

				return GET( "/api/mixed?q=myStringProp:gte:entry%20no.%2005&offset=5" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 20 );

				return GET( "/api/mixed?q=myStringProp:lte:entry%20no.%2005&offset=0&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );

				return GET( "/api/mixed?q=myStringProp:gte:entry%20no.%2005&offset=5&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );
			} );
	} );

	it( `supports slicing when fetching items with property between two given values when querying "prop:between:value:value"`, () => {
		return GET( "/api/mixed?q=myIndexedStringProp:between:entry%20no.%2005:entry%20no.%2011&offset=0" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 7 );

				return GET( "/api/mixed?q=myIndexedStringProp:between:entry%20no.%2005:entry%20no.%2011&offset=5" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 2 );

				return GET( "/api/mixed?q=myIndexedStringProp:between:entry%20no.%2005:entry%20no.%2011&offset=0&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 3 );

				return GET( "/api/mixed?q=myIndexedStringProp:between:entry%20no.%2005:entry%20no.%2011&offset=5&limit=3" );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.has.length( 2 );
			} );
	} );
} );
