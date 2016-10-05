///<reference path="../index.d.ts" />

// In some apps, a primary concern is updating
// the UI when a user makes a selection
// (indicated by mouse click).
// A selection, S, will require that a component
// do one of these:
// * selection is applicable to component, so update
//   UI to reflect info from selection
// * selection is NOT applicable to component, so
//   reset UI to default/initial state
//
// The goal for this is to make it possible to
// have selection-sensitive sub-components that can
// be initialized after the app has already started.
// 
// Example
// States:
// A) Start with editor disabled
//   1) datanode selected
//      * pvjs-viewer displays data about datanode
//      * pvjs-editor remains hidden
//      * datasource dropdown remains hidden
//      * label input remains hidden
//   2) canvas selected
//      * pvjs-viewer displays default/init
//      * pvjs-editor remains hidden
//      * datasource dropdown remains hidden
//      * label input remains hidden
//   3) triangle selected
//      * pvjs-viewer displays default/init
//      * pvjs-editor remains hidden
//      * datasource dropdown remains hidden
//      * label input remains hidden
//   4) datanode re-selected
//      * pvjs-viewer displays data about datanode
//      * pvjs-editor remains hidden
//      * datasource dropdown remains hidden
//      * label input remains hidden
// B) Editor enabled (default is annotation tab active)
//   1) datanode still selected (from A4)
//      * pvjs-viewer displays default/init (details panel closes)
//      * pvjs-editor indicates active selection
//      * datasource dropdown displays value for datanode
//      * label input displays value for datanode
//   2) canvas selected
//      * pvjs-viewer displays default/init
//      * pvjs-editor displays default/init
//      * datasource dropdown displays default/init
//      * label input displays default/init
//   3) triangle selected
//      * pvjs-viewer displays default/init
//      * pvjs-editor indicates active selection
//      * datasource dropdown displays default/init
//      * label input displays value for triangle
//   4) datanode re-selected
//      * pvjs-viewer displays default/init (details panel remains closed)
//      * pvjs-editor indicates active selection
//      * datasource dropdown displays value for datanode
//      * label input displays value for datanode
//
// When the user activates the editor, we need for the datanode
// info to be reflected in the editor active selection indicator,
// the datasource dropdown and the label input. This is even though
// the click event of the selection has already passed.


import * as isArray from 'lodash/isArray';
import { not } from 'rxjs/util/not';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/let';
import 'rxjs/add/operator/partition';
import 'rxjs/add/operator/publishReplay';

interface PartitionResult {
	0: Observable<any>;
	1: Observable<any>;
	partitionNested?: Function;
	replay?: Function;
}

function partitionNested(
		sourceOrPartition: Observable<any>|PartitionResult,
		thisPassFn: Function,
		thisArg?: any,
		parentPassFn?: Function): PartitionResult {

	thisArg = thisArg || this;

  let source;
  let passFn;
  if (isArray(sourceOrPartition)) {
		passFn = function(x, i, o) {
			return parentPassFn(x, i, o) && thisPassFn(x, i, o);
		};
    source = Observable.merge.apply(thisArg, sourceOrPartition);
  } else {
    source = sourceOrPartition;
		passFn = thisPassFn;
  }

	let passSource = source.filter(passFn);
	let stopSource = source.filter(not(passFn, thisArg));

  let resultPartition: PartitionResult = [
    passSource,
    stopSource
  ];

	resultPartition.replay = function() {
		return source.publishReplay(1);
	};

  resultPartition.partitionNested = function(childPredicate, thisArg) {
    return partitionNested(resultPartition, childPredicate, thisArg, passFn.bind(thisArg));
  };

  return resultPartition;
};

declare module 'rxjs/Observable' {
  namespace Observable {
    export let partitionNested;
  }
	export interface Observable<T> {
		//partitionNested<U>(f: (x: T, fn: Function, thisArg?: any) => U): [Observable<U>];
		partitionNested: any;
	}
}

Observable.partitionNested = partitionNested;

Observable.prototype.partitionNested = function(
		fn: Function,
		thisArg?: any): PartitionResult {
	let source = this;
	return source
		.let(function(o) {
			return partitionNested(o, fn, thisArg);
		});
};

export default partitionNested;
