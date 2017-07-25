import { keys } from "lodash";
//import * as RxCompiledToJS from "../../lib/main";
import * as RxTS from "../../src/main";

test("Rx.Subject works w/ main.ts", done => {
  expect.assertions(1);

  var subject = new RxTS.Subject();

  subject.subscribe(
    function(x) {
      expect(x).toBe(1);
    },
    done,
    done
  );

  subject.next(1);
  subject.complete();
});

//test("Rx.Subject works w/ main.js", done => {
//  expect.assertions(1);
//
//  var subject = new RxCompiledToJS.Subject();
//
//  subject.subscribe(
//    function(x) {
//      expect(x).toBe(1);
//    },
//    done,
//    done
//  );
//
//  subject.next(1);
//  subject.complete();
//});
