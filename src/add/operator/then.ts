///<reference path="../../../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import {then as thenStatic, ThenSignature} from '../../operator/then';

Observable.prototype.then = thenStatic;

declare module 'rxjs/Observable' {
	interface Observable<T> {
		then: ThenSignature<T>;
	}
}
