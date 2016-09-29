/**
 * Test public APIs
 */

// TODO look at using marble tests:
// https://github.com/ReactiveX/rxjs/blob/master/doc/writing-marble-tests.md
// http://stackoverflow.com/questions/36979451/using-marble-testing-rxjs5-method-inside-another-project

var csv = require('csv-streamify');
var expect = require('chai').expect;
var JSONStream = require('jsonstream');
//var Rx = require('../../index.js');
//import * as Rx from '../../index.js';
var Rx = require('../../index.js');
var RxNode = Rx.RxNode;
var sinon = require('sinon');
var sologger = require('../sologger.js');
var stream = require('stream');

//process.env.NODE_ENV = 'development';

// Run tests
describe('Public API', function() {

  describe('hierarchicalPartition', function() {
    it('should work via non-chained call (Rx.Observable.hierarchicalPartition())', function(done) {
      var source = Rx.Observable.range(1, 20, Rx.Scheduler.asap);

      var [evenSource, oddSource] = Rx.Observable.hierarchicalPartition(
          function(value) {
            return value % 2 === 0;
          },
          source
      );

      var [multipleOfSixSource, notMultipleOfSixSource] = Rx.Observable.hierarchicalPartition(
          function(value) {
            return value % 3 === 0;
          },
          evenSource,
          oddSource
      );

      multipleOfSixSource
      .toArray()
      .do(function(actual) {
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
        .do(function(actual) {
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
        }),
        Rx.Scheduler.asap
      )
      .do(() => {}, done)
      .subscribe(null, null, done);
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

      var rated4PlusPartition = Rx.Observable.hierarchicalPartition(
          function(item) {
            return item.rating >= 4;
          },
          source
      );
      var rated4PlusSource = rated4PlusPartition[0];
      var ratedUnder4Source = rated4PlusPartition[1]
      .delay(fastDelay);

      var redRated4PlusPartition = Rx.Observable.hierarchicalPartition(
          function(item) {
            return item.color === 'red';
          },
          rated4PlusSource,
          ratedUnder4Source
      );

      var redRated4PlusSource = redRated4PlusPartition[0];
      var notRedOrRatedUnder4Source = redRated4PlusPartition[1];

      setTimeout(function() {
        rated4PlusPartition.replay();
      }, slowDelay);

      redRated4PlusSource
      .toArray()
      .do(function(actual) {
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
          .do(function(actual) {
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
          }),
          Rx.Scheduler.asap
      )
      .do(() => {}, done)
      .subscribe(null, null, done);
    });

    it('should work as prototype', function(done) {
      var [evenSource, oddSource] = Rx.Observable.range(1, 20, Rx.Scheduler.asap)
      .hierarchicalPartition(function(value) {
        return value % 2 === 0;
      });

      var [multipleOfSixSource, notMultipleOfSixSource] = Rx.Observable.hierarchicalPartition(
          function(value) {
            return value % 3 === 0;
          },
          evenSource,
          oddSource
      );

      multipleOfSixSource
      .takeUntil(Rx.Observable.timer(5, 5, Rx.Scheduler.asap))
      .toArray()
      .do(function(actual) {
        var expected = [
          6,
          12,
          18
        ];
        expect(actual).to.eql(expected);
      })
      .concat(
          notMultipleOfSixSource
          .takeUntil(Rx.Observable.timer(5, 5, Rx.Scheduler.asap))
          .toArray()
          .do(function(actual) {
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
          }),
          Rx.Scheduler.asap
      )
      .do(() => {}, done)
      .subscribe(null, null, done);

    });

  });

  describe('thenable (Promise)', function() {
    it('should work on success', function(done) {
      Rx.Observable.range(1, 3, Rx.Scheduler.asap)
      .then(function(result) {
        expect(result).to.eql([1, 2, 3]);
        done();
      }, done);
    });

    it('should work on error', function(done) {
      var message = 'placeholder error';
      Rx.Observable.range(1, 3, Rx.Scheduler.asap)
      .concat(Rx.Observable.throw(new Error(message)))
      .then(function(result) {
        done(new Error('expected onError to be called, not onNext'));
      }, function(err) {
        expect(err.message).to.eql(message);
        done();
      });
    });
  });

//  describe('convert Observable to node callback', function() {
//    it('should work on success', function(done) {
//      Rx.Observable.range(1, 3, Rx.Scheduler.asap)
//      .toNodeCallback(function(err, result) {
//        expect(err).to.equal(null);
//        expect(result).to.equal(3);
//        done();
//      });
//    });
//
//    it('should work on error', function(done) {
//      var message = 'placeholder error';
//      Rx.Observable.range(1, 3, Rx.Scheduler.asap)
//      .concat(Rx.Observable.throw(new Error(message)))
//      .toNodeCallback(function(err, result) {
//        expect(err.message).to.eql(message);
//        expect(result).to.equal(undefined);
//        done();
//      });
//    });
//  });

  describe('splitOnChange', function() {

    describe('multiple elements in source, no reversion', function() {

      var expected = [
        'abcd',
        'efg',
        'hi'
      ];

      describe('function as keySelector', function() {
        var source = Rx.Observable.from([{
          id: 2,
          name: 'a'
        }, {
          id: 2,
          name: 'b'
        }, {
          id: 2,
          name: 'c'
        }, {
          id: 2,
          name: 'd'
        }, {
          id: 3,
          name: 'e'
        }, {
          id: 3,
          name: 'f'
        }, {
          id: 3,
          name: 'g'
        }, {
          id: 4,
          name: 'h'
        }, {
          id: 4,
          name: 'i'
        }])
        .publishReplay().refCount();

        var keySelector = function(groupItem) {
          return groupItem.id;
        };

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(source, keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });
      });

      describe('string as keySelector', function() {
        var source = Rx.Observable.from([{
          id: 2,
          name: 'a'
        }, {
          id: 2,
          name: 'b'
        }, {
          id: 2,
          name: 'c'
        }, {
          id: 2,
          name: 'd'
        }, {
          id: 3,
          name: 'e'
        }, {
          id: 3,
          name: 'f'
        }, {
          id: 3,
          name: 'g'
        }, {
          id: 4,
          name: 'h'
        }, {
          id: 4,
          name: 'i'
        }])
        .publishReplay().refCount();

        var keySelector = 'id';

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(source, keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });
      });

      describe('no keySelector', function() {
        var sourceForNoKeySelector = Rx.Observable.from([
          'a',
          'a',
          'a',
          'b',
          'b',
          'c',
          'c',
          'd'
        ])
        .publishReplay().refCount();

        var expectedForNoKeySelector = [
          'aaa',
          'bb',
          'cc',
          'd',
        ];

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(sourceForNoKeySelector)
          .map(function(groupItems) {
            return groupItems
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForNoKeySelector);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          sourceForNoKeySelector
          .splitOnChange()
          .map(function(groupItems) {
            return groupItems
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForNoKeySelector);
            done();
          });
        });
      });
    });

    describe('multiple elements in source, with reversion', function() {

      var sourceForFnAndString = Rx.Observable.from([{
        id: 2,
        name: 'a'
      }, {
        id: 2,
        name: 'b'
      }, {
        id: 2,
        name: 'c'
      }, {
        id: 2,
        name: 'd'
      }, {
        id: 3,
        name: 'e'
      }, {
        id: 3,
        name: 'f'
      }, {
        id: 2,
        name: 'c'
      }, {
        id: 2,
        name: 'd'
      }, {
        id: 3,
        name: 'g'
      }, {
        id: 4,
        name: 'h'
      }, {
        id: 4,
        name: 'i'
      }])
        .publishReplay().refCount();

      var expectedForFnAndString = [
        'abcd',
        'ef',
        'cd',
        'g',
        'hi'
      ];

      describe('function as keySelector', function() {

        var keySelector = function(groupItem) {
          return groupItem.id;
        };

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(sourceForFnAndString, keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForFnAndString);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          sourceForFnAndString
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForFnAndString);
            done();
          });
        });
      });

      describe('string as keySelector', function() {
        var keySelector = 'id';

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(sourceForFnAndString, keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForFnAndString);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          sourceForFnAndString
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForFnAndString);
            done();
          });
        });
      });

      describe('no keySelector', function() {
        var sourceForNoKeySelector = Rx.Observable.from([
          'a',
          'a',
          'a',
          'b',
          'a',
          'b',
          'c',
          'c',
          'd'
        ])
        .publishReplay().refCount();

        var expectedForNoKeySelector = [
          'aaa',
          'b',
          'a',
          'b',
          'cc',
          'd',
        ];

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(sourceForNoKeySelector)
          .map(function(groupItems) {
            return groupItems
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForNoKeySelector);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          sourceForNoKeySelector
          .splitOnChange()
          .map(function(groupItems) {
            return groupItems
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForNoKeySelector);
            done();
          });
        });
      });
    });

    describe('one element in source', function() {
      var expected = [
        'a',
      ];

      describe('function as keySelector', function() {
        var source = Rx.Observable.from([{
          id: 2,
          name: 'a'
        }])
        .publishReplay().refCount();

        var keySelector = function(groupItem) {
          return groupItem.id;
        };

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(source, keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });
      });

      describe('no keySelector', function() {
        var source = Rx.Observable.from([
          'a',
        ])
        .publishReplay().refCount();

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(source)
          .map(function(groupItems) {
            return groupItems
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          source
          .splitOnChange()
          .map(function(groupItems) {
            return groupItems
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

      });

      describe('string as keySelector', function() {
        var source = Rx.Observable.from([{
          id: 2,
          name: 'a'
        }])
        .publishReplay().refCount();

        var keySelector = 'id';

        it('should run as Rx.Observable.METHOD', function(done) {
          Rx.Observable.splitOnChange(source, keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

        it('should run as Rx.Observable.prototype.METHOD', function(done) {
          source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
            .map(function(groupItem) {
              return groupItem.name;
            })
            .join('');
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
        });

      });
    });
  });

//  describe('Rx.Observable.fromReadableStream', function() {
//    it('should convert a pausable stream to Observable (json)', function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//
//      var source = Rx.Observable.fromReadableStream(s);
//
//      source
//      .streamThrough(JSONStream.parse('a'))
//      .subscribe(function(actual) {
//        expect(actual).to.eql(1);
//      }, done, done);
//
//      s.push('{"a": 1, "b": 2}');
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to an Observable that works with ',
//        'streamThrough (input: json object)'].join(''), function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      var source = Rx.Observable.fromReadableStream(s);
//
//      source
//      .streamThrough(JSONStream.parse('a'))
//      .subscribe(function(actual) {
//        expect(actual).to.eql(1);
//      }, done, done);
//
//      s.push('{"a": 1, "b": 2}');
//      s.push(null);
//    });
//
//    it(['should convert a pausable stream to an Observable ',
//        '(input: csv stream, objectMode: true)'].join(''), function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//
//      var source = Rx.Observable.fromReadableStream(s);
//
//      source
//      .streamThrough(csv({objectMode: true, delimiter: '\t'}))
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([
//          ['header1', 'header2', 'header3'],
//          ['a1', 'b1', 'c1'],
//          ['a2', 'b2', 'c2'],
//        ]);
//      }, done, done);
//
//      s.push('header1\theader2\theader3\n');
//      s.push('a1\tb1\tc1\n');
//      s.push('a2\tb2\tc2\n');
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to a Observable ',
//        '(input: csv stream)'].join(''), function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//
//      var source = Rx.Observable.fromReadableStream(s);
//
//      source
//      .streamThrough(csv({delimiter: '\t'}))
//      .map(function(buf) {
//        return JSON.parse(buf.toString());
//      })
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([
//          ['header1', 'header2', 'header3'],
//          ['a1', 'b1', 'c1'],
//          ['a2', 'b2', 'c2'],
//        ]);
//      }, done, done);
//
//      s.push('header1\theader2\theader3\n');
//      s.push('a1\tb1\tc1\n');
//      s.push('a2\tb2\tc2\n');
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to an Observable ',
//        '(input: single element [an integer], objectMode: true)'].join(''), function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      var source = Rx.Observable.fromReadableStream(s);
//
//      source
//      .subscribe(function(actual) {
//        expect(actual).to.eql(0);
//      }, done, done);
//
//      s.push(0);
//      s.push(null);
//    });
//
//    it('should convert an unpausable stream to an Observable',
//    function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      var source = Rx.Observable.fromReadableStream(s);
//
//      source
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 1, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to an Observable that ',
//        'works with hierarchicalPartition'].join(''), function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      Rx.Observable.fromReadableStream(s)
//      .hierarchicalPartition(function(x) {
//        return x % 2 === 0;
//      })[0]
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//    it('should convert readable stream to Observable', function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//
//      Rx.Observable.fromReadableStream(s)
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 1, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//    it(['should convert a pausable stream to an Observable that ',
//        'works with hierarchicalPartition'].join(''), function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//
//      Rx.Observable.fromReadableStream(s)
//      .hierarchicalPartition(function(x) {
//        return x % 2 === 0;
//      })[0]
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//  });
//
//  describe('RxNode.fromReadableStream', function() {
//    it('should convert a pausable stream to Observable (json)', function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//
//      var source = RxNode.fromReadableStream(s);
//
//      source
//      .streamThrough(JSONStream.parse('a'))
//      .subscribe(function(actual) {
//        expect(actual).to.eql(1);
//      }, done, done);
//
//      s.push('{"a": 1, "b": 2}');
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to an Observable that works with ',
//        'streamThrough (input: json object)'].join(''), function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      var source = RxNode.fromReadableStream(s);
//
//      source
//      .streamThrough(JSONStream.parse('a'))
//      .subscribe(function(actual) {
//        expect(actual).to.eql(1);
//      }, done, done);
//
//      s.push('{"a": 1, "b": 2}');
//      s.push(null);
//    });
//
//    it(['should convert a pausable stream to an Observable ',
//        '(input: csv stream, objectMode: true)'].join(''), function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//
//      var source = RxNode.fromReadableStream(s);
//
//      source
//      .streamThrough(csv({objectMode: true, delimiter: '\t'}))
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([
//          ['header1', 'header2', 'header3'],
//          ['a1', 'b1', 'c1'],
//          ['a2', 'b2', 'c2'],
//        ]);
//      }, done, done);
//
//      s.push('header1\theader2\theader3\n');
//      s.push('a1\tb1\tc1\n');
//      s.push('a2\tb2\tc2\n');
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to a Observable ',
//        '(input: csv stream)'].join(''), function(done) {
//      //var s = new stream.Readable({objectMode: true});
//      var s = new stream.Readable();
//      s._read = function noop() {};
//
//      var source = RxNode.fromReadableStream(s);
//
//      source
//      .streamThrough(csv({delimiter: '\t'}))
//      .map(function(buf) {
//        return JSON.parse(buf.toString());
//      })
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([
//          ['header1', 'header2', 'header3'],
//          ['a1', 'b1', 'c1'],
//          ['a2', 'b2', 'c2'],
//        ]);
//      }, done, done);
//
//      s.push('header1\theader2\theader3\n');
//      s.push('a1\tb1\tc1\n');
//      s.push('a2\tb2\tc2\n');
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to an Observable ',
//        '(input: single element [an integer], objectMode: true)'].join(''), function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      var source = RxNode.fromReadableStream(s);
//
//      source
//      .subscribe(function(actual) {
//        expect(actual).to.eql(0);
//      }, done, done);
//
//      s.push(0);
//      s.push(null);
//    });
//
//    it('should convert an unpausable stream to an Observable',
//    function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      var source = RxNode.fromReadableStream(s);
//
//      source
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 1, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//    it(['should convert an unpausable stream to an Observable that ',
//        'works with hierarchicalPartition'].join(''), function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//      s.pause = undefined;
//
//      RxNode.fromReadableStream(s)
//      .hierarchicalPartition(function(x) {
//        return x % 2 === 0;
//      })[0]
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//    it('should convert readable stream to Observable', function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//
//      RxNode.fromReadableStream(s)
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 1, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//    it(['should convert a pausable stream to an Observable that ',
//        'works with hierarchicalPartition'].join(''), function(done) {
//      var s = new stream.Readable({objectMode: true});
//      s._read = function noop() {};
//
//      RxNode.fromReadableStream(s)
//      .hierarchicalPartition(function(x) {
//        return x % 2 === 0;
//      })[0]
//      .toArray()
//      .subscribe(function(actual) {
//        expect(actual).to.eql([0, 2]);
//      }, done, done);
//
//      s.push(0);
//      s.push(1);
//      s.push(2);
//      s.push(null);
//    });
//
//  });

//  it('should pan wrap', function(done) {
//    done(new Error('Have not added a test for ...panWrap'));
//  });

});
