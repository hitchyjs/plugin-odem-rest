/**
 * (c) 2020 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 cepharum GmbH
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

module.exports = function() {
	const Services = this.runtime.services;

	/**
	 * Handles CORS-related behaviours.
	 *
	 * @name api.runtime.services.OdemRestCors
	 */
	class OdemRestCors {
		/**
		 * Generates function for use as a routing policy filtering CORS-related
		 * aspects of requests without relation to some particular model.
		 *
		 * @returns {HitchyRequestPolicyHandler} generated function suitable for registering as routing policy handler
		 */
		static getCommonRequestFilter() {
			return ( _, res, next ) => {
				res.setHeader( "Access-Control-Allow-Origin", "*" );
				next();
			};
		}

		/**
		 * Generates function for use as a routing policy filtering CORS-related
		 * aspects of requests in scope of provided model.
		 *
		 * @param {class<Model>} model class of particular model
		 * @returns {HitchyRequestPolicyHandler} generated function suitable for registering as routing policy handler
		 */
		static getRequestFilterForModel( model ) { // eslint-disable-line no-unused-vars
			return ( req, res, next ) => {
				if ( Services.OdemRestSchema.mayBeExposed( req, model ) ) {
					res.setHeader( "Access-Control-Allow-Origin", "*" );
				}

				next();
			};
		}
	}

	return OdemRestCors;
};
