///<reference path="../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/toArray';

declare module 'rxjs/Observable' {
	export interface Observable<T> {
		// TODO look up generics. is this correct?
		toNodeCallback<U>(f: (x: T) => U): U;
	}
}

// version adapted from Falcor example
Observable.prototype.toNodeCallback = function(cb) {
	var source = this;
	var val;
	var hasVal = false;
	source.subscribe(
		function(x) {
			hasVal = true;
			val = x;
		},
		function(e) {
			return cb(e);
		},
		function() {
			if (hasVal) {
				cb(null, val);
			}
		}
	);
};
