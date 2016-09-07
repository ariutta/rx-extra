// apply a Node.js transform stream to an Observable

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

      source.subscribe(
          function(x) {
            // push some data
            // TODO how do we know whether to write as Buffer or String?
            var pushResponse = transformStream.write(new Buffer(x));
            //var pushResponse = transformStream.write(x);
            // if response is false, we must pause (backpressure)
            if (!pushResponse) {
              if (source.pause) {
                source.pause();
              }
            }
          },
          function(err) {
            err.message = (err.message || '') + ' in Rx.Observable.prototype.streamThrough';
            throw err;
          },
          function() {
            transformStream.end();
          }
      );

      if (source.resume) {
        source.resume();
      }

      var transformObservable = RxNode.fromReadableStream(
          transformStream,
          'end'
      );

      return transformObservable;
    });
  };

};
