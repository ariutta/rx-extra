var Rx = require('rx');
// Note: the following two are just included in the node build,
// not the browser build
var RxNode = require('rx-node');
var stream = require('stream');

function splitOnChange(source, keySelector) {
  var subject = new Rx.ReplaySubject();

  var previousKey;
  var currentGroup = [];

  if (typeof keySelector !== 'function') {
    keySelector = function(x) {
      return x;
    };
  }

  source.subscribe(function(currentItem) {
    var currentKey = keySelector(currentItem);
    if ((currentKey === previousKey) || !previousKey) {
      currentGroup.push(currentItem);
    } else {
      subject.onNext(currentGroup);
      currentGroup = [];
      currentGroup.push(currentItem);
    }
    previousKey = currentKey;
  },
  function(err) {
    throw err;
  },
  function() {
    subject.onNext(currentGroup);
    subject.onCompleted();
  });

  return subject;
}

Rx.Observable.prototype.splitOnChange = function(keySelector) {
  var source = this;
  return source
    .let(function(o) {
      return splitOnChange(o, keySelector);
    });
};

if (typeof Promise !== 'undefined') {
  // Based on example from Netflix's falcor:
  // https://github.com/Netflix/falcor/blob/
  // 03ea58f5ba05090a643f7268962885fb86e1b16f/lib/response/ModelResponse.js
  Rx.Observable.prototype.then = function then(onNext, onError) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var value;
      var rejected = false;
      self.toArray().subscribe(function(values) {
        if (values.length <= 1) {
          value = values[0];
        } else {
          value = values;
        }
      }, function(errors) {
        rejected = true;
        reject(errors);
      }, function() {
        if (rejected === false) {
          resolve(value);
        }
      });
    }).then(onNext, onError);
  };
}

// version adapted from Falcor example
Rx.Observable.prototype.toNodeCallback = function(cb) {
  var source = this;
  var val;
  var hasVal = false;
  source.subscribe(
    function(x) {
      hasVal = true;
      val = x;
    },
    function(e) {
      return cb(e);
    },
    function() {
      if (hasVal) {
        cb(null, val);
      }
    }
  );
};

/*
// version adapted from
// https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/callbacks.md
// TODO does this work?
Rx.Observable.prototype.toNodeCallback = function(cb) {
  var source = this;
  return function() {
    var val;
    var hasVal = false;
    source.subscribe(
      function(x) {
        hasVal = true; val = x;
      },
      function(e) {
        cb(e);
      },
      function() {
        if (hasVal) {
          cb(null, val);
        }
      }
    );
  };
};
//*/

function createStream(method) {
  var outputStream = this instanceof stream.Stream ? this : process.stdout;
  var source = method.apply(this, arguments);
  var disposable = RxNode.writeToStream(source, outputStream, 'utf8');
  return outputStream;
}

function wrapMethod(originalMethod, isArray) {
  var lastArgumentIndex = arguments.length - 1;
  var lastArgument = arguments[lastArgumentIndex];
  var lastArgumentIsFunction = typeof lastArgument === 'function';
  if (!lastArgumentIsFunction) {
    return originalMethod.apply(this, arguments);
  } else {
    var argumentsSanFirst = [];
    for (var i = 0; i++; i < lastArgumentIndex) {
      argumentsSanFirst.push(arguments[i]);
    }

    var source = originalMethod.apply(this, argumentsSanFirst);
    if (isArray) {
      source = source.toArray();
    }
    return source
      .toNodeCallback(lastArgument);
  }
}

// TODO check whether this actually works. Haven't tested it yet.
Rx.panWrap = function(mod, methodDetails) {
  // TODO make sure we should be using the method below, not Object.keys()
  var methodNamesToWrap = Object.getOwnPropertyNames(methodDetails);
  var streamsSupported = !!RxNode && !!stream;
  methodNamesToWrap.forEach(function(methodName) {
    var originalMethod = mod[methodName];
    var isArray = methodDetails[methodName].isArray;
    mod[methodName] = wrapMethod(originalMethod, isArray);

    if (streamsSupported) {
      var characters = methodName.split('');
      var capitalizedMethodName = characters.shift().toUpperCase() + characters.join('');
      mod['create' + capitalizedMethodName + 'Stream'] = createStream(originalMethod);
    }

  });

  return mod;
};

module.exports = Rx;
