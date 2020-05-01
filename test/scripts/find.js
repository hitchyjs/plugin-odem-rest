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


describe( "A simple data model", () => {
	const ctx = {};

	before( HitchyDev.before( ctx, {
		pluginsFolder: Path.resolve( __dirname, "../.." ),
		testProjectFolder: Path.resolve( __dirname, "../project" ),
		options: {
			debug: false,
		},
	} ) );

	after( HitchyDev.after( ctx ) );


	it( "can be populated with record", () => {
		return ctx.post( "/api/simple", {
			card: "13",
			user: "55f5365c-e1e7-4018-8051-dfae5a276dde",
		} )
			.then( res => {
				res.should.have.status( 201 ).and.be.json();
			} );
	} );

	it( "lists created record now", () => {
		return ctx.get( "/api/simple" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().and.has.length( 1 );

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].card.should.equal( "13" );
				res.data.items[0].user.should.equal( "55f5365c-e1e7-4018-8051-dfae5a276dde" );
			} );
	} );

	it( "lists record when searching by card", () => {
		return ctx.get( "/api/simple?q=card:eq:13" )
			.then( res => {
				res.should.have.status( 200 ).and.be.json();
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.property( "items" ).which.is.an.Array().and.has.length( 1 );

				res.data.items[0].should.have.property( "uuid" ).which.is.a.String().which.is.not.empty();
				res.data.items[0].card.should.equal( "13" );
				res.data.items[0].user.should.equal( "55f5365c-e1e7-4018-8051-dfae5a276dde" );
			} );
	} );
} );
