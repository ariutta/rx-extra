var ReplaySubject = require('@rxjs/rx/replaysubject.js');

module.exports = function(Rx) {
  // if RxNode is passed in, it doesn't have Observable
  var Observable = Rx.Observable || Rx;
  Observable.prototype = Observable.prototype || {};

  function splitOnChange(source, keySelector) {
    var subject = new ReplaySubject();

    var previousKey;
    var currentGroup = [];

    // Three options for keySelector:
    // 1) a function: we just run that function.
    // 2) pluck style API where keySelector is a key name
    // 3) not a function and not a string: we use JS ===
    //    equality comparison for the items.
    if (typeof keySelector === 'string') {
      var keySelectorString = keySelector;
      keySelector = function(x) {
        return x[keySelectorString];
      };
    } else if (typeof keySelector !== 'function') {
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
      if (currentGroup.length > 0) {
        subject.onNext(currentGroup);
      }
      subject.onCompleted();
    });

    return subject;
  }

  Observable.splitOnChange = splitOnChange;

  Observable.prototype.splitOnChange = function(keySelector) {
    var source = this;
    return splitOnChange(source, keySelector);
  };

};
