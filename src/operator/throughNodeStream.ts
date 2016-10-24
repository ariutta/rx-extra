///<reference path="../../index.d.ts" />

// Apply a Node.js transform stream to an Observable

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/race';
import '../add/observable/fromNodeReadableStream'

import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/let';

/************************************************
 * Find a delay (ms) to match the transform stream,
 * increasing when a write returns false
 * (Node stream signal to initiate backpressure)
 * and decreasing when it does (min 0).
 ************************************************/
function getDelay(
		bpWarningCount: number,
		previousDelay: number,
		delay: number
): number {
	let nextDelay;
	if (bpWarningCount === 0) {
		nextDelay = (previousDelay + delay) / 2;
	} else {
		nextDelay = Math.pow(2, bpWarningCount - 1) * Math.max(delay, 1);
	}
	return Math.ceil(nextDelay);
}

/**
 * throughNodeStream
 *
 * @param {Stream} transformStream
 * @param {Object} [options={delay: 0}]
 * @param {Number} options.delay delay (in ms)
 * @return {Observable}
 */
export function throughNodeStream<T>(
		transformStream: NodeJS.ReadWriteStream,
		options: Options = {delay: 0}
): Observable<T> {
	// this is the number of consecutive times, starting with the most recent write
	// and going backwards, that we've received a backpressure warning after a write.
	let bpWarningCount = 0;
	let delay = options.delay;
	let previousDelay = delay;
	// 'drain' event added in Node v0.9.4,
	// so we're actually using two mechanisms
	// for handling backpressure:
	// * the drain event, and
	// * a backoff algorithm, in case "drain" is
	//   not supported by the current stream.
	let drainSource = Observable.fromEvent(transformStream, 'drain')
	.do(() => {
		bpWarningCount = 0;
	});
	return this.let(function(observable) {
		let transformObservable = Observable.fromNodeReadableStream(
				transformStream,
				'end'
		);

		observable.concatMap(function(x) {
			let delayableSource = Observable.of(x);
			if (delay === 0) {
				return delayableSource;
			} else {
				return Observable.race(
					drainSource.first().concatMap(x => delayableSource),
					delayableSource.delay(delay)
				);
			}
		})
		.subscribe(
				function(input) {
					// push some data
					let pushResponse = transformStream.write(input);
					// NOTE: if response is false, we must delay (backpressure).
					// Semi-related backpressure discussion for RxJS 5:
					// https://github.com/ReactiveX/rxjs/issues/71#issuecomment-228824763
					if (!pushResponse) {
						bpWarningCount += 1;
					} else {
						bpWarningCount = 0;
					}
					let nextDelay = getDelay(bpWarningCount, previousDelay, delay);
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

		return transformObservable;
	});
}

export interface Options {
	delay?: number;
}

export interface ThroughNodeStreamSignature<T> {
  (
		transformStream: NodeJS.ReadWriteStream,
		options: Options,
	): Observable<T>;
}
