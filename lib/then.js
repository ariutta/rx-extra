// Based on example from Netflix's falcor:
// https://github.com/Netflix/falcor/blob/
// 03ea58f5ba05090a643f7268962885fb86e1b16f/lib/response/ModelResponse.js

module.exports = function then(source, onNext, onError) {
  console.log('source');
  console.log(source);

  console.log('source.prototype');
  console.log(source.prototype);
  if (typeof Promise === 'undefined') {
    return onError(new Error('Promises not supported. Provide polyfill.'));
  }

  return new Promise(function(resolve, reject) {
    var value;
    var rejected = false;
    source
    .toArray()
    .subscribe(function(values) {
      if (values.length <= 1) {
        value = values[0];
      } else {
        value = values;
      }
    }, function(errors) {
      rejected = true;
      reject(errors);
    }, function() {
      if (rejected === false) {
        resolve(value);
      }
    });
  })
  .then(onNext, onError);
};

//module.exports = function(Rx) {
//  // if RxNode is passed in, it doesn't have Observable
//  var Observable = Rx.Observable || Rx;
//  Observable.prototype = Observable.prototype || {};
//
//  if (typeof Promise !== 'undefined') {
//    // Based on example from Netflix's falcor:
//    // https://github.com/Netflix/falcor/blob/
//    // 03ea58f5ba05090a643f7268962885fb86e1b16f/lib/response/ModelResponse.js
//    Observable.prototype.then = function then(onNext, onError) {
//      var self = this;
//      return new Promise(function(resolve, reject) {
//        var value;
//        var rejected = false;
//        self.toArray().subscribe(function(values) {
//          if (values.length <= 1) {
//            value = values[0];
//          } else {
//            value = values;
//          }
//        }, function(errors) {
//          rejected = true;
//          reject(errors);
//        }, function() {
//          if (rejected === false) {
//            resolve(value);
//          }
//        });
//      }).then(onNext, onError);
//    };
//  }
//
//};

//Rx.Observable.prototype.then = function() {
//  // Do stuff before calling function
//  var len = arguments.length;
//  console.log('len');
//  console.log(len);
//  for (var i = 0; i <= len; i++) {
//    console.log('arguments[i]');
//    console.log(arguments[i]);
//  }
//  // Call the function as it would have been called normally:
//  // Run stuff after, here.
//};

//module.exports = function(source, onSuccess, onError) {
//  console.log('source');
//  console.log(source);
//  console.log('onSuccess');
//  console.log(onSuccess);
//  console.log('onError');
//  console.log(onError);
//};
