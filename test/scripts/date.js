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
const HitchyDev = require( "hitchy-server-dev-tools" );

require( "should" );
require( "should-http" );


describe( "model containing just a date", () => {
	let server;

	before( "starting hitchy server", () => {
		return HitchyDev.start( {
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

	after( "stopping hitchy server", () => HitchyDev.stop( server ) );

	it( "is exposed", () => {
		return HitchyDev.query.get( "/api/date" )
			.then( res => {
				res.should.have.status( 200 );
			} );
	} );

	it( "does not have any record initially", () => {
		return HitchyDev.query.get( "/api/date" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.empty();
			} );
	} );

	it( "provides list of items as raw array on demand", () => {
		return HitchyDev.query.get( "/api/date", null, { "x-list-as-array": "1" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Array().which.is.empty();
			} );
	} );

	it( "provides number of records on demand, too", () => {
		return HitchyDev.query.get( "/api/date", null, { "x-count": "1" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
				res.data.items.should.be.an.Array().which.is.empty();
				res.data.count.should.be.a.Number().and.equal( 0 );
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "0" );

				return HitchyDev.query.get( "/api/date", null, { "x-count": "1", "x-list-as-array": "1" } );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Array().which.is.empty();
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "0" );
			} );
	} );

	it( "is creating new record", () => {
		return HitchyDev.query.put( "/api/date", { someDate: "2018-08-08" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
			} );
	} );

	it( "lists created record now", () => {
		return HitchyDev.query.get( "/api/date" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].someDate.should.match( /^2018-08-08(?:\D|$)/ );
			} );
	} );

	it( "lists created record now using old format", () => {
		return HitchyDev.query.get( "/api/date", null, { "x-list-as-array": "1" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Array().which.is.not.empty();

				res.data[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data[0].someDate.should.match( /^2018-08-08(?:\D|$)/ );
			} );
	} );

	it( "provides updated number of records on demand", () => {
		return HitchyDev.query.get( "/api/date", null, { "x-count": "1" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 2 ).and.has.properties( "items", "count" );
				res.data.items.should.be.an.Array().which.is.not.empty();
				res.data.count.should.be.a.Number().and.equal( 1 );
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "1" );

				return HitchyDev.query.get( "/api/date", null, { "x-count": "1", "x-list-as-array": "1" } );
			} )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Array().which.is.not.empty();
				res.headers.should.have.property( "x-count" ).which.is.a.String().and.equal( "1" );
			} );
	} );

	it( "updates previously created record", () => {
		return HitchyDev.query.get( "/api/date" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const uuid = res.data.items[0].uuid;

				return HitchyDev.query.post( "/api/date/" + uuid, { someDate: "2018-09-09" } )
					.then( res => {
						res.should.have.status( 200 ).and.be.json();

						return HitchyDev.query.get( "/api/date" )
							.then( res => {
								res.should.have.status( 200 ).and.be.json();
								res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

								res.data.items[0].should.have.property( "uuid" ).which.is.equal( uuid );
								res.data.items[0].someDate.should.match( /^2018-09-09(?:\D|$)/ );
							} );
					} );
			} );
	} );
} );
