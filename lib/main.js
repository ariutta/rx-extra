var Rx = require('@rxjs/rx/rx.lite.js');

var RxNode = Rx.RxNode = require('rx-node');

// TODO what is the performance cost of this, if any?
//Rx.config.longStackSupport = true;

require('./from-unpausable-stream.js')(Rx);
require('./from-unpausable-stream.js')(RxNode);

require('./hierarchical-partition.js')(Rx);
require('./hierarchical-partition.js')(RxNode);

require('./split-on-change.js')(Rx);
require('./split-on-change.js')(RxNode);

require('./then.js')(Rx);
require('./then.js')(RxNode);

require('./to-node-callback.js')(Rx);
require('./to-node-callback.js')(RxNode);

//require('./stream-through.js')(Rx);

require('./pan-wrap.js')(Rx);

require('./ask.js')(RxNode);
require('./spawn.js')(RxNode);

module.exports = Rx;
