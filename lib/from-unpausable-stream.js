//require('pretty-error').start();
//var VError = require('verror');
var VError = Error;

module.exports = function(Rx) {
  var RxNode = Rx.RxNode;

  RxNode.fromUnpauseableStream = function(stream, finishEventName) {
    if (stream.pause) {
      stream.pause();
    }

    finishEventName = finishEventName || 'end';

    return Rx.Observable.create(function(observer) {
      function dataHandler(data) {
        observer.onNext(data);
      }

      function errorHandler(err) {
        observer.onError(err);
      }

      function endHandler() {
        observer.onCompleted();
      }

      stream.addListener('data', dataHandler);
      stream.addListener('error', errorHandler);
      stream.addListener(finishEventName, endHandler);

      if (stream.resume) {
        stream.resume();
      }

      return function() {
        stream.removeListener('data', dataHandler);
        stream.removeListener('error', errorHandler);
        stream.removeListener(finishEventName, endHandler);
      };
    }).publish().refCount();
  };
};
