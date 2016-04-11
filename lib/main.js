var Rx = require('@rxjs/rx/index.js');

Rx.Observable.addToObject({
  partitionNested: require('./partition-nested.js'),
});
Rx.Observable.addToPrototype({
  partitionNested: require('./partition-nested.js'),
  then: require('./then.js'),
  //then: require('@rxjs/rx/observable/topromise.js'),
  toNodeCallback: require('./to-node-callback.js'),
});

// TODO what is the performance cost of this, if any?
//Rx.config.longStackSupport = true;

module.exports = Rx;
