'use strict';

var ObservableBase = require('@rxjs/rx/observable/observablebase');
var AbstractObserver = require('@rxjs/rx/observable/../observer/abstractobserver');
var bindCallback = require('@rxjs/rx/observable/../internal/bindcallback');
var filter = require('@rxjs/rx/observable/filter');
var isArrayLike = require('@rxjs/rx/helpers/isarraylike.js');
var isFunction = require('@rxjs/rx/observable/../helpers/isfunction');
var inherits = require('inherits');
var replay = require('@rxjs/rx/observable/replay');
var tryCatchUtils = require('@rxjs/rx/observable/../internal/trycatchutils');
var tryCatch = tryCatchUtils.tryCatch;
var errorObj = tryCatchUtils.errorObj;

function NestedPartitionObserver(o, selector, source) {
  // "o" is an observer
  this._o = o;
  // the pass or stop partition predicate
  this._fn = selector;
  this._s = source;
  this._i = 0;
  AbstractObserver.call(this);
}

inherits(NestedPartitionObserver, AbstractObserver);

NestedPartitionObserver.prototype.next = function(x) {
  // "this._o" is an observer
  var result = tryCatch(this._fn)(x, this._i++, this._s);
  if (result === errorObj) {
    return this._o.onError(result.e);
  } else if (result) {
    this._o.onNext(x);
  } else {
    //this._oFiltered.onNext(x);
  }
};

NestedPartitionObserver.prototype.error = function(e) {
  this._o.onError(e);
  //this._oFiltered.onError(e);
};
NestedPartitionObserver.prototype.completed = function() {
  this._o.onCompleted();
  //this._oFiltered.onCompleted();
};

function NestedPartitionObservable(source, fn, thisArg) {
  this.source = source;
  // the partition predicate
  this._fn = bindCallback(fn, thisArg, 3);
  ObservableBase.call(this);
}

inherits(NestedPartitionObservable, ObservableBase);

function innerNestedPartition(fn, self) {
  return function(x, i, o) {
    return fn.call(
        this,
        self._fn(x, i, o),
        i,
        o
    );
  };
}

NestedPartitionObservable.prototype.internalNestedPartition = function(fn, thisArg) {
  return new NestedPartitionObservable(
      this.source,
      innerNestedPartition(fn, this),
      thisArg
  );
};

NestedPartitionObservable.prototype.subscribeCore = function(o) {
  return this.source
  .subscribe(
      new NestedPartitionObserver(o, this._fn, this)
  );
};

module.exports = function map(sourceOrPartitioned, fn, thisArg) {
  var source;
  var parentStopSource;
  if (isArrayLike(sourceOrPartitioned)) {
    source = sourceOrPartitioned[0];
    parentStopSource = sourceOrPartitioned[1];
  } else {
    source = sourceOrPartitioned;
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
  var resultPartition;
  var passSource;
  var thisStopSource;
  if (replaySource instanceof NestedPartitionObservable) {
    passSource = replaySource.internalNestedPartition(thisPassFn, thisArg);
    thisStopSource = replaySource.internalNestedPartition(thisStopFn, thisArg);
  } else {
    passSource = new NestedPartitionObservable(replaySource, thisPassFn, thisArg);
    thisStopSource = new NestedPartitionObservable(
        replaySource,
        thisStopFn,
        thisArg
    );
  }

  var stopSource;
  if (parentStopSource) {
    stopSource = parentStopSource.concat(thisStopSource);
  } else {
    stopSource = thisStopSource;
  }

  return [
    passSource,
    stopSource
  ];
};
