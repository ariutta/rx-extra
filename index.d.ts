///<reference path="./node_modules/@types/es6-promise/index.d.ts" />
///<reference path="./node_modules/@types/lodash/index.d.ts" />
///<reference path="./node_modules/@types/node/index.d.ts" />
///<reference path="./node_modules/rxjs/Rx.d.ts" />

import {Observable} from 'rxjs/Observable';

interface PartitionNestedResult {
	0: Observable<any>;
	1: Observable<any>;
	partitionNested?: Function;
	replay?: Function;
}

declare module './src/main' {
}
