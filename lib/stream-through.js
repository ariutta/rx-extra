// apply a Node.js transform stream to an Observable

var Readable = require('stream').Readable;

module.exports = function(Rx) {
  var RxNode = Rx.RxNode;

  /**
   * streamThrough
   *
   * @param {Stream} transformStream
   * @param [encoding]
   * @return {Observable}
   */
  Rx.Observable.prototype.streamThrough = function(transformStream, encoding) {
    return this.let(function(observable) {
      var source = observable.pausableBuffered();

      function onDrain() {
        source.resume();
      }

      var readable = new Readable({
        read: function(n) {
          // sets this._read under the hood
          // n appears to be the number of bytes requested?

          var that = this;
          // TODO should we add more things like the drain listener?
          //that.addListener('drain', onDrain);

          source.resume();
        }
      });

      var transformObservable = RxNode.fromStream(
          readable
          .pipe(transformStream, encoding),
          'end'
      );

      source.subscribe(
          function(x) {
            // push some data
            var pushResponse = readable.push(x);
            // if response is false, we must pause (backpressure)
            if (!pushResponse) {
              source.pause();
            }
          },
          function(err) {
            throw err;
          },
          function() {
            readable.push(null);
            //stream.removeListener('drain', onDrain);
          }
      );

      return transformObservable;
    });

  };

};
