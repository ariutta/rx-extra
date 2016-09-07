var Rx = global.Rx = global.Rx || require('rx');

var RxNode = global.RxNode || Rx.RxNode;
if (!RxNode) {
  RxNode = global.RxNode = Rx.RxNode = require('rx-node');
}

require('./from-readable-stream.js')(Rx);
require('./hierarchical-partition.js')(Rx);
require('./split-on-change.js')(Rx);
require('./then.js')(Rx);
require('./to-node-callback.js')(Rx);
require('./stream-through.js')(Rx);
require('./pan-wrap.js')(Rx);

module.exports = Rx;
