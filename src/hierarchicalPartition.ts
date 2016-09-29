///<reference path="../index.d.ts" />

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/let';
import 'rxjs/add/operator/partition';

interface PartitionResult {
	0: Observable<any>;
	1: Observable<any>;
	replay?: Function;
}

function hierarchicalPartition(partitioner, inputSource, parentRestSource) {
	var latestValue;
	var replaySource = new Subject();

	var [mainSource, thisRestSource] = Observable.merge(
			inputSource
			.do(function(value) {
				latestValue = value;
			}, function(err) {
				replaySource.error(err);
			}, function(value) {
				replaySource.complete();
			}),
			replaySource
	)
	.partition(partitioner);

	var restSource;
	if (parentRestSource) {
		restSource = Observable.merge(
				parentRestSource,
				thisRestSource
		);
	} else {
		restSource = thisRestSource;
	}

	var result: PartitionResult = [mainSource, restSource];

	// allows a new subscriber to "prime the pump" with
	// the most recent value, even if that value happened
	// before the subscriber started.
	result.replay = function() {
		replaySource.next(latestValue);
	};

	return result;
}

declare module 'rxjs/Observable' {
  namespace Observable {
    export let hierarchicalPartition;
  }
	export interface Observable<T> {
		hierarchicalPartition<U>(f: (x: T) => U): Observable<U>;
	}
}

Observable.hierarchicalPartition = hierarchicalPartition;

Observable.prototype.hierarchicalPartition = function(
		partitioner: Function,
		parentRestSource?: Observable<any>) {
	var source = this;
	return source
		.let(function(o) {
			return hierarchicalPartition(partitioner, o, parentRestSource);
		});
};

export default hierarchicalPartition;
