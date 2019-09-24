import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/toArray";

// Adapted from Netflix Falcor.js example
// Returns just the last item
export function toNodeCallback<T>(cb) {
  let source: Observable<T> = this;
  let val;
  let hasVal = false;
  source.subscribe(
    function(x) {
      hasVal = true;
      val = x;
    },
    function(e: Error) {
      return cb(e);
    },
    function() {
      if (hasVal) {
        cb(null, val);
      }
    }
  );
}

export interface ToNodeCallbackSignature<T> {
  (cb: (err: Error | null, val: T) => {});
}
