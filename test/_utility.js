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

const HitchyNode = require( "hitchy" ).node;
const Hitchy = require( "hitchy/tools/test" );


module.exports = {
	/**
	 * Starts Hitchy server exposing project in provided folder and loads
	 * extensions from explicitly listed folders.
	 *
	 * @param {object} options custom options to pass into Hitchy
	 * @returns {Promise<Server>} promises started server instance of Hitchy
	 */
	start( options = {} ) {
		return Hitchy.startServer( HitchyNode( Object.assign( {
			projectFolder: Path.resolve( __dirname, "project" ),
			extensionsFolder: Path.resolve( __dirname, ".." ),
			explicitExtensions: [
				Path.resolve( __dirname, ".." ),
			],
		}, options ) ) );
	},

	/**
	 * Stops Hitchy server.
	 *
	 * @param {Promise<Server>|Server} server promise for Hitchy server started or that server itself
	 * @returns {Promise} promises Hitchy server stopped
	 */
	stop( server ) {
		const _server = server instanceof Promise ? server : Promise.resolve( server );

		return _server.then( serverInstance => {
			return new Promise( resolve => {
				if ( serverInstance ) {
					serverInstance.on( "close", resolve );
					serverInstance.close();
				} else {
					resolve();
				}
			} );
		} );
	}
};
