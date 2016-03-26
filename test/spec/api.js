/**
 * Test public APIs
 */

//var _ = require('lodash');
var expect = require('chai').expect;
var Rx = require('../../index.js');
//var RxNode = require('../../index.js');
var sinon = require('sinon');
var sologger = require('../sologger.js');

//process.env.NODE_ENV = 'development';

// Run tests
describe('Public API', function() {

  it('should convert unpausable stream to Observable', function(done) {
    done(new Error('add test for .fromUnpauseableStream'));
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

});
