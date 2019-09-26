/********************************************************
 * for related code and discussion, see
 * https://github.com/Reactive-Extensions/rx-node/pull/16
 * and
 * https://github.com/HackerHappyHour/rxjs-node/blob/master/lib/fromReadStream.js
 ********************************************************/

import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/publish";

export function fromNodeReadableStreamStatic(stream, finishEventName) {
  if (stream.pause) {
    stream.pause();
  }

  finishEventName = finishEventName || "end";

  return Observable.create(function(observer) {
    function dataHandler(data) {
      observer.next(data);
    }

    function errorHandler(err) {
      observer.error(err);
    }

    function endHandler() {
      observer.complete();
    }

    stream.addListener("data", dataHandler);
    stream.addListener("error", errorHandler);
    stream.addListener(finishEventName, endHandler);

    if (stream.resume) {
      stream.resume();
    }

    return function() {
      stream.removeListener("data", dataHandler);
      stream.removeListener("error", errorHandler);
      stream.removeListener(finishEventName, endHandler);
    };
  })
    .publish()
    .refCount();
}

declare module "rxjs/Observable" {
  namespace Observable {
    export let fromNodeReadableStream: typeof fromNodeReadableStreamStatic;
  }
}

Observable.fromNodeReadableStream = fromNodeReadableStreamStatic;

export default fromNodeReadableStreamStatic;
