import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import "rxjs/add/observable/merge";
import "rxjs/add/operator/partition";

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

function mount<T>(
  mountableSource: Observable<T>,
  passFn: PassFn<T>,
  parentPassFn: PassFn<T>,
  grandparentRunningPassFn: PassFn<T>,
  thisArg: any
): PartitionNestedResult<T> {
  let parentRunningPassFn = function(value: T): boolean {
    return grandparentRunningPassFn(value) && parentPassFn(value);
  };
  return partitionNestedInner(
    mountableSource.last().partitionNested(parentRunningPassFn, thisArg),
    passFn,
    parentRunningPassFn,
    thisArg
  );
}

export function partitionNested<T>(
  passFn: PassFn<T>,
  thisArg?: any
): PartitionNestedResult<any> {
  let source = this;
  let partition: Partition<T> = source.partition(passFn, thisArg);
  let [passSource, stopSource] = partition;

  let mountableSource = source.multicast(() => new ReplaySubject(1)).refCount();

  let parentRunningPassFn = () => true;

  return new PartitionNestedResult(
    passSource,
    stopSource,
    function(childPassFn, thisArg) {
      return mount(
        mountableSource,
        passFn,
        childPassFn,
        parentRunningPassFn,
        thisArg
      );
    },
    function(childPassFn, thisArg): PartitionNestedResult<T> {
      return partitionNestedInner(
        partition,
        childPassFn,
        parentRunningPassFn,
        thisArg
      );
    }
  );
}

export function partitionNestedInner<T>(
  parentPartition: Partition<T> | PartitionNestedResult<T>,
  passFn: PassFn<T>,
  parentRunningPassFn: PassFn<T>,
  thisArg: any
): PartitionNestedResult<T> {
  let [parentPassSource, parentStopSource] = parentPartition;

  let [passSource, additionalStopSource] = parentPassSource.partition(
    passFn,
    thisArg
  );

  let stopSource: Observable<T> = Observable.merge.apply(thisArg, [
    parentStopSource,
    additionalStopSource
  ]);

  let partition: Partition<T> = [passSource, stopSource];

  let mountableSource = Observable.merge
    .apply(thisArg, partition)
    .multicast(() => new ReplaySubject(1))
    .refCount();

  return new PartitionNestedResult(
    passSource,
    stopSource,
    function(childPassFn, thisArg) {
      return mount(
        mountableSource,
        childPassFn,
        passFn,
        parentRunningPassFn,
        thisArg
      );
    },
    function(childPassFn, thisArg): PartitionNestedResult<T> {
      return partitionNestedInner(
        partition,
        childPassFn,
        parentRunningPassFn,
        thisArg
      );
    }
  );
}

export interface MountSignature<T> {
  (
    mountableSource: Observable<T>,
    passFn: PassFn<T>,
    parentPassFn: PassFn<T>,
    grandparentRunningPassFn: PassFn<T>,
    thisArg: any
  ): PartitionNestedResult<T>;
}

export type Partition<T> = [Observable<T>, Observable<T>];

export class PartitionNestedResult<T> extends Array<any> {
  mount: MountSignature<T>;
  partitionNested: PartitionNestedSignature<T>;
  constructor(passSource, stopSource, mount, partitionNested) {
    super();
    this[0] = passSource;
    this[1] = stopSource;
    this.mount = mount;
    this.partitionNested = partitionNested;
  }
}

export interface PartitionNestedSignature<T> {
  (passFn: PassFn<T>, thisArg?: any): PartitionNestedResult<T>;
}

export type PassFn<T> = (value: T) => boolean;

declare module "rxjs/Observable" {
  interface Observable<T> {
    partitionNested: PartitionNestedSignature<T>;
  }
}
