var Rx = require('rx');

var RxNode = Rx.RxNode = require('rx-node');

// TODO what is the performance cost of this, if any?
Rx.config.longStackSupport = true;

require('./from-unpausable-stream.js')(Rx);
require('./hierarchical-partition.js')(Rx);
require('./split-on-change.js')(Rx);
require('./then.js')(Rx);
require('./to-node-callback.js')(Rx);
require('./stream-through.js')(Rx, RxNode);
require('./pan-wrap.js')(Rx, RxNode);

module.exports = Rx;
