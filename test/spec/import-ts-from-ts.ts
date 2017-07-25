import { keys } from "lodash";
import * as RxTS from "../../src/main";

describe("Import TS from TS", () => {
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
});
