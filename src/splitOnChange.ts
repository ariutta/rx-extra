///<reference path="../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';

function splitOnChange(source, keySelector) {
	var subject = new ReplaySubject();

	var previousKey;
	var currentGroup = [];

	// Three options for keySelector:
	// 1) a function: we just run that function.
	// 2) pluck style API where keySelector is a key name
	// 3) not a function and not a string: we use JS ===
	//    equality comparison for the items.
	if (typeof keySelector === 'string') {
		var keySelectorString = keySelector;
		keySelector = function(x) {
			return x[keySelectorString];
		};
	} else if (typeof keySelector !== 'function') {
		keySelector = function(x) {
			return x;
		};
	}

	source.subscribe(function(currentItem) {
		var currentKey = keySelector(currentItem);
		if ((currentKey === previousKey) || !previousKey) {
			currentGroup.push(currentItem);
		} else {
			subject.next(currentGroup);
			currentGroup = [];
			currentGroup.push(currentItem);
		}
		previousKey = currentKey;
	},
	subject.error,
	function() {
		if (currentGroup.length > 0) {
			subject.next(currentGroup);
		}
		subject.complete();
	});

	return subject;
}

declare module 'rxjs/Observable' {
	export interface Observable<T> {
		// TODO is this right? Look up TS generics to
		// see what f: (x: T) => U actually means.
		splitOnChange<U>(f: (x: T) => U): Observable<U>;
	}
  namespace Observable {
    export let splitOnChange;
  }
}

Observable.splitOnChange = splitOnChange;

Observable.prototype.splitOnChange = function(keySelector) {
	var source = this;
	return source
		.let(function(o) {
			return splitOnChange(o, keySelector);
		});
};

export default splitOnChange;
