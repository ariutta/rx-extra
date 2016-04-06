var Rx = require('rx');

// Note: the following is just included in the node build,
// not the browser build
var RxNode = require('rx-node');

Rx.config.longStackSupport = true;

require('./lib/from-unpausable-stream.js')(Rx);
require('./lib/hierarchical-partition.js')(Rx);
require('./lib/split-on-change.js')(Rx);
require('./lib/then.js')(Rx);
require('./lib/to-node-callback.js')(Rx);

// this one must be after then (maybe maybe others?)
require('./lib/pan-wrap.js')(Rx, RxNode);

module.exports = Rx;
