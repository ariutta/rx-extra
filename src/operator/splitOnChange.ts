///<reference path="../../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';

export function splitOnChange<T>(
		keySelector: KeySelector = (x) => x
) {
	let source: Observable<T> = this;
	var subject = new ReplaySubject();

	var previousKey;
	var currentGroup = [];

	// Three options for keySelector:
	// 1) a function: we just run that function
	//    as the predicate
	// 2) a string: we use "_.pluck"-style API,
	//    where keySelector is a key name
	// 3) undefined: we use x1 === x2
	let keySelectorFn: Function =
		typeof keySelector === 'string' ?
			(x) => x[keySelector] : keySelector;

	source.subscribe(function(currentItem) {
		var currentKey = keySelectorFn(currentItem);
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

export type KeySelector = string|Function;

export interface SplitOnChangeSignature<T> {
  (
	 		keySelector?: KeySelector,
	): Observable<T>;
}

