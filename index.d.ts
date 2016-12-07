import { Observable } from 'rxjs/Observable';

interface PartitionNestedResult {
	0: Observable<any>;
	1: Observable<any>;
	partitionNested?: Function;
	replay?: Function;
}

declare module './src/main' {}
