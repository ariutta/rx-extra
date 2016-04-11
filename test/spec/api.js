/**
 * Test public APIs
 */

var _ = require('lodash');
var expect = require('chai').expect;
var JSONStream = require('jsonstream');
var Observable = require('@rxjs/rx/observable');
var RxNode = require('rx-node-extra');

var objectMethods = {
  from: require('@rxjs/rx/observable/from.js'),
  fromStream: RxNode.fromStream,
  fromReadableStream: RxNode.fromReadableStream.bind(RxNode),
  fromUnpausableStream: require('rx-node-extra/lib/from-unpausable-stream.js').bind(RxNode),
  partitionNested: require('../../lib/partition-nested.js'),
  range: require('@rxjs/rx/observable/range.js'),
  throw: require('@rxjs/rx/observable/throw.js'),
  timer: require('@rxjs/rx/observable/timer.js'),
};
var protoMethods = {
  concat: require('@rxjs/rx/observable/concat.js'),
  delay: require('@rxjs/rx/observable/delay.js'),
  map: require('@rxjs/rx/observable/map.js'),
  multicast: require('@rxjs/rx/observable/multicast.js'),
  partition: require('@rxjs/rx/observable/partition.js'),
  partitionNested: require('../../lib/partition-nested.js'),
  takeUntil: require('@rxjs/rx/observable/takeuntil.js'),
  tap: require('@rxjs/rx/observable/tap.js'),
  then: require('../../lib/then.js'),
  //then: require('@rxjs/rx/observable/topromise.js'),
  toArray: require('@rxjs/rx/observable/toarray.js'),
  toNodeCallback: require('../../lib/to-node-callback.js'),
};

var Rx = {};
Rx.Observable = Observable;
Rx.Observable.addToObject(objectMethods);
Rx.Observable.addToPrototype(protoMethods);

RxNode.addToObject(objectMethods);
RxNode.addToPrototype(protoMethods);

console.log('Rx.Observable');
console.log(Rx.Observable);
console.log('Rx.Observable.prototype');
console.log(Rx.Observable.prototype);

console.log('RxNode');
console.log(RxNode);
console.log('RxNode.prototype');
console.log(RxNode.prototype);

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

var RxFs = require('rx-fs');
var sinon = require('sinon');
var sologger = require('../sologger.js');
var stream = require('stream');

//process.env.NODE_ENV = 'development';

// Run tests
describe('Public API', function() {

  describe('partitionNested', function() {
    // TODO changed API:
    // 1) pass in either a partition or a source,
    //    but not a separate param for each source
    // 2) no explicit replay method. it's automatic.

    it('should run as prototype with source', function(done) {
      var evenPartition = Rx.Observable.range(1, 20)
      .partitionNested(function(value) {
        return value % 2 === 0;
      });

      var evenSource = evenPartition[0];

      evenSource
      .toArray()
      .tap(function(actual) {
        var expected = [
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20
        ];
        expect(actual).to.eql(expected);
      }, done)
      .subscribeOnCompleted(done);
    });

    it('should run as Class with partition', function(done) {
      var evenPartition = Rx.Observable.range(1, 20)
      .partition(function(value) {
        return value % 2 === 0;
      });

      var multipleOfSixPartition = Rx.Observable.partitionNested(
          evenPartition,
          function(value) {
            return value % 3 === 0;
          }
      );
      var multipleOfSixSource = multipleOfSixPartition[0];
      var notMultipleOfSixSource = multipleOfSixPartition[1];

      multipleOfSixSource
      .toArray()
      .tap(function(actual) {
        var expected = [
          6,
          12,
          18
        ];
        expect(actual).to.eql(expected);
      })
      .concat(
        notMultipleOfSixSource
        .toArray()
        .tap(function(actual) {
          var expected = [
            1,
            2,
            3,
            4,
            5,
            7,
            8,
            9,
            10,
            11,
            13,
            14,
            15,
            16,
            17,
            19,
            20
          ];
          expect(actual).to.eql(expected);
        })
      )
      .tap(null, done)
      .subscribeOnCompleted(done);
    });

    it('should run as Class with source then Class with partition', function(done) {
      var source = Rx.Observable.range(1, 20);

      var evenPartition = Rx.Observable.partitionNested(
          source,
          function(value) {
            return value % 2 === 0;
          }
      );

      var multipleOfSixPartition = Rx.Observable.partitionNested(
          evenPartition,
          function(value) {
            return value % 3 === 0;
          }
      );
      var multipleOfSixSource = multipleOfSixPartition[0];
      var notMultipleOfSixSource = multipleOfSixPartition[1];

      multipleOfSixSource
      .toArray()
      .tap(function(actual) {
        var expected = [
          6,
          12,
          18
        ];
        expect(actual).to.eql(expected);
      })
      .concat(
        notMultipleOfSixSource
        .toArray()
        .tap(function(actual) {
          var expected = [
            1,
            2,
            3,
            4,
            5,
            7,
            8,
            9,
            10,
            11,
            13,
            14,
            15,
            16,
            17,
            19,
            20
          ];
          expect(actual).to.eql(expected);
        })
      )
      .tap(null, done)
      .subscribeOnCompleted(done);
    });

    it('should run as prototype with source then prototype with partition', function(done) {
      var evenPartition = Rx.Observable.range(1, 20)
      .partitionNested(function(value) {
        return value % 2 === 0;
      });

      var evenSource = evenPartition[0];
      var oddSource = evenPartition[1];

      var multipleOfSixPartition = evenPartition
      .partitionNested(
          function(value) {
            return value % 3 === 0;
          }
      );
      var multipleOfSixSource = multipleOfSixPartition[0];
      var notMultipleOfSixSource = multipleOfSixPartition[1];

      multipleOfSixSource
      .takeUntil(Rx.Observable.timer(5))
      .toArray()
      .tap(function(actual) {
        var expected = [
          6,
          12,
          18
        ];
        expect(actual).to.eql(expected);
      })
      .concat(
        notMultipleOfSixSource
        .takeUntil(Rx.Observable.timer(5))
        .toArray()
        .tap(function(actual) {
          var expected = [
            1,
            2,
            3,
            4,
            5,
            7,
            8,
            9,
            10,
            11,
            13,
            14,
            15,
            16,
            17,
            19,
            20
          ];
          expect(actual).to.eql(expected);
        })
      )
      .tap(null, done)
      .subscribeOnCompleted(done);

    });

    it('should replay', function(done) {

      var fastDelay = 200;
      var slowDelay = 500;

      var source = Rx.Observable.from([{
        rating: 4,
        color: 'green'
      }, {
        rating: 4,
        color: 'red'
      }, {
        rating: 2,
        color: 'yellow'
      }, {
        rating: 3,
        color: 'red'
      }, {
        rating: 5,
        color: 'green'
      }, {
        rating: 4,
        color: 'yellow'
      }, {
        rating: 4,
        color: 'red'
      }])
      .delay(fastDelay);

      var rated4PlusPartition = Rx.Observable.partitionNested(
          source,
          function(item) {
            return item.rating >= 4;
          }
      );
      var rated4PlusSource = rated4PlusPartition[0];
      var ratedUnder4Source = rated4PlusPartition[1]
      .delay(fastDelay);

      var redRated4PlusPartition = Rx.Observable.partitionNested(
          [
            rated4PlusSource,
            ratedUnder4Source
          ],
          function(item) {
            return item.color === 'red';
          }
      );

      var redRated4PlusSource = redRated4PlusPartition[0];
      var notRedOrRatedUnder4Source = redRated4PlusPartition[1];

      setTimeout(function() {
        redRated4PlusSource
        .toArray()
        .tap(function(actual) {
          var expected = [{
            rating: 4,
            color: 'red'
          }, {
            rating: 4,
            color: 'red'
          }];

          expect(actual).to.eql(expected);
        })
        .concat(
          notRedOrRatedUnder4Source
          .toArray()
          .tap(function(actual) {
            var expected = [{
              rating: 4,
              color: 'green'
            }, {
              rating: 5,
              color: 'green'
            }, {
              rating: 4,
              color: 'yellow'
            }, {
              rating: 2,
              color: 'yellow'
            }, {
              rating: 3,
              color: 'red'
            }];
            expect(actual).to.eql(expected);
          })
        )
        .tap(null, done)
        .subscribeOnCompleted(done);
      }, slowDelay);
    });

  });

//  describe('thenable (Promise)', function() {
//    it('should work on success (Rx)', function(done) {
//      Rx.Observable.range(1, 3)
//      .then(function(result) {
//        expect(result).to.eql([1, 2, 3]);
//        done();
//      }, done);
//    });
//
//    it('should work on error (Rx)', function(done) {
//      var message = 'placeholder error';
//      Rx.Observable.range(1, 3)
//      .concat(Rx.Observable.throw(new Error(message)))
//      .then(function(result) {
//        done(new Error('expected onError to be called, not onNext'));
//      }, function(err) {
//        expect(err.message).to.eql(message);
//        done();
//      });
//    });
//  });
//
//  describe('convert Observable to node callback', function() {
//    it('should work on success', function(done) {
//      Rx.Observable.range(1, 3)
//      .toNodeCallback(function(err, result) {
//        expect(err).to.equal(null);
//        expect(result).to.equal(3);
//        done();
//      });
//    });
//
//    it('should work on error', function(done) {
//      var message = 'placeholder error';
//      Rx.Observable.range(1, 3)
//      .concat(Rx.Observable.throw(new Error(message)))
//      .toNodeCallback(function(err, result) {
//        expect(err.message).to.eql(message);
//        expect(result).to.equal(undefined);
//        done();
//      });
//    });
//  });

//  describe('splitOnChange', function() {
//
//    describe('multiple elements in source, no reversion', function() {
//
//      var expected = [
//        'abcd',
//        'efg',
//        'hi'
//      ];
//
//      describe('function as keySelector', function() {
//        var source = Rx.Observable.from([{
//          id: 2,
//          name: 'a'
//        }, {
//          id: 2,
//          name: 'b'
//        }, {
//          id: 2,
//          name: 'c'
//        }, {
//          id: 2,
//          name: 'd'
//        }, {
//          id: 3,
//          name: 'e'
//        }, {
//          id: 3,
//          name: 'f'
//        }, {
//          id: 3,
//          name: 'g'
//        }, {
//          id: 4,
//          name: 'h'
//        }, {
//          id: 4,
//          name: 'i'
//        }])
//        .shareReplay();
//
//        var keySelector = function(groupItem) {
//          return groupItem.id;
//        };
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(source, keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          source
//          .splitOnChange(keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//      });
//
//      describe('string as keySelector', function() {
//        var source = Rx.Observable.from([{
//          id: 2,
//          name: 'a'
//        }, {
//          id: 2,
//          name: 'b'
//        }, {
//          id: 2,
//          name: 'c'
//        }, {
//          id: 2,
//          name: 'd'
//        }, {
//          id: 3,
//          name: 'e'
//        }, {
//          id: 3,
//          name: 'f'
//        }, {
//          id: 3,
//          name: 'g'
//        }, {
//          id: 4,
//          name: 'h'
//        }, {
//          id: 4,
//          name: 'i'
//        }])
//        .shareReplay();
//
//        var keySelector = 'id';
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(source, keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          source
//          .splitOnChange(keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//      });
//
//      describe('no keySelector', function() {
//        var sourceForNoKeySelector = Rx.Observable.from([
//          'a',
//          'a',
//          'a',
//          'b',
//          'b',
//          'c',
//          'c',
//          'd'
//        ])
//        .shareReplay();
//
//        var expectedForNoKeySelector = [
//          'aaa',
//          'bb',
//          'cc',
//          'd',
//        ];
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(sourceForNoKeySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForNoKeySelector);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          sourceForNoKeySelector
//          .splitOnChange()
//          .map(function(groupItems) {
//            return groupItems
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForNoKeySelector);
//            done();
//          });
//        });
//      });
//    });
//
//    describe('multiple elements in source, with reversion', function() {
//
//      var sourceForFnAndString = Rx.Observable.from([{
//        id: 2,
//        name: 'a'
//      }, {
//        id: 2,
//        name: 'b'
//      }, {
//        id: 2,
//        name: 'c'
//      }, {
//        id: 2,
//        name: 'd'
//      }, {
//        id: 3,
//        name: 'e'
//      }, {
//        id: 3,
//        name: 'f'
//      }, {
//        id: 2,
//        name: 'c'
//      }, {
//        id: 2,
//        name: 'd'
//      }, {
//        id: 3,
//        name: 'g'
//      }, {
//        id: 4,
//        name: 'h'
//      }, {
//        id: 4,
//        name: 'i'
//      }])
//      .shareReplay();
//
//      var expectedForFnAndString = [
//        'abcd',
//        'ef',
//        'cd',
//        'g',
//        'hi'
//      ];
//
//      describe('function as keySelector', function() {
//
//        var keySelector = function(groupItem) {
//          return groupItem.id;
//        };
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(sourceForFnAndString, keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForFnAndString);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          sourceForFnAndString
//          .splitOnChange(keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForFnAndString);
//            done();
//          });
//        });
//      });
//
//      describe('string as keySelector', function() {
//        var keySelector = 'id';
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(sourceForFnAndString, keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForFnAndString);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          sourceForFnAndString
//          .splitOnChange(keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForFnAndString);
//            done();
//          });
//        });
//      });
//
//      describe('no keySelector', function() {
//        var sourceForNoKeySelector = Rx.Observable.from([
//          'a',
//          'a',
//          'a',
//          'b',
//          'a',
//          'b',
//          'c',
//          'c',
//          'd'
//        ])
//        .shareReplay();
//
//        var expectedForNoKeySelector = [
//          'aaa',
//          'b',
//          'a',
//          'b',
//          'cc',
//          'd',
//        ];
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(sourceForNoKeySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForNoKeySelector);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          sourceForNoKeySelector
//          .splitOnChange()
//          .map(function(groupItems) {
//            return groupItems
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expectedForNoKeySelector);
//            done();
//          });
//        });
//      });
//    });
//
//    describe('one element in source', function() {
//      var expected = [
//        'a',
//      ];
//
//      describe('function as keySelector', function() {
//        var source = Rx.Observable.from([{
//          id: 2,
//          name: 'a'
//        }])
//        .shareReplay();
//
//        var keySelector = function(groupItem) {
//          return groupItem.id;
//        };
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(source, keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          source
//          .splitOnChange(keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//      });
//
//      describe('no keySelector', function() {
//        var source = Rx.Observable.from([
//          'a',
//        ])
//        .shareReplay();
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(source)
//          .map(function(groupItems) {
//            return groupItems
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          source
//          .splitOnChange()
//          .map(function(groupItems) {
//            return groupItems
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//      });
//
//      describe('string as keySelector', function() {
//        var source = Rx.Observable.from([{
//          id: 2,
//          name: 'a'
//        }])
//        .shareReplay();
//
//        var keySelector = 'id';
//
//        it('should run as Rx.Observable.METHOD', function(done) {
//          Rx.Observable.splitOnChange(source, keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//        it('should run as Rx.Observable.prototype.METHOD', function(done) {
//          source
//          .splitOnChange(keySelector)
//          .map(function(groupItems) {
//            return groupItems
//            .map(function(groupItem) {
//              return groupItem.name;
//            })
//            .join('');
//          })
//          .toArray()
//          .subscribe(function(actual) {
//            expect(actual).to.eql(expected);
//            done();
//          });
//        });
//
//      });
//    });
//  });
//
//  it('should pipe Observable through a transformStream', function(done) {
//    RxFs.createReadObservable(__dirname + '/../../package.json', 'utf8')
//    .pipe(JSONStream.parse('name'))
//    .subscribe(function(actual) {
//      expect(actual).to.equal('rx-extra');
//    }, done, done);
//  });

//  it('should run Rx.Observable.prototype.streamThrough', function(done) {
//    RxFs.createReadObservable(__dirname + '/../../package.json', 'utf8')
//    .streamThrough(JSONStream.parse('name'))
//    .subscribe(function(actual) {
//      expect(actual).to.equal('rx-extra');
//    }, done, done);
//  });

//  it('should convert unpausable stream to Observable (one element)', function(done) {
//    var s = new stream.Readable({objectMode: true});
//    s._read = function noop() {};
//    s.pause = undefined;
//
//    var source = RxNode.fromUnpausableStream(s);
//    console.log('source');
//    console.log(source);
//    console.log('source.prototype');
//    console.log(source.prototype);
//
//    source
//    .subscribe(function(actual) {
//      expect(actual).to.eql(0);
//    }, done, done);
//
//    s.push(0);
//    s.push(null);
//  });

//  it('should convert unpausable stream to Observable', function(done) {
//    var s = new stream.Readable({objectMode: true});
//    s._read = function noop() {};
//    s.pause = undefined;
//
//    var source = RxNode.fromUnpausableStream(s);
//    console.log('source');
//    console.log(source);
//    console.log('source.prototype');
//    console.log(source.prototype);
//
//    source
//    .toArray()
//    .subscribe(function(actual) {
//      expect(actual).to.eql([0, 1, 2]);
//    }, done, done);
//
//    s.push(0);
//    s.push(1);
//    s.push(2);
//    s.push(null);
//  });
//
//  it('should convert unpausable stream to Observable and partitionNested', function(done) {
//    var s = new stream.Readable({objectMode: true});
//    s._read = function noop() {};
//    s.pause = undefined;
//
//    RxNode.fromUnpausableStream(s)
//    .partitionNested(function(x) {
//      return x % 2 === 0;
//    })[0]
//    .toArray()
//    .subscribe(function(actual) {
//      expect(actual).to.eql([0, 2]);
//    }, done, done);
//
//    s.push(0);
//    s.push(1);
//    s.push(2);
//    s.push(null);
//  });
//
//  it('should convert readable stream to Observable', function(done) {
//    var s = new stream.Readable({objectMode: true});
//    s._read = function noop() {};
//
//    RxNode.fromReadableStream(s)
//    .toArray()
//    .subscribe(function(actual) {
//      expect(actual).to.eql([0, 1, 2]);
//    }, done, done);
//
//    s.push(0);
//    s.push(1);
//    s.push(2);
//    s.push(null);
//  });

  it('should convert readable stream to Observable and partitionNested', function(done) {
    var s = new stream.Readable({objectMode: true});
    s._read = function noop() {};

    //var source1 = RxNode.fromUnpausableStream(s);
    var source1 = RxNode.partitionNested(
        function(value) {
          return value % 2 === 0;
        },
        [0, 1, 2, 3]
    );
    var source2 = Rx.Observable.partitionNested(
        function(value) {
          return value % 2 === 0;
        },
        [0, 1, 2, 3]
    );

    console.log('source1');
    console.log(source1);
    console.log('source2');
    console.log(source2);

    console.log('source1.prototype');
    console.log(source1.prototype);
    console.log('source2.prototype');
    console.log(source2.prototype);

    console.log('source1.partitionNested');
    console.log(source1.partitionNested);
    console.log('source2.partitionNested');
    console.log(source2.partitionNested);

    source2
//    .partitionNested(function(x) {
//      return x % 2 === 0;
//    })[0]
    .toArray()
    .subscribe(function(actual) {
      expect(actual).to.eql([0, 2]);
    }, done, done);

    s.push(0);
    s.push(1);
    s.push(2);
    s.push(null);
  });

//  it('should pan wrap', function(done) {
//    done(new Error('Have not added a test for ...panWrap'));
//  });

});
