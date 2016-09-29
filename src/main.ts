///<reference path="../index.d.ts" />

import * as Rx from 'rxjs/Rx';
import RxNode = require('rx-node');

declare module 'rxjs/Rx' {
	export const RxNode;
}

//import './add/observable/wow';

//require('./from-readable-stream.js')(Rx);
import './hierarchicalPartition';
import './splitOnChange';
import './then.js';
//require('./to-node-callback.js')(Rx);
//require('./stream-through.js')(Rx);
//require('./pan-wrap.js')(Rx);

export * from 'rxjs/Rx';
