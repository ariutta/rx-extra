///<reference path="../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/toPromise';

declare module 'rxjs/Observable' {
	export interface Observable<T> {
		// TODO look up generics. is this correct?
		then<U>(f: (x: T) => U): Promise<U>;
	}
}

if (typeof Promise !== 'undefined') {
	// Based on example from Netflix's falcor:
	// https://github.com/Netflix/falcor/blob/
	// 03ea58f5ba05090a643f7268962885fb86e1b16f/lib/response/ModelResponse.js
	Observable.prototype.then = function then(onNext?, onError?) {
		var self = this;
		return new Promise(function(resolve, reject) {
			var value;
			var rejected = false;
			self.toArray().subscribe(function(values) {
				if (values.length <= 1) {
					value = values[0];
				} else {
					value = values;
				}
			}, function(errors) {
				rejected = true;
				reject(errors);
			}, function() {
				if (rejected === false) {
					resolve(value);
				}
			});
		}).then(onNext, onError);
	};
}
