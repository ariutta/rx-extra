/**
 * Test public APIs
 */

var csv = require('csv-streamify');
var csvOptions = {delimiter: '\t'};
var expect = require('chai').expect;
var JSONStream = require('jsonstream');
var Rx = require('../../index.js');
var RxNode = Rx.RxNode;
var sinon = require('sinon');
var sologger = require('../sologger.js');
var stream = require('stream');

//process.env.NODE_ENV = 'development';

// Run tests
describe('Public API', function() {

  describe('hierarchicalPartition', function() {
    it('should work as Rx.Observable...', function(done) {
      var source = Rx.Observable.range(1, 20);

      var evenOddPartition = Rx.Observable.hierarchicalPartition(
          function(value) {
            return value % 2 === 0;
          },
          source
      );

      var evenSource = evenOddPartition[0];
      var oddSource = evenOddPartition[1];

      var isIsNotMultipleSixPartition = Rx.Observable.hierarchicalPartition(
          function(value) {
            return value % 3 === 0;
          },
          evenSource,
          oddSource
      );
      var multipleSixSource = isIsNotMultipleSixPartition[0];
      var notMultipleSixSource = isIsNotMultipleSixPartition[1];

      multipleSixSource
      .toArray()
      .doOnNext(function(actual) {
        var expected = [
          6,
          12,
          18
        ];
        expect(actual).to.eql(expected);
      })
      .concat(
        notMultipleSixSource
        .toArray()
        .doOnNext(function(actual) {
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
      .doOnError(done)
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
      .doOnNext(function(actual) {
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
        .doOnNext(function(actual) {
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
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    it('should work as prototype', function(done) {
      var evenOddPartition = Rx.Observable.range(1, 20)
      .hierarchicalPartition(function(value) {
        return value % 2 === 0;
      });

      var isIsNotMultipleSixPartition = Rx.Observable.hierarchicalPartition(
          function(value) {
            return value % 3 === 0;
          },
          evenOddPartition[0], // evenSource
          evenOddPartition[1] // oddSource
      );
      var multipleSixSource = isIsNotMultipleSixPartition[0];
      var notMultipleSixSource = isIsNotMultipleSixPartition[1];

      multipleSixSource
      .takeUntil(Rx.Observable.timer(5))
      .toArray()
      .doOnNext(function(actual) {
        var expected = [
          6,
          12,
          18
        ];
        expect(actual).to.eql(expected);
      })
      .concat(
        notMultipleSixSource
        .takeUntil(Rx.Observable.timer(5))
        .toArray()
        .doOnNext(function(actual) {
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
      .doOnError(done)
      .subscribeOnCompleted(done);

    });

  });

  describe('thenable (Promise)', function() {
    it('should work on success', function(done) {
      Rx.Observable.range(1, 3)
      .then(function(result) {
        expect(result).to.eql([1, 2, 3]);
        done();
      }, done);
    });

    it('should work on error', function(done) {
      var message = 'placeholder error';
      Rx.Observable.range(1, 3)
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
      Rx.Observable.range(1, 3)
      .toNodeCallback(function(err, result) {
        expect(err).to.equal(null);
        expect(result).to.equal(3);
        done();
      });
    });

    it('should work on error', function(done) {
      var message = 'placeholder error';
      Rx.Observable.range(1, 3)
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
        .shareReplay();

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
        .shareReplay();

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
        .shareReplay();

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
      .shareReplay();

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
        .shareReplay();

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
        .shareReplay();

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
        .shareReplay();

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
        .shareReplay();

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

  it('should run RxNode.fromReadableStream then streamThrough (json)', function(done) {
    //var s = new stream.Readable({objectMode: true});
    var s = new stream.Readable();
    s._read = function noop() {};

    var source = RxNode.fromReadableStream(s);

    source
    .streamThrough(JSONStream.parse('a'))
    .subscribe(function(actual) {
      expect(actual).to.eql(1);
    }, done, done);

    s.push('{"a": 1, "b": 2}');
    s.push(null);
  });

  it('should run RxNode.fromUnpausableStream then streamThrough (json)', function(done) {
    //var s = new stream.Readable({objectMode: true});
    var s = new stream.Readable();
    s._read = function noop() {};
    s.pause = undefined;

    var source = RxNode.fromUnpausableStream(s);

    source
    .streamThrough(JSONStream.parse('a'))
    .subscribe(function(actual) {
      expect(actual).to.eql(1);
    }, done, done);

    s.push('{"a": 1, "b": 2}');
    s.push(null);
  });

  it('should run RxNode.fromReadableStream then streamThrough (csv w/ objectMode)', function(done) {
    //var s = new stream.Readable({objectMode: true});
    var s = new stream.Readable();
    s._read = function noop() {};

    var source = RxNode.fromReadableStream(s);

    source
    .streamThrough(csv(csvOptions))
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

  it('should run RxNode.fromUnpausableStream then streamThrough (csv)', function(done) {
    //var s = new stream.Readable({objectMode: true});
    var s = new stream.Readable();
    s._read = function noop() {};

    var source = RxNode.fromUnpausableStream(s);

    source
    .streamThrough(csv(csvOptions))
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

  it('should convert unpausable stream to Observable (one element)', function(done) {
    var s = new stream.Readable({objectMode: true});
    s._read = function noop() {};
    s.pause = undefined;

    var source = RxNode.fromUnpausableStream(s);

    source
    .subscribe(function(actual) {
      expect(actual).to.eql(0);
    }, done, done);

    s.push(0);
    s.push(null);
  });

  it('should convert unpausable stream to Observable', function(done) {
    var s = new stream.Readable({objectMode: true});
    s._read = function noop() {};
    s.pause = undefined;

    var source = RxNode.fromUnpausableStream(s);

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

  it('should convert unpausable stream to Observable and hierarchicalPartition', function(done) {
    var s = new stream.Readable({objectMode: true});
    s._read = function noop() {};
    s.pause = undefined;

    RxNode.fromUnpausableStream(s)
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

    RxNode.fromReadableStream(s)
    .toArray()
    .subscribe(function(actual) {
      expect(actual).to.eql([0, 1, 2]);
    }, done, done);

    s.push(0);
    s.push(1);
    s.push(2);
    s.push(null);
  });

  it('should convert readable stream to Observable and hierarchicalPartition', function(done) {
    var s = new stream.Readable({objectMode: true});
    s._read = function noop() {};

    RxNode.fromUnpausableStream(s)
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

//  it('should pan wrap', function(done) {
//    done(new Error('Have not added a test for ...panWrap'));
//  });

});
