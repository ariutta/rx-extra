# rx-extra

`rx-extra` extends the [RxJS 5](https://github.com/ReactiveX/rxjs) library with extra methods like `fromNodeReadableStream` and `splitOnChange`. If you're still using [RxJS 4](https://github.com/Reactive-Extensions/RxJS), you'll find the compatible version of `rx-extra` in branch [`RxJS4`](https://github.com/ariutta/rx-extra/tree/RxJS4).

## Install

`npm install --save rx-extra`

## Methods

### fromNodeReadableStream
```js
import {Observable} from 'rxjs/Observable';
import 'rx-extra/add/observable/fromNodeReadableStream';
import 'rx-extra/add/operator/map';

Observable.fromNodeReadableStream(myStream)
.map(x => objectMode ? x : x.toString())
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
import * as JSONStream from 'JSONStream';
import {Observable} from 'rxjs/Observable';
import 'rx-extra/add/operator/throughNodeStream';

Observable.from([
  '[{"a": 1},',
  '{"a": 2},{"a":',
  '3},',
  '{"a": 4}]'
])
.throughNodeStream(JSONStream.parse('..a'))
.subscribe(console.log, console.error);
```

If the `objectMode` option for your transform stream is not `true`,
you will need to handle any required conversion(s) between
`String|Buffer` and `Number|Boolean|Object`, e.g.:

```js
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/range';
import 'rx-extra/add/operator/map';
import 'rx-extra/add/operator/throughNodeStream';
import * as through2 from 'through2';

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

## TODOs

Move files into `add` directory as an NPM `prepublish` step.

Publish as an new major version in alpha status.

Consider using [`lift`](https://github.com/ReactiveX/RxJS/blob/master/doc/operator-creation.md) instead of patching directly:

> 2) Create your own Observable subclass and override lift to return it:
