module.exports = function(Rx) {

  function splitOnChange(source, keySelector) {
    var subject = new Rx.ReplaySubject();

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

  Rx.Observable.splitOnChange = splitOnChange;

  Rx.Observable.prototype.splitOnChange = function(keySelector) {
    var source = this;
    return source
      .let(function(o) {
        return splitOnChange(o, keySelector);
      });
  };

};
