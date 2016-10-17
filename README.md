# rx-extra

`rx-extra` contains additional functionality not contained in the [RxJS 5](https://github.com/ReactiveX/rxjs) library. If you want the older [RxJS 4](https://github.com/Reactive-Extensions/RxJS)-compatible version of `rx-extra`, see the [RxJS4 branch](https://github.com/ariutta/rx-extra/tree/RxJS4).

## Install

`npm install --save rx-extra`

## Methods

TODO: decide on and implement a format for adding observables/operators, e.g.:
```js
  import {Observable} from 'rxjs/Observable';
  import 'rx-extra/add/observable/fromNodeReadableStream';
  import 'rx-extra/add/operator/splitOnChange';
```

TODO: consider using [`lift`](https://github.com/ReactiveX/RxJS/blob/master/doc/operator-creation.md) instead of patching directly:

> 2) Create your own Observable subclass and override lift to return it:


### fromNodeReadableStream
```js
  import {Observable} from 'rxjs/Observable';
  import 'rx-extra/add/observable/fromNodeReadableStream';
  import 'rx-extra/add/operator/map';

  Observable.fromNodeReadableStream(myStream)
  .map(x => objectMode ? x : x.toString())
  .subscribe(console.log, console.error);
```

### hierarchicalPartition
TODO: decide whether to update this to `partitionNested`. Also, consider using `prime` or `init` instead of `replay`.
```js
  import {Observable} from 'rxjs/Observable';
  import 'rxjs/add/observable/range';
  import 'rx-extra/add/operator/hierarchicalPartition';
  let [evenSource, oddSource] = Observable.range(1, 20)
  .hierarchicalPartition(x => x % 2 === 0);

  let [multipleOfSixSource, notMultipleOfSixSource] = Observable.hierarchicalPartition(
      x => x % 3 === 0,
      evenSource,
      oddSource
  );

  multipleOfSixSource
  .subscribe(console.log, console.error);
```

### partitionNested
```js
  import {Observable} from 'rxjs/Observable';
  import 'rxjs/add/observable/range';
  import 'rx-extra/add/operator/partitionNested';
  let partitioned = Observable.range(1, 20)
  .partitionNested(x => x % 2 === 0);

  let [evenSource, oddSource] = partitioned;

  let [multipleOfSixSource, notMultipleOfSixSource] = partitioned
  .partitionNested(x => x % 3 === 0);

  multipleOfSixSource
  .subscribe(console.log, console.error);
```

### splitOnChange
```js
  import {Observable} from 'rxjs/Observable';
  import 'rxjs/add/observable/from';
  import 'rx-extra/add/operator/splitOnChange';
  Observable.from([{
    value: 5,
  }, {
    value: 5,
  }, {
    value: 6,
  }, {
    value: 7,
  }
  }])
  .splitOnChange(function(item) {
    return item.value;
  })
  .subscribe(console.log, console.error);
```

### then (Promise)
```js
  import {Observable} from 'rxjs/Observable';
  import 'rxjs/add/observable/range';
  import 'rx-extra/add/operator/then';
  Observable.range(1, 3)
  .then(console.log, console.error);
```

### throughNodeStream
```js
  import {Observable} from 'rxjs/Observable';
  import 'rxjs/add/observable/range';
  import 'rx-extra/add/operator/map';
  import 'rx-extra/add/operator/throughNodeStream';
  import * as through2 from 'through2';

  Observable.range(1, 3)
  .map(x => x.toString())
  .throughNodeStream(through2.obj(function(x, enc, callback) {
    var that = this;
    for (var i=0; i<x; i++) {
      that.push(x);
    }
    callback();
  }))
  .map(x => parseInt(x.toString()))
  .subscribe(console.log, console.error);
```

If your transform stream has not set `objectMode: true`, you will need to handle
any required conversion(s) between `String|Buffer` and `Number|Boolean|Object`, e.g.:

```js
  Observable.range(1, 3)
  .map(x => x.toString())
  .throughNodeStream(through2(function(chunk, enc, callback) {
    var that = this;
    let x = parseInt(chunk.toString());
    for (var i=0; i<x; i++) {
      that.push(String(x + 1));
    }
    callback();
  }))
  .map(x => parseInt(x.toString()))
  .subscribe(console.log, console.error);
```

### toNodeCallback
```js
  import {Observable} from 'rxjs/Observable';
  import 'rxjs/add/observable/range';
  import 'rx-extra/add/operator/toNodeCallback';
  Observable.range(1, 3)
  .toNodeCallback(function(err, result) {
    if (err) {
      throw err;
    }
    console.log(result);
  });
```
