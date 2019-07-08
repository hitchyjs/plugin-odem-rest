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

describe( "entries can be added", () => {
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

	it( "is creating new record", () => {
		return HitchyDev.query.post( "/api/string", { someString: "entry no. 0" } )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
			} );
	} );

	it( "lists created record now", () => {
		return HitchyDev.query.get( "/api/string" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].someString.should.equal( "entry no. 0" );
			} );
	} );

	for(let index = 1, length = 30; index < length; index++){
		it( `is creating new record ${index}`, () => {
			return HitchyDev.query.post( "/api/string", { someString: `entry no. ${index}` } )
				.then( res => {
					res.should.have.status( 200 ).and.be.json();
				} );
		} );
	}

	it( "lists created record now", () => {
		return HitchyDev.query.get( "/api/string" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items.length.should.equal( 30 );
			} );
	} );

	it( "sorts lists by sortBy now", () => {
		return HitchyDev.query.get( "/api/string?sortBy=someString" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for(let i = 1, length = items.length; i < length; i++){
					items[i].someString.should.be.greaterThan(items[i-1].someString)
				}
			} );
	} );

	it( "sorts lists descending by sortBy now", () => {
		return HitchyDev.query.get( "/api/string?sortBy=someString&descending=true" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for(let i = 1, length = items.length; i < length; i++){
					items[i].someString.should.be.lessThan(items[i-1].someString)
				}
			} );
	} );

	it( "is creating new record without sortBy Property", () => {
		return HitchyDev.query.post( "/api/string" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
			} );
	} );

	it( "sorts lists correctly if sortBy property is missing now", () => {
		return HitchyDev.query.get( "/api/string?sortBy=someString" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for(let i = 1, length = items.length - 1; i < length; i++){
					items[i].someString.should.be.greaterThan(items[i-1].someString)
				}
				should(items[items.length-1].someString).be.null();
			} );
	} );

	it( "sorts lists correctly if sortBy property is missing now", () => {
		return HitchyDev.query.get( "/api/string?sortBy=someString&descending=true" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().which.is.not.empty();

				const { items } = res.data;
				for(let i = 1, length = items.length - 1; i < length; i++){
					items[i].someString.should.be.lessThan(items[i-1].someString)
				}
				should(items[items.length-1].someString).be.null();
			} );
	} );

});
