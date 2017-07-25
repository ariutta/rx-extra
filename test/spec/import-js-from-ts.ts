import { keys } from "lodash";
import * as RxCompiledToJS from "../../main";

describe("Import JS from TS", () => {
  test("Rx.Subject works w/ main.js", done => {
    expect.assertions(1);

    var subject = new RxCompiledToJS.Subject();

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
});
