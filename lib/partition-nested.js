// TODO this is an in-progress version that is not part of the API yet.
// It is an updated version of hierarchical partition.
// Is @rxjs version 4 or 5? Either way, the code involving @rxjs is
// attempting to allow for tree-shaking as in roll-up, for smaller
// bundle size.
// I don't know whether the code below actually works.
'use strict';

var ObservableBase = require('@rxjs/rx/observable/observablebase');
var AbstractObserver = require('@rxjs/rx/observable/../observer/abstractobserver');
var bindCallback = require('@rxjs/rx/observable/../internal/bindcallback');
var isArrayLike = require('@rxjs/rx/helpers/isarraylike.js');
var isFunction = require('@rxjs/rx/observable/../helpers/isfunction');
var inherits = require('inherits');
var merge = require('@rxjs/rx/observable/merge');
var replay = require('@rxjs/rx/observable/replay');
var tryCatchUtils = require('@rxjs/rx/observable/../internal/trycatchutils');
var tryCatch = tryCatchUtils.tryCatch;
var errorObj = tryCatchUtils.errorObj;

function PartitionNestedObserver(o, selector, source) {
  // "o" is an observer
  this._o = o;
  // the pass or stop partition predicate
  this._fn = selector;
  this._s = source;
  this._i = 0;
  AbstractObserver.call(this);
}

inherits(PartitionNestedObserver, AbstractObserver);

PartitionNestedObserver.prototype.next = function(x) {
  // "this._o" is an observer
  var passes = tryCatch(this._fn)(x, this._i++, this._s);
  if (passes === errorObj) {
    return this._o.onError(passes.e);
  } else if (passes) {
    this._o.onNext(x);
  }
};

PartitionNestedObserver.prototype.error = function(e) {
  this._o.onError(e);
};
PartitionNestedObserver.prototype.completed = function() {
  this._o.onCompleted();
};

function PartitionNestedObservable(source, fn, thisArg) {
  this.source = source;
  // the partition predicate
  this._fn = bindCallback(fn, thisArg, 3);
  ObservableBase.call(this);
}

inherits(PartitionNestedObservable, ObservableBase);

function innerPartitionNested(fn, self) {
  return function(x, i, o) {
    return fn.call(
        this,
        self._fn(x, i, o),
        i,
        o
    );
  };
}

PartitionNestedObservable.prototype.internalPartitionNested = function(fn, thisArg) {
  return new PartitionNestedObservable(
      this.source,
      innerPartitionNested(fn, this),
      thisArg
  );
};

PartitionNestedObservable.prototype.subscribeCore = function(o) {
  console.log('o');
  console.log(o);
  console.log('this');
  console.log(this);
  return this.source
  .subscribe(
      new PartitionNestedObserver(o, this._fn, this)
  );
};

module.exports = function partitionNested(sourceOrPartition, fn, thisArg) {

  var source;
  var parentStopSource;
  if (isArrayLike(sourceOrPartition)) {
    source = sourceOrPartition[0];
    parentStopSource = sourceOrPartition[1];
  } else {
    source = sourceOrPartition;
  }

  var replaySource = replay(
    source,
    function(x) {
      return x;
    },
    1
  );

  var thisPassFn = isFunction(fn) ? fn : function() { return fn; };
  var thisStopFn = function(x, i, o) {
    return !thisPassFn(x, i, o);
  };
  var passSource;
  var thisStopSource;
  if (replaySource instanceof PartitionNestedObservable) {
    passSource = replaySource.internalPartitionNested(thisPassFn, thisArg);
    thisStopSource = replaySource.internalPartitionNested(thisStopFn, thisArg);
  } else {
    passSource = new PartitionNestedObservable(replaySource, thisPassFn, thisArg);
    thisStopSource = new PartitionNestedObservable(
        replaySource,
        thisStopFn,
        thisArg
    );
  }

  var stopSource;
  if (parentStopSource) {
    stopSource = merge(thisStopSource, parentStopSource);
  } else {
    stopSource = thisStopSource;
  }

  var resultPartition = [
    passSource,
    stopSource
  ];

  resultPartition.partitionNested = function(childPredicate) {
    return partitionNested(resultPartition, childPredicate, thisArg);
  };

  return resultPartition;
};
