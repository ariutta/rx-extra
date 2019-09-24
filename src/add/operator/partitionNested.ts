import { Observable } from "rxjs/Observable";
import {
  partitionNested as partitionNestedStatic,
  PartitionNestedSignature
} from "../../operator/partitionNested";

Observable.prototype.partitionNested = partitionNestedStatic;

// NOTE: this addition to the module already declared,
// in '../../operator/partitionNested'
