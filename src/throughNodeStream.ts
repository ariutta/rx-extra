// apply a Node.js transform stream to an Observable

///<reference path="../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/let';
import './fromNodeReadableStream'

interface Options {
	delay: number;
}

declare module 'rxjs/Observable' {
	export interface Observable<T> {
		// TODO look up generics. is this correct?
		throughNodeStream<U>(f: (x: NodeJS.ReadWriteStream, options: Options) => U): Observable<U>;
	}
}

function getDelay(attempt, previousDelay, delay) {
	let nextDelay;
	if (attempt === 0) {
		nextDelay = (previousDelay + delay) / 2;
	} else {
		nextDelay = Math.pow(2, attempt) * Math.max(delay, 1);
	}
	return nextDelay;
}

/**
 * throughNodeStream
 *
 * @param {Stream} transformStream
 * @return {Observable}
 */
Observable.prototype.throughNodeStream = function(transformStream, options: Options = {delay: 0}) {
	let attempt = 0;
	let delay = options.delay;
	let previousDelay = delay;
	return this.let(function(observable) {
		let source = observable.concatMap(function(x) {
			let delayable = Observable.of(x);
			return (delay === 0) ? delayable : delayable.delay(delay);
		});

		source.subscribe(
				function(input) {
					// push some data
					let pushResponse = transformStream.write(input);
					// NOTE: if response is false, we must delay (backpressure).
					// backpressure discussion for RxJS 5:
					// https://github.com/ReactiveX/rxjs/issues/71#issuecomment-228824763
					if (!pushResponse) {
						attempt += 1;
					} else {
						attempt = 0;
					}
					let nextDelay = getDelay(attempt, previousDelay, delay);
					previousDelay = delay;
					delay = nextDelay;
				},
				function(err) {
					err.message = (err.message || '') + ' in Rx.Observable.prototype.throughNodeStream';
					throw err;
				},
				function() {
					transformStream.end();
				}
		);

		let transformObservable = Observable.fromNodeReadableStream(
				transformStream,
				'end'
		);

		return transformObservable;
	});
};
