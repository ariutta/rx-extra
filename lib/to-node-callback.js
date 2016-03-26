module.exports = function(Rx) {

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

};
