///<reference path="./node_modules/@types/es6-promise/index.d.ts" />
///<reference path="./node_modules/rxjs/Rx.d.ts" />

declare function RxNode(any): any;

declare module 'rx-node' {
	export = RxNode;
}
