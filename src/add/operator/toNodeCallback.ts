///<reference path="../../../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import {toNodeCallback as toNodeCallbackStatic, ToNodeCallbackSignature} from '../../operator/toNodeCallback';

Observable.prototype.toNodeCallback = toNodeCallbackStatic;

declare module 'rxjs/Observable' {
	interface Observable<T> {
		toNodeCallback: ToNodeCallbackSignature<T>;
	}
}
