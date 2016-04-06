# rx-extra

`rx-extra` contains additional functionality not contained in the [rx](https://www.npmjs.com/package/rx) package, including:

## Methods

### hierarchicalPartition
```js
  var Rx = require('rx');
  require('rx-extra/lib/hierarchical-partition')(Rx);
  var evenOddPartition = Rx.Observable.range(1, 20)
  .hierarchicalPartition(function(value) {
    return value % 2 === 0;
  });

  var multipleOfSixPartition = Rx.Observable.hierarchicalPartition(
      function(value) {
        return value % 3 === 0;
      },
      evenOddPartition[0], // evenSource
      evenOddPartition[1] // oddSource
  );
  var multipleOfSixSource = multipleOfSixPartition[0];
  var notMultipleOfSixSource = multipleOfSixPartition[1];

  multipleOfSixSource
  .subscribe(console.log, console.error);
```

### fromUnpauseableStream
```js
  var Rx = require('rx');
  require('rx-extra/lib/from-unpausable-stream.js')(Rx);
  ...
```

### panWrap
```js
  var Rx = require('rx');
  var RxNode = require('rx-node');
  require('rx-extra/lib/pan-wrap.js')(Rx, RxNode);
  ...

```

### splitOnChange
```js
  var Rx = require('rx');
  require('rx-extra/lib/split-on-change.js')(Rx);
  Rx.Observable.from([{
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
  var Rx = require('rx');
  require('rx-extra/lib/then.js')(Rx);
  Rx.Observable.range(1, 3)
  .then(console.log, console.error);
```

### toNodeCallback
```js
  var Rx = require('rx');
  require('rx-extra/lib/to-node-callback.js')(Rx);
  Rx.Observable.range(1, 3)
  .toNodeCallback(function(err, result) {
    if (err) {
      throw err;
    }
    console.log(result);
  });
```


