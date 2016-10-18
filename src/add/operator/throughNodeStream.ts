///<reference path="../../../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import {throughNodeStream as throughNodeStreamStatic, ThroughNodeStreamSignature} from '../../operator/throughNodeStream';

Observable.prototype.throughNodeStream = throughNodeStreamStatic;

declare module 'rxjs/Observable' {
	interface Observable<T> {
		throughNodeStream: ThroughNodeStreamSignature<T>;
	}
}
