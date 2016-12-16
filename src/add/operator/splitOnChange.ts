import { Observable } from 'rxjs/Observable';
import { splitOnChange as splitOnChangeStatic, SplitOnChangeSignature } from '../../operator/splitOnChange';

Observable.prototype.splitOnChange = splitOnChangeStatic;

declare module 'rxjs/Observable' {
	interface Observable<T> {
		splitOnChange: SplitOnChangeSignature<T>;
	}
}
