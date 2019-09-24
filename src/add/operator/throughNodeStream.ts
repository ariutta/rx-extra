import { Observable } from "rxjs/Observable";
import { throughNodeStream } from "../../operator/throughNodeStream";

Observable.prototype.throughNodeStream = throughNodeStream;

declare module "rxjs/Observable" {
  interface Observable<T> {
    throughNodeStream: typeof throughNodeStream;
  }
}
