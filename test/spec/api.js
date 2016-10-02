/**
 * Test public APIs
 */

// TODO look at using marble tests:
// https://github.com/ReactiveX/rxjs/blob/master/doc/writing-marble-tests.md
// http://stackoverflow.com/questions/36979451/
//    using-marble-testing-rxjs5-method-inside-another-project

var _ = require('lodash');
var csv = require('csv-streamify');
var expect = require('chai').expect;
var hl = require('highland');
var JSONStream = require('jsonstream');
var Rx = require('../../index.js');
var RxNode = Rx.RxNode;
var sinon = require('sinon');
var sologger = require('../sologger.js');
var stream = require('stream');
var ThrottledTransform = require('throttled-transform-stream').default;
var through = require('through');
var through2 = require('through2');
var transform = require('to-transform');
 
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

  describe('convert Observable to node callback', function() {
    it('should work on success', function(done) {
      Rx.Observable.range(1, 3, Rx.Scheduler.asap)
      .toNodeCallback(function(err, result) {
        expect(err).to.equal(null);
        expect(result).to.equal(3);
        done();
      });
    });

    it('should work on error', function(done) {
      var message = 'placeholder error';
      Rx.Observable.range(1, 3, Rx.Scheduler.asap)
      .concat(Rx.Observable.throw(new Error(message)))
      .toNodeCallback(function(err, result) {
        expect(err.message).to.eql(message);
        expect(result).to.equal(undefined);
        done();
      });
    });
  });

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

  describe('Rx.Observable.fromNodeReadableStream', function() {
    let run = function(input, objectMode, pauseable) {
      let msg = `should convert an unpausable stream to an Observable
        (input item count: ${input.length},
         input item type: ${typeof input[0]},
         objectMode: ${objectMode}),
         pauseable: ${pauseable})`;
    
      it(msg, function(done) {
        var s = new stream.Readable({objectMode: objectMode});
        s._read = function noop() {};
        s.pause = pauseable ? s.pause : undefined;

        Rx.Observable.fromNodeReadableStream(s)
        .map(x => objectMode ? x : x.toString())
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(input);
        }, done, done);

        input.forEach(function(x) {
          s.push(x);
        });
        s.push(null);
      });
    };

    var inputs = [
      [1],
      [1, 2, 3],
      [1, 2],
      [true],
      [true, true, false],
      [false, true],
      [true],
      [true, true, false],
      [false, true],
      ['asvd'],
      ['anksfjnbsv', 'nvien2i4', 'nu35gq98'],
      ['njsvs', 'nvqiuw4ng2'],
      ['{"a": 1, "b": 2}'],
      ['{"a": 1, "b": 2}', '{"a": 1, "b": 2}'],
      ['{"a": 1, "b": 2}', '{"c": 3, "b": 2}', '{"y": "why", "b": 2}', '{"d": true, "b": 2}'],
      [{'a': 1, 'b': 2}],
      [{'a': 1, 'b': 2}, {'a': 1, 'b': 2}],
      [{'a': 1, 'b': 2}, {'c': 3, 'b': 2}, {'y': 'why', 'b': 2}, {'d': true, 'b': 2}],
    ];
    var objectModes = [true, false];
    var pauseables = [true, false];

    inputs.forEach(function(input) {
      objectModes
      .filter(function(objectMode) {
        // Node stream expects only buffers or strings when not in object mode 
        return objectMode || typeof input !== 'object';
      })
      .forEach(function(objectMode) {
        pauseables.forEach(function(pauseable) {
          run(input, objectMode, pauseable);
        });
      });
    });

  });

  describe('Rx.Observable.prototype.throughNodeStream', function() {
    it('should convert a pausable stream to Observable (json)', function(done) {
      var s = new stream.Readable();
      s._read = function noop() {};

      var source = Rx.Observable.fromNodeReadableStream(s);

      source
      .throughNodeStream(JSONStream.parse('a'))
      .subscribe(function(actual) {
        expect(actual).to.eql(1);
      }, done, done);

      s.push('{"a": 1, "b": 2}');
      s.push(null);
    });

    it(['should convert an unpausable stream to an Observable that works with ',
        'throughNodeStream (input: json object)'].join(''), function(done) {
      //var s = new stream.Readable({objectMode: true});
      var s = new stream.Readable();
      s._read = function noop() {};
      s.pause = undefined;

      var source = Rx.Observable.fromNodeReadableStream(s);

      source
      .throughNodeStream(JSONStream.parse('a'))
      .subscribe(function(actual) {
        expect(actual).to.eql(1);
      }, done, done);

      s.push('{"a": 1, "b": 2}');
      s.push(null);
    });

    it(['should convert a pausable stream to an Observable ',
        '(input: csv stream, objectMode: true)'].join(''), function(done) {
      //var s = new stream.Readable({objectMode: true});
      var s = new stream.Readable();
      s._read = function noop() {};

      var source = Rx.Observable.fromNodeReadableStream(s);

      source
      .throughNodeStream(csv({objectMode: true, delimiter: '\t'}))
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql([
          ['header1', 'header2', 'header3'],
          ['a1', 'b1', 'c1'],
          ['a2', 'b2', 'c2'],
        ]);
      }, done, done);

      s.push('header1\theader2\theader3\n');
      s.push('a1\tb1\tc1\n');
      s.push('a2\tb2\tc2\n');
      s.push(null);
    });

    it(['should convert an unpausable stream to an Observable ',
        '(input: csv stream)'].join(''), function(done) {
      //var s = new stream.Readable({objectMode: true});
      var s = new stream.Readable();
      s._read = function noop() {};

      var source = Rx.Observable.fromNodeReadableStream(s);

      source
      .throughNodeStream(csv({delimiter: '\t'}))
      .map(function(buf) {
        return JSON.parse(buf.toString());
      })
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql([
          ['header1', 'header2', 'header3'],
          ['a1', 'b1', 'c1'],
          ['a2', 'b2', 'c2'],
        ]);
      }, done, done);

      s.push('header1\theader2\theader3\n');
      s.push('a1\tb1\tc1\n');
      s.push('a2\tb2\tc2\n');
      s.push(null);
    });

    it(['should convert an unpausable stream to an Observable ',
        '(input: single element [an integer], objectMode: true)'].join(''), function(done) {
      var s = new stream.Readable({objectMode: true});
      s._read = function noop() {};
      s.pause = undefined;

      var source = Rx.Observable.fromNodeReadableStream(s);

      source
      .subscribe(function(actual) {
        expect(actual).to.eql(0);
      }, done, done);

      s.push(0);
      s.push(null);
    });

    it('should convert an unpausable stream to an Observable',
    function(done) {
      var s = new stream.Readable({objectMode: true});
      s._read = function noop() {};
      s.pause = undefined;

      var source = Rx.Observable.fromNodeReadableStream(s);

      source
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql([0, 1, 2]);
      }, done, done);

      s.push(0);
      s.push(1);
      s.push(2);
      s.push(null);
    });

    it(['should convert an unpausable stream to an Observable that ',
        'works with hierarchicalPartition'].join(''), function(done) {
      var s = new stream.Readable({objectMode: true});
      s._read = function noop() {};
      s.pause = undefined;

      Rx.Observable.fromNodeReadableStream(s)
      .hierarchicalPartition(function(x) {
        return x % 2 === 0;
      })[0]
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql([0, 2]);
      }, done, done);

      s.push(0);
      s.push(1);
      s.push(2);
      s.push(null);
    });

    it('should convert readable stream to Observable', function(done) {
      var s = new stream.Readable({objectMode: true});
      s._read = function noop() {};

      Rx.Observable.fromNodeReadableStream(s)
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql([0, 1, 2]);
      }, done, done);

      s.push(0);
      s.push(1);
      s.push(2);
      s.push(null);
    });

    it(['should convert a pausable stream to an Observable that ',
        'works with hierarchicalPartition'].join(''), function(done) {
      var s = new stream.Readable({objectMode: true});
      s._read = function noop() {};

      Rx.Observable.fromNodeReadableStream(s)
      .hierarchicalPartition(function(x) {
        return x % 2 === 0;
      })[0]
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql([0, 2]);
      }, done, done);

      s.push(0);
      s.push(1);
      s.push(2);
      s.push(null);
    });

    it('should run Observable through slow "ThrottledTransform" transform stream', function(done) {
      let input = _.range(20)
      const SlowTransformStream = ThrottledTransform.create((data, encoding, done) => {
        setTimeout(function() {
          done(null, data);
        }, 100);
      });

      var source = Rx.Observable.from(input)
      .map(x => x.toString())
      .throughNodeStream(new SlowTransformStream())
      .map(x => parseInt(x.toString()))
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql(input);
      }, done, done);
    });

    it('should run Observable through slow "to-transform" transform stream', function(done) {
      let input = _.range(20);
      var TransformStream = transform((x, done) => {
        setTimeout(function() {
          let output = String(parseInt(x) + 1);
          done(null, output);
        }, 50);
      });

      var source = Rx.Observable.from(input)
      .map(x => x.toString())
      .throughNodeStream(new TransformStream())
      .map(x => parseInt(x.toString()))
      .toArray()
      .subscribe(function(actual) {
        expect(actual).to.eql(input.map(x => x + 1));
      }, done, done);
    });

    describe('pass Observable through highland transform stream', function() {
      let input = _.range(20);
      let expected = input.reduce(function(acc, x) {
        acc = acc.concat(_.fill(Array(x), x));
        return acc;
      }, []);
      let maxDelay = 20;

      it('should work when stream is fast', function(done) {
        var source = Rx.Observable.from(input);

        var transformStream = hl.pipeline(function (s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === 'undefined' || x === null) {
              // pass nil (end event) along the stream
              push(null, x);
            } else {
              for (var i=0; i<x; i++) {
                push(null, x);
              }
              next();
            }
          });
        });

        source
        .throughNodeStream(transformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is variably slow to complete', function(done) {
        var source = Rx.Observable.from(input);

        var transformStream = hl.pipeline(function (s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === 'undefined' || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, 21);
            } else {
              for (var i=0; i<x; i++) {
                push(null, x);
              }
              setTimeout(function() {
                next();
              }, maxDelay / x);
            }
          });
        });

        source
        .throughNodeStream(transformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is consistently slow to complete', function(done) {
        var transformStream = hl.pipeline(function (s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === 'undefined' || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, maxDelay);
            } else {
              for (var i=0; i<x; i++) {
                push(null, x);
              }
              setTimeout(function() {
                next();
              }, maxDelay);
            }
          });
        });

        var source = Rx.Observable.from(input)
        .throughNodeStream(transformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is variably slow to produce', function(done) {
        var transformStream = hl.pipeline(function (s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === 'undefined' || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, maxDelay);
            } else {
              setTimeout(function() {
                for (var i=0; i<x; i++) {
                  push(null, x);
                }
                next();
              }, maxDelay);
            }
          });
        });

        var source = Rx.Observable.from(input)
        .throughNodeStream(transformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is consistently slow to produce', function(done) {
        var transformStream = hl.pipeline(function (s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === 'undefined' || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, maxDelay);
            } else {
              setTimeout(function() {
                for (var i=0; i<x; i++) {
                  push(null, x);
                }
                next();
              }, maxDelay / x);
            }
          });
        });

        Rx.Observable.from(input)
        .throughNodeStream(transformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

    });

    describe('pass Observable through a "through" transform stream', function() {
      let input = _.range(20);
      let expected = input.reduce(function(acc, x) {
        acc = acc.concat(_.fill(Array(x), x + 1));
        return acc;
      }, []);
      let maxDelay = 20;

      it('should work when stream is fast (end not defined/use default)', function(done) {
        // NOTE: "through" uses "push" as an alias for "queue"
        // NOTE: when "end" function is not defined,
        //   "through" default is "function () { this.queue(null) }"
        var transformStream = through(function write(x) {
          var that = this;
          for (var i=0; i<x; i++) {
            that.queue(String(parseInt(x) + 1));
          }
        });

        var source = Rx.Observable.from(input)
        .map(x => x.toString())
        .throughNodeStream(transformStream)
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is variably slow to produce', function(done) {
        var transformStream = through(function write(x) {
          this.pause();
          setTimeout(function() {
            for (var i=0; i<x; i++) {
              this.queue(String(parseInt(x) + 1));
            }
            this.resume();
          }.bind(this), x / maxDelay);
        }, function() {
          setTimeout(function() {
            this.queue(null);
          }.bind(this), maxDelay);
        });

        var source = Rx.Observable.from(input)
        .map(x => x.toString())
        .throughNodeStream(transformStream)
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is consistently slow to produce', function(done) {
        var transformStream = through(function write(x) {
          this.pause();
          setTimeout(function() {
            for (var i=0; i<x; i++) {
              this.queue(String(parseInt(x) + 1));
            }
            this.resume();
          }.bind(this), maxDelay);
        }, function() {
          setTimeout(function() {
            this.queue(null);
          }.bind(this), maxDelay);
        });

        var source = Rx.Observable.from(input)
        .map(x => x.toString())
        .throughNodeStream(transformStream)
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is variably slow to complete', function(done) {
        var transformStream = through(function write(x) {
          this.pause();
          for (var i=0; i<x; i++) {
            this.queue(String(parseInt(x) + 1));
          }
          setTimeout(function() {
            this.resume();
          }.bind(this),  x / maxDelay);
        }, function() {
          setTimeout(function() {
            this.queue(null);
          }.bind(this), maxDelay);
        });

        var source = Rx.Observable.from(input)
        .map(x => x.toString())
        .throughNodeStream(transformStream)
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is slow to complete', function(done) {
        var transformStream = through(function write(x) {
          this.pause();
          for (var i=0; i<x; i++) {
            this.queue(String(parseInt(x) + 1));
          }
          setTimeout(function() {
            this.resume();
          }.bind(this), maxDelay);
        }, function() {
          setTimeout(function() {
            this.queue(null);
          }.bind(this), maxDelay);
        });

        var source = Rx.Observable.from(input)
        .map(x => x.toString())
        .throughNodeStream(transformStream)
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

    });

    describe('pass Observable through through2 transform stream', function() {
      // NOTE: through2 uses a default highWaterMark of 16,
      // so the input is 20 to be greater than 16.
      let input = _.range(20);
      let expected = input.reduce(function(acc, x) {
        acc = acc.concat(_.fill(Array(x), x));
        return acc;
      }, []);
      let maxDelay = 20;

      it('should work when stream is fast', function(done) {
        var source = Rx.Observable.from(input);

        var slowTransformStream = through2.obj(function(x, enc, callback) {
          var that = this;
          for (var i=0; i<x; i++) {
            that.push(x);
          }
          callback();
        });

        source
        .throughNodeStream(slowTransformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should work when stream is variably slow to complete', function(done) {
        var source = Rx.Observable.from(input);

        var slowTransformStream = through2.obj(function(x, enc, callback) {
          var that = this;
          for (var i=0; i<x; i++) {
            that.push(x);
          }
          setTimeout(function() {
            callback();
          }, maxDelay / x);
        });

        source
        .throughNodeStream(slowTransformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should when stream is consistently slow to complete', function(done) {
        var source = Rx.Observable.from(input);

        var slowTransformStream = through2.obj(function(x, enc, callback) {
          var that = this;
          for (var i=0; i<x; i++) {
            that.push(x);
          }
          setTimeout(function() {
            callback();
          }, maxDelay);
        });

        source
        .throughNodeStream(slowTransformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should when stream is variably slow to produce', function(done) {
        var source = Rx.Observable.from(input);

        var slowTransformStream = through2.obj(function(x, enc, callback) {
          var that = this;
          setTimeout(function() {
            for (var i=0; i<x; i++) {
              that.push(x);
            }
            callback();
          }, maxDelay / x);
        });

        source
        .throughNodeStream(slowTransformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

      it('should when stream is consistently slow to produce', function(done) {
        var source = Rx.Observable.from(input);

        var slowTransformStream = through2.obj(function(x, enc, callback) {
          var that = this;
          setTimeout(function() {
            for (var i=0; i<x; i++) {
              that.push(x);
            }
            callback();
          }, maxDelay);
        });

        source
        .throughNodeStream(slowTransformStream)
        .toArray()
        .subscribe(function(actual) {
          expect(actual).to.eql(expected);
        }, done, done);
      });

    });

  });

//  it('should pan wrap', function(done) {
//    done(new Error('Have not added a test for ...panWrap'));
//  });

});
