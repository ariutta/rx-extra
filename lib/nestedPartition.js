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

function PassObserver(o, selector, source, parentStopSource) {
  // "o" is an observer
  this._o = o;
  // the partition predicate
  this._fn = selector;
  // the freshSource
  this._s = source;
  this._i = 0;
  this._sFiltered = parentStopSource;
  //this._oFiltered = new Subject();
  AbstractObserver.call(this);
}

function StopObserver(o, selector, source, parentStopSource) {
  // "o" is an observer
  this._o = o;
  // the partition predicate
  this._fn = selector;
  // the freshSource
  this._s = source;
  this._i = 0;
  this._sFiltered = parentStopSource;
  //this._oFiltered = new Subject();
  AbstractObserver.call(this);
}

inherits(PassObserver, AbstractObserver);
inherits(StopObserver, AbstractObserver);

PassObserver.prototype.next = function(x) {
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

StopObserver.prototype.next = function(x) {
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

PassObserver.prototype.error = function(e) {
  this._o.onError(e);
  //this._oFiltered.onError(e);
};
StopObserver.prototype.error = function(e) {
  this._o.onError(e);
  //this._oFiltered.onError(e);
};
PassObserver.prototype.completed = function() {
  this._o.onCompleted();
  //this._oFiltered.onCompleted();
};
StopObserver.prototype.completed = function() {
  this._o.onCompleted();
  //this._oFiltered.onCompleted();
};

function PassObservable(source, fn, parentStopSource, thisArg) {
  this.source = source;
  this.parentStopSource = parentStopSource;
  // the partition predicate
  this._fn = bindCallback(fn, thisArg, 3);
  ObservableBase.call(this);
}
function StopObservable(source, fn, parentStopSource, thisArg) {
  this.source = source;
  this.parentStopSource = parentStopSource;
  // the partition predicate
  this._fn = bindCallback(fn, thisArg, 3);
  ObservableBase.call(this);
}

inherits(PassObservable, ObservableBase);
inherits(StopObservable, ObservableBase);

function innerPass(fn, self) {
  return function(x, i, o) {
    return fn.call(
        this,
        self._fn(x, i, o),
        i,
        o
    );
  };
}

function innerStop(fn, self) {
  return function(x, i, o) {
    return fn.call(
        this,
        self._fn(x, i, o),
        i,
        o
    );
  };
}

PassObservable.prototype.internalPass = function(
    fn, parentStopSource, thisArg) {
  return new PassObservable(
      this.source,
      innerPass(fn, this),
      thisArg
  );
};

StopObservable.prototype.internalStop = function(
    fn, parentStopSource, thisArg) {
  return new StopObservable(
      this.source,
      innerStop(fn, this),
      thisArg
  );
};

PassObservable.prototype.subscribeCore = function(o) {
  // "o" is an observer
  /*
  var source = this.source;
  var fn = this._fn;
  var thisArg = this;
  return [
    filter(source, fn, thisArg),
    filter(source, function(x, i, o) {
      return !fn(x, i, o);
    })
  ];
  //*/
  var parentStopSource = this.parentStopSource;
  return this.source
  .subscribe(
      new PassObserver(o, this._fn, this, parentStopSource)
  );
};

StopObservable.prototype.subscribeCore = function(o) {
  // "o" is an observer
  /*
  var source = this.source;
  var fn = this._fn;
  var thisArg = this;
  return [
    filter(source, fn, thisArg),
    filter(source, function(x, i, o) {
      return !fn(x, i, o);
    })
  ];
  //*/
  var parentStopSource = this.parentStopSource;
  return this.source
  .subscribe(
      new StopObserver(o, this._fn, this, parentStopSource)
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
  if (replaySource instanceof PassObservable) {
    resultPartition = [
      replaySource.internalPass(thisPassFn, parentStopSource, thisArg),
      replaySource.internalStop(thisStopFn, parentStopSource, thisArg),
    ];
  } else {
    resultPartition = [
      new PassObservable(
          replaySource,
          thisPassFn,
          parentStopSource,
          thisArg
      ),
      new StopObservable(
          replaySource,
          thisStopFn,
          parentStopSource,
          thisArg
      )
    ];
  }

  return resultPartition;
};
