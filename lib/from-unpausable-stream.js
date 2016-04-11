'use strict';

var ConnectableObservable = require('@rxjs/rx/observable/connectableobservable.js');
var createObservable = require('@rxjs/rx/observable/create.js');
var Subject = require('@rxjs/rx/subject.js');
var publish = require('@rxjs/rx/observable/publish.js');

module.exports = function fromNopauseStream(stream, finishEventName, dataEventName) {
  if (stream.pause) {
    stream.pause();
  }

  dataEventName = dataEventName || 'data';
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

    stream.addListener(dataEventName, dataHandler);
    stream.addListener('error', errorHandler);
    stream.addListener(finishEventName, endHandler);

    if (stream.resume) {
      stream.resume();
    }

    return function() {
      stream.removeListener(dataEventName, dataHandler);
      stream.removeListener('error', errorHandler);
      stream.removeListener(finishEventName, endHandler);
    };
  });

  var subject = new Subject();

  return new ConnectableObservable(observable, subject)
  .refCount();
};
