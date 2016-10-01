///<reference path="../index.d.ts" />
"use strict";
var Observable_1 = require('rxjs/Observable');
require('rxjs/add/operator/toArray');
require('rxjs/add/operator/toPromise');
if (typeof Promise !== 'undefined') {
    // Based on example from Netflix's falcor:
    // https://github.com/Netflix/falcor/blob/
    // 03ea58f5ba05090a643f7268962885fb86e1b16f/lib/response/ModelResponse.js
    Observable_1.Observable.prototype.then = function then(onNext, onError) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var value;
            var rejected = false;
            self.toArray().subscribe(function (values) {
                if (values.length <= 1) {
                    value = values[0];
                }
                else {
                    value = values;
                }
            }, function (errors) {
                rejected = true;
                reject(errors);
            }, function () {
                if (rejected === false) {
                    resolve(value);
                }
            });
        }).then(onNext, onError);
    };
}
//# sourceMappingURL=then.js.map