var Rx = require('rx');

// Note: the following is just included in the node build,
// not the browser build
var RxNode = require('rx-node');

Rx.config.longStackSupport = true;

require('./from-unpausable-stream.js')(Rx);
require('./hierarchical-partition.js')(Rx);
require('./split-on-change.js')(Rx);
require('./then.js')(Rx);
require('./to-node-callback.js')(Rx);

// this one must be after then (maybe maybe others?)
require('./pan-wrap.js')(Rx, RxNode);

module.exports = Rx;
