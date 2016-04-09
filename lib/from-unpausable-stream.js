var ConnectableObservable = require('@rxjs/rx/observable/connectableobservable.js');
var createObservable = require('@rxjs/rx/observable/create.js');
var Subject = require('@rxjs/rx/subject.js');
var publish = require('@rxjs/rx/observable/publish.js');

module.exports = function(Rx) {
  // if RxNode is passed in, it doesn't have Observable
  var Observable = Rx.Observable || Rx;
  Observable.prototype = Observable.prototype || {};

  function fromUnpauseableStream(stream, finishEventName) {
    if (stream.pause) {
      stream.pause();
    }

    finishEventName = finishEventName || 'end';

    var observable = createObservable(function(observer) {
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
    });

    var subject = new Subject();

    ConnectableObservable.super_.addToObject({
      publish: publish
    });

    return new ConnectableObservable(observable, subject)
    .publish()
    .refCount();
  }

  Observable.fromUnpauseableStream = fromUnpauseableStream;
};
