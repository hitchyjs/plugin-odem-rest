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

const PtnAcceptsValue = /^\s*(?:function\s*(?:\s\S+\s*)?)?\(\s*[^\s)]/;

module.exports = function() {
	/**
	 * Handles model schemata in context of REST-API plugin.
	 *
	 * @name api.runtime.services.OdemRestSchema
	 */
	class OdemRestSchema {
		/**
		 * Detects if selected model's schema may be promoted to clients or not.
		 *
		 * @param {class<Model>} model class of model to check
		 * @returns {boolean} true if model's schema may be promoted to clients, false otherwise
		 */
		static mayBePromoted( model ) {
			const { schema: { options } } = model;

			return options.promote !== false;
		}

		/**
		 * Detects if selected model may be exposed to clients or not.
		 *
		 * @param {class<Model>} model class of model to check
		 * @returns {boolean} true if model may be exposed to clients, false otherwise
		 */
		static mayBeExposed( model ) {
			const { schema: { options } } = model;

			return options.expose !== false;
		}

		/**
		 * Extracts information on selected model's schema for publishing.
		 *
		 * @param {class<Model>} model model to process
		 * @param {boolean} omitComputed set true to omit computed properties
		 * @returns {object} extracted public information on selected model's schema
		 */
		static extractPublicData( model, { omitComputed = false } = {} ) {
			const { schema: { props, computed } } = model;

			const extracted = {
				name: model.name,
				props: {},
			};

			const propNames = Object.keys( props );
			const numProps = propNames.length;

			for ( let i = 0; i < numProps; i++ ) {
				const name = propNames[i];
				const prop = props[name];

				const copy = extracted.props[name] = {
					type: prop.type || "string",
				};

				const optionNames = Object.keys( prop );
				const numOptions = optionNames.length;

				for ( let j = 0; j < numOptions; j++ ) {
					const optionName = optionNames[j].toLowerCase();

					switch ( optionName ) {
						case "type" :
						case "indexes" :
						case "indices" :
						case "index" :
							break;

						default : {
							const option = prop[optionName];

							if ( option != null && typeof option !== "function" ) {
								copy[optionName] = option;
							}
						}
					}
				}
			}

			if ( !omitComputed ) {
				const computedNames = Object.keys( props );
				const numComputed = computedNames.length;
				extracted.computed = {};

				for ( let i = 0; i < numComputed; i++ ) {
					const name = computedNames[i];
					const fn = computed[name];

					if ( typeof fn === "function" ) {
						extracted.computed[name] = PtnAcceptsValue.test( fn );
					}
				}
			}

			return extracted;
		}
	}

	return OdemRestSchema;
};
