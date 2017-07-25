/**
 * Test public APIs
 */

// TODO look at using marble tests:
// https://github.com/ReactiveX/rxjs/blob/master/doc/writing-marble-tests.md
// http://stackoverflow.com/questions/36979451/
//    using-marble-testing-rxjs5-method-inside-another-project

let _ = require("lodash");
let csv = require("csv-streamify");
let expect = require("chai").expect;
let hl = require("highland");
let JSONStream = require("JSONStream");
let Rx = require("../../main.js");
let sinon = require("sinon");
let sologger = require("../sologger.js");
let stream = require("stream");
let ThrottledTransform = require("throttled-transform-stream").default;
let through = require("through");
let through2 = require("through2");
let transform = require("to-transform");

// Run tests
describe("Public API", function() {
  describe("partitionNested", function() {
    it("should work for kaavio example", function(done) {
      let vm = {};
      let typeMappingsEntityReferenceToEntity = (vm.typeMappingsEntityReferenceToEntity = {
        "biopax:Complex": "biopax:Complex",
        "gpml:GeneProduct": "gpml:GeneProduct",
        "biopax:SmallMoleculeReference": "gpml:Metabolite",
        "biopax:Pathway": "biopax:Pathway",
        "biopax:ProteinReference": "biopax:Protein",
        "biopax:RnaReference": "biopax:Rna",
        "gpml:Unknown": "gpml:Unknown"
      });

      let typeMappingsEntityToEntityReference = (vm.typeMappingsEntityToEntityReference = _.invert(
        typeMappingsEntityReferenceToEntity
      ));

      let editableElementTypes = _.keys(typeMappingsEntityToEntityReference);

      let editorTabsComponent = {
        vm: {
          pvjsElementPartition: Rx.Observable
            .from(
              [
                { type: "Metabolite" },
                {},
                { type: "Mitochondria" },
                { type: "GeneProduct" },
                { type: "Protein" }
              ],
              Rx.Scheduler.asap
            )
            .partitionNested(x => x.hasOwnProperty("type"))
        }
      };

      let childComponentPartition = editorTabsComponent.vm.pvjsElementPartition.partitionNested(
        function(pvjsElement) {
          let pvjsElementType = _.isArray(pvjsElement.type)
            ? pvjsElement.type
            : [pvjsElement.type];
          let result = !_.isEmpty(
            _.intersection(pvjsElementType, editableElementTypes)
          );
          return result;
        }
      );

      Rx.Observable.merge
        .apply(this, childComponentPartition)
        .subscribe(null, done, done);
    });

    it("should work one level deep", function(done) {
      let evenOddPartition = Rx.Observable
        .range(1, 20, Rx.Scheduler.asap)
        .partitionNested(function(value) {
          return value % 2 === 0;
        });

      let evenSource = evenOddPartition[0];
      let oddSource = evenOddPartition[1];

      evenSource
        .toArray()
        .do(function(actual) {
          let expected = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
          expect(actual).to.eql(expected);
        })
        .concat(
          oddSource.toArray().do(function(actual) {
            let expected = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
            expect(actual).to.eql(expected);
          }),
          Rx.Scheduler.asap
        )
        .subscribe(null, done, done);
    });

    it("should work two levels deep", function(done) {
      let multipleOfSixPartition = Rx.Observable
        .range(1, 20, Rx.Scheduler.asap)
        .partitionNested(function(value) {
          return value % 2 === 0;
        })
        .partitionNested(function(value) {
          return value % 3 === 0;
        });

      let isMultipleOfSixSource = multipleOfSixPartition[0];
      let notMultipleOfSixSource = multipleOfSixPartition[1];

      isMultipleOfSixSource
        .toArray()
        .do(function(actual) {
          let expected = [6, 12, 18];
          expect(actual).to.eql(expected);
        })
        .concat(
          notMultipleOfSixSource.toArray().do(function(actual) {
            let expected = [
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
        .subscribe(null, done, done);
    });

    it("should work three levels deep", function(done) {
      let multipleOfTwelvePartition = Rx.Observable
        .range(1, 20, Rx.Scheduler.asap)
        .partitionNested(function(value) {
          return value % 2 === 0;
        })
        .partitionNested(function(value) {
          return value % 3 === 0;
        })
        .partitionNested(function(value) {
          return value % 4 === 0;
        });

      let isMultipleOfTwelveSource = multipleOfTwelvePartition[0];
      let notMultipleOfTwelveSource = multipleOfTwelvePartition[1];

      isMultipleOfTwelveSource
        .toArray()
        .do(function(actual) {
          let expected = [12];
          expect(actual).to.eql(expected);
        })
        .concat(
          notMultipleOfTwelveSource.toArray().do(function(actual) {
            let expected = [
              1,
              2,
              3,
              4,
              5,
              6,
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
              18,
              19,
              20
            ];
            expect(actual).to.eql(expected);
          }),
          Rx.Scheduler.asap
        )
        .subscribe(null, done, done);
    });

    it(
      [
        "should work as Rx.Observable.prototype.partitionNested(), ",
        "pause, ",
        "partitioned.prototype.partitionNested()"
      ].join(""),
      function(done) {
        let partitioned = Rx.Observable
          .range(1, 20, Rx.Scheduler.asap)
          .partitionNested(x => x % 2 === 0);

        let evenSource = partitioned[0];
        let oddSource = partitioned[1];

        Rx.Observable
          .merge(
            evenSource.do(() => {}, done).toArray().do(evens => {
              expect(evens).to.eql(_.range(2, 21, 2));
            }),
            oddSource.do(() => {}, done).toArray().do(odds => {
              expect(odds).to.eql(_.range(1, 20, 2));
            })
          )
          .subscribe(null, done, done);

        after(function(done) {
          let multipleOrNotOfSixPartition = partitioned.partitionNested(
            x => x % 3 === 0
          );

          let multipleOfSixSource = multipleOrNotOfSixPartition[0];
          let notMultipleOfSixSource = multipleOrNotOfSixPartition[1];

          Rx.Observable
            .merge(
              multipleOfSixSource.toArray().do(multiplesOfSix => {
                expect(multiplesOfSix).to.eql(_.range(6, 20, 6));
              }),
              notMultipleOfSixSource.toArray().do(notMultiplesOfSix => {
                expect(notMultiplesOfSix).to.eql(
                  _.difference(_.range(1, 21), _.range(6, 20, 6))
                );
              })
            )
            .subscribe(null, done, done);
        });
      }
    );

    describe("mount()", function() {
      describe("even after parent has finished", function(done) {
        describe("last item passing predicates 1 and 2", function(done) {
          let source = Rx.Observable.from([
            {
              rating: 4,
              color: "green"
            },
            {
              rating: 4,
              color: "red"
            },
            {
              rating: 2,
              color: "yellow"
            },
            {
              rating: 3,
              color: "red"
            },
            {
              rating: 5,
              color: "green"
            },
            {
              rating: 4,
              color: "yellow"
            },
            {
              rating: 4,
              color: "red"
            }
          ]);

          let rated4PlusPartition = source.partitionNested(
            item => item.rating >= 4
          );

          after(function(done) {
            let redRated4PlusPartition = rated4PlusPartition.mount(
              item => item.color === "red"
            );

            let redRated4PlusSource = redRated4PlusPartition[0];
            let notRedOrRatedUnder4Source = redRated4PlusPartition[1];

            redRated4PlusSource
              .toArray()
              .do(actual =>
                expect(actual).to.eql([
                  {
                    rating: 4,
                    color: "red"
                  }
                ])
              )
              .concat(
                notRedOrRatedUnder4Source
                  .toArray()
                  .do(actual => expect(actual).to.eql([])),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });

          let rated4PlusSource = rated4PlusPartition[0];
          let ratedUnder4Source = rated4PlusPartition[1];

          it("should run through once", function(done) {
            rated4PlusSource
              .toArray()
              .do(function(actual) {
                expect(actual).to.eql([
                  {
                    rating: 4,
                    color: "green"
                  },
                  {
                    rating: 4,
                    color: "red"
                  },
                  {
                    rating: 5,
                    color: "green"
                  },
                  {
                    rating: 4,
                    color: "yellow"
                  },
                  {
                    rating: 4,
                    color: "red"
                  }
                ]);
              })
              .concat(
                ratedUnder4Source.toArray().do(function(actual) {
                  expect(actual).to.eql([
                    {
                      rating: 2,
                      color: "yellow"
                    },
                    {
                      rating: 3,
                      color: "red"
                    }
                  ]);
                }),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });
        });

        describe("last item passing predicate 1 only", function(done) {
          let source = Rx.Observable.from([
            {
              rating: 4,
              color: "green"
            },
            {
              rating: 4,
              color: "red"
            },
            {
              rating: 2,
              color: "yellow"
            },
            {
              rating: 3,
              color: "red"
            },
            {
              rating: 5,
              color: "green"
            },
            {
              rating: 4,
              color: "red"
            },
            {
              rating: 4,
              color: "yellow"
            }
          ]);

          let rated4PlusPartition = source.partitionNested(
            item => item.rating >= 4
          );

          after(function(done) {
            let redRated4PlusPartition = rated4PlusPartition.mount(
              item => item.color === "red"
            );

            let redRated4PlusSource = redRated4PlusPartition[0];
            let notRedOrRatedUnder4Source = redRated4PlusPartition[1];

            redRated4PlusSource
              .toArray()
              .do(actual => expect(actual).to.eql([]))
              .concat(
                notRedOrRatedUnder4Source.toArray().do(actual =>
                  expect(actual).to.eql([
                    {
                      rating: 4,
                      color: "yellow"
                    }
                  ])
                ),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });

          let rated4PlusSource = rated4PlusPartition[0];
          let ratedUnder4Source = rated4PlusPartition[1];

          it("should run through once", function(done) {
            rated4PlusSource
              .toArray()
              .do(function(actual) {
                expect(actual).to.eql([
                  {
                    rating: 4,
                    color: "green"
                  },
                  {
                    rating: 4,
                    color: "red"
                  },
                  {
                    rating: 5,
                    color: "green"
                  },
                  {
                    rating: 4,
                    color: "red"
                  },
                  {
                    rating: 4,
                    color: "yellow"
                  }
                ]);
              })
              .concat(
                ratedUnder4Source.toArray().do(function(actual) {
                  expect(actual).to.eql([
                    {
                      rating: 2,
                      color: "yellow"
                    },
                    {
                      rating: 3,
                      color: "red"
                    }
                  ]);
                }),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });
        });

        describe("last item passing predicate 2 only", function(done) {
          let source = Rx.Observable.from([
            {
              rating: 4,
              color: "green"
            },
            {
              rating: 4,
              color: "red"
            },
            {
              rating: 2,
              color: "yellow"
            },
            {
              rating: 5,
              color: "green"
            },
            {
              rating: 4,
              color: "red"
            },
            {
              rating: 4,
              color: "yellow"
            },
            {
              rating: 3,
              color: "red"
            }
          ]);

          let rated4PlusPartition = source.partitionNested(
            item => item.rating >= 4
          );

          after(function(done) {
            let redRated4PlusPartition = rated4PlusPartition.mount(
              item => item.color === "red"
            );

            let redRated4PlusSource = redRated4PlusPartition[0];
            let notRedOrRatedUnder4Source = redRated4PlusPartition[1];

            redRated4PlusSource
              .toArray()
              .do(actual => expect(actual).to.eql([]))
              .concat(
                notRedOrRatedUnder4Source.toArray().do(actual =>
                  expect(actual).to.eql([
                    {
                      rating: 3,
                      color: "red"
                    }
                  ])
                ),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });

          let rated4PlusSource = rated4PlusPartition[0];
          let ratedUnder4Source = rated4PlusPartition[1];

          it("should run through once", function(done) {
            rated4PlusSource
              .toArray()
              .do(function(actual) {
                expect(actual).to.eql([
                  {
                    rating: 4,
                    color: "green"
                  },
                  {
                    rating: 4,
                    color: "red"
                  },
                  {
                    rating: 5,
                    color: "green"
                  },
                  {
                    rating: 4,
                    color: "red"
                  },
                  {
                    rating: 4,
                    color: "yellow"
                  }
                ]);
              })
              .concat(
                ratedUnder4Source.toArray().do(function(actual) {
                  expect(actual).to.eql([
                    {
                      rating: 2,
                      color: "yellow"
                    },
                    {
                      rating: 3,
                      color: "red"
                    }
                  ]);
                }),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });
        });

        describe("pass all predicates & run partitionNested before & after mount", function(
          done
        ) {
          let source = Rx.Observable.from([
            {
              rating: 4,
              color: "green",
              available: true
            },
            {
              rating: 4,
              color: "red",
              available: false
            },
            {
              rating: 2,
              color: "yellow",
              available: true
            },
            {
              rating: 3,
              color: "red",
              available: true
            },
            {
              rating: 5,
              color: "green",
              available: true
            },
            {
              rating: 4,
              color: "yellow",
              available: false
            },
            {
              rating: 4,
              color: "red",
              available: true
            }
          ]);

          let rated4PlusPartition = source.partitionNested(
            item => item.rating >= 4
          );

          after(function(done) {
            let redRated4PlusAvailablePartition = rated4PlusPartition
              .mount(item => item.color === "red")
              .partitionNested(item => item.available);

            let redRated4PlusAvailableSource =
              redRated4PlusAvailablePartition[0];
            let notRedOrRatedUnder4AvailableSource =
              redRated4PlusAvailablePartition[1];

            redRated4PlusAvailableSource
              .toArray()
              .do(actual =>
                expect(actual).to.eql([
                  {
                    rating: 4,
                    color: "red",
                    available: true
                  }
                ])
              )
              .concat(
                notRedOrRatedUnder4AvailableSource
                  .toArray()
                  .do(actual => expect(actual).to.eql([])),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });

          let rated4PlusSource = rated4PlusPartition[0];
          let ratedUnder4Source = rated4PlusPartition[1];

          it("should run through once", function(done) {
            rated4PlusSource
              .toArray()
              .do(function(actual) {
                expect(actual).to.eql([
                  {
                    rating: 4,
                    color: "green",
                    available: true
                  },
                  {
                    rating: 4,
                    color: "red",
                    available: false
                  },
                  {
                    rating: 5,
                    color: "green",
                    available: true
                  },
                  {
                    rating: 4,
                    color: "yellow",
                    available: false
                  },
                  {
                    rating: 4,
                    color: "red",
                    available: true
                  }
                ]);
              })
              .concat(
                ratedUnder4Source.toArray().do(function(actual) {
                  expect(actual).to.eql([
                    {
                      rating: 2,
                      color: "yellow",
                      available: true
                    },
                    {
                      rating: 3,
                      color: "red",
                      available: true
                    }
                  ]);
                }),
                Rx.Scheduler.asap
              )
              .subscribe(null, done, done);
          });
        });
      });
    });
  });

  describe("thenable (Promise)", function() {
    it("should work on success", function(done) {
      Rx.Observable.range(1, 3, Rx.Scheduler.asap).then(function(result) {
        expect(result).to.eql([1, 2, 3]);
        done();
      }, done);
    });

    it("should work on error", function(done) {
      let message = "placeholder error";
      Rx.Observable
        .range(1, 3, Rx.Scheduler.asap)
        .concat(Rx.Observable.throw(new Error(message)))
        .then(
          function(result) {
            done(new Error("expected onError to be called, not onNext"));
          },
          function(err) {
            expect(err.message).to.eql(message);
            done();
          }
        );
    });
  });

  describe("convert Observable to node callback", function() {
    it("should work on success", function(done) {
      Rx.Observable
        .range(1, 3, Rx.Scheduler.asap)
        .toNodeCallback(function(err, result) {
          expect(err).to.equal(null);
          expect(result).to.equal(3);
          done();
        });
    });

    it("should work on error", function(done) {
      let message = "placeholder error";
      Rx.Observable
        .range(1, 3, Rx.Scheduler.asap)
        .concat(Rx.Observable.throw(new Error(message)))
        .toNodeCallback(function(err, result) {
          expect(err.message).to.eql(message);
          expect(result).to.equal(undefined);
          done();
        });
    });
  });

  describe("splitOnChange", function() {
    describe("multiple elements in source, no reversion", function() {
      let expected = ["abcd", "efg", "hi"];

      it("should work w/ function as keySelector", function(done) {
        let source = Rx.Observable
          .from([
            {
              id: 2,
              name: "a"
            },
            {
              id: 2,
              name: "b"
            },
            {
              id: 2,
              name: "c"
            },
            {
              id: 2,
              name: "d"
            },
            {
              id: 3,
              name: "e"
            },
            {
              id: 3,
              name: "f"
            },
            {
              id: 3,
              name: "g"
            },
            {
              id: 4,
              name: "h"
            },
            {
              id: 4,
              name: "i"
            }
          ])
          .publishReplay()
          .refCount();

        let keySelector = function(groupItem) {
          return groupItem.id;
        };

        source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
              .map(function(groupItem) {
                return groupItem.name;
              })
              .join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
      });

      it("should work w/ string as keySelector", function(done) {
        let source = Rx.Observable
          .from([
            {
              id: 2,
              name: "a"
            },
            {
              id: 2,
              name: "b"
            },
            {
              id: 2,
              name: "c"
            },
            {
              id: 2,
              name: "d"
            },
            {
              id: 3,
              name: "e"
            },
            {
              id: 3,
              name: "f"
            },
            {
              id: 3,
              name: "g"
            },
            {
              id: 4,
              name: "h"
            },
            {
              id: 4,
              name: "i"
            }
          ])
          .publishReplay()
          .refCount();

        let keySelector = "id";

        source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
              .map(function(groupItem) {
                return groupItem.name;
              })
              .join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
      });

      it("should work w/ no keySelector", function(done) {
        let sourceForNoKeySelector = Rx.Observable
          .from(["a", "a", "a", "b", "b", "c", "c", "d"])
          .publishReplay()
          .refCount();

        let expectedForNoKeySelector = ["aaa", "bb", "cc", "d"];

        sourceForNoKeySelector
          .splitOnChange()
          .map(function(groupItems) {
            return groupItems.join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForNoKeySelector);
            done();
          });
      });
    });

    describe("multiple elements in source, with reversion", function() {
      let sourceForFnAndString = Rx.Observable
        .from([
          {
            id: 2,
            name: "a"
          },
          {
            id: 2,
            name: "b"
          },
          {
            id: 2,
            name: "c"
          },
          {
            id: 2,
            name: "d"
          },
          {
            id: 3,
            name: "e"
          },
          {
            id: 3,
            name: "f"
          },
          {
            id: 2,
            name: "c"
          },
          {
            id: 2,
            name: "d"
          },
          {
            id: 3,
            name: "g"
          },
          {
            id: 4,
            name: "h"
          },
          {
            id: 4,
            name: "i"
          }
        ])
        .publishReplay()
        .refCount();

      let expectedForFnAndString = ["abcd", "ef", "cd", "g", "hi"];

      it("should work w/ function as keySelector", function(done) {
        let keySelector = function(groupItem) {
          return groupItem.id;
        };

        sourceForFnAndString
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
              .map(function(groupItem) {
                return groupItem.name;
              })
              .join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForFnAndString);
            done();
          });
      });

      it("should work w/ string as keySelector", function(done) {
        let keySelector = "id";
        sourceForFnAndString
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
              .map(function(groupItem) {
                return groupItem.name;
              })
              .join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForFnAndString);
            done();
          });
      });

      it("should work w/ no keySelector", function(done) {
        let sourceForNoKeySelector = Rx.Observable
          .from(["a", "a", "a", "b", "a", "b", "c", "c", "d"])
          .publishReplay()
          .refCount();

        let expectedForNoKeySelector = ["aaa", "b", "a", "b", "cc", "d"];

        sourceForNoKeySelector
          .splitOnChange()
          .map(function(groupItems) {
            return groupItems.join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expectedForNoKeySelector);
            done();
          });
      });
    });

    describe("one element in source", function() {
      let expected = ["a"];

      it("should work w/ function as keySelector", function(done) {
        let source = Rx.Observable
          .from([
            {
              id: 2,
              name: "a"
            }
          ])
          .publishReplay()
          .refCount();

        let keySelector = function(groupItem) {
          return groupItem.id;
        };

        source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
              .map(function(groupItem) {
                return groupItem.name;
              })
              .join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
      });

      it("should work w/ no keySelector", function(done) {
        let source = Rx.Observable.from(["a"]).publishReplay().refCount();

        source
          .splitOnChange()
          .map(function(groupItems) {
            return groupItems.join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
      });

      it("should work w/ string as keySelector", function(done) {
        let source = Rx.Observable
          .from([
            {
              id: 2,
              name: "a"
            }
          ])
          .publishReplay()
          .refCount();

        let keySelector = "id";

        source
          .splitOnChange(keySelector)
          .map(function(groupItems) {
            return groupItems
              .map(function(groupItem) {
                return groupItem.name;
              })
              .join("");
          })
          .toArray()
          .subscribe(function(actual) {
            expect(actual).to.eql(expected);
            done();
          });
      });
    });
  });

  describe("Rx.Observable.fromNodeReadableStream", function() {
    let run = function(input, objectMode, pauseable) {
      let msg = `should convert an unpausable stream to an Observable
        (input item count: ${input.length},
         input item type: ${typeof input[0]},
         objectMode: ${objectMode}),
         pauseable: ${pauseable})`;

      it(msg, function(done) {
        let s = new stream.Readable({ objectMode: objectMode });
        s._read = function noop() {};
        s.pause = pauseable ? s.pause : undefined;

        Rx.Observable
          .fromNodeReadableStream(s)
          .map(x => (objectMode ? x : x.toString()))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(input);
            },
            done,
            done
          );

        input.forEach(function(x) {
          s.push(x);
        });
        s.push(null);
      });
    };

    let inputs = [
      [1],
      [1, 2, 3],
      [1, 2],
      [true],
      [true, true, false],
      [false, true],
      [true],
      [true, true, false],
      [false, true],
      ["asvd"],
      ["anksfjnbsv", "nvien2i4", "nu35gq98"],
      ["njsvs", "nvqiuw4ng2"],
      ['{"a": 1, "b": 2}'],
      ['{"a": 1, "b": 2}', '{"a": 1, "b": 2}'],
      [
        '{"a": 1, "b": 2}',
        '{"c": 3, "b": 2}',
        '{"y": "why", "b": 2}',
        '{"d": true, "b": 2}'
      ],
      [{ a: 1, b: 2 }],
      [{ a: 1, b: 2 }, { a: 1, b: 2 }],
      [{ a: 1, b: 2 }, { c: 3, b: 2 }, { y: "why", b: 2 }, { d: true, b: 2 }]
    ];
    let objectModes = [true, false];
    let pauseables = [true, false];

    inputs.forEach(function(input) {
      objectModes
        .filter(function(objectMode) {
          // Node stream expects only buffers or strings when not in object mode
          return objectMode || typeof input !== "object";
        })
        .forEach(function(objectMode) {
          pauseables.forEach(function(pauseable) {
            run(input, objectMode, pauseable);
          });
        });
    });
  });

  describe("Rx.Observable.prototype.throughNodeStream", function() {
    it("should convert a pausable stream to Observable (JSON)", function(done) {
      let s = new stream.Readable();
      s._read = function noop() {};

      let source = Rx.Observable.fromNodeReadableStream(s);

      source.throughNodeStream(JSONStream.parse("a")).subscribe(
        function(actual) {
          expect(actual).to.eql(1);
        },
        done,
        done
      );

      s.push('{"a": 1, "b": 2}');
      s.push(null);
    });

    it("should transform Observable (single JSON string, single result)", function(
      done
    ) {
      Rx.Observable
        .of('{"a": 1, "b": 2}')
        .throughNodeStream(JSONStream.parse("a"))
        .subscribe(
          function(actual) {
            expect(actual).to.eql(1);
          },
          done,
          done
        );
    });

    it("should transform Observable (stringified JSON chunks, multiple results)", function(
      done
    ) {
      Rx.Observable
        .from(['[{"a": 1},', '{"a": 2},{"a":', "3},", '{"a": 4}]'])
        .throughNodeStream(JSONStream.parse("..a"))
        .toArray()
        .subscribe(
          function(actual) {
            expect(actual).to.eql([1, 2, 3, 4]);
          },
          done,
          done
        );
    });

    it(
      [
        "should convert an unpausable stream to an Observable that works with ",
        "throughNodeStream (input: JSON object)"
      ].join(""),
      function(done) {
        //let s = new stream.Readable({objectMode: true});
        let s = new stream.Readable();
        s._read = function noop() {};
        s.pause = undefined;

        let source = Rx.Observable.fromNodeReadableStream(s);

        source.throughNodeStream(JSONStream.parse("a")).subscribe(
          function(actual) {
            expect(actual).to.eql(1);
          },
          done,
          done
        );

        s.push('{"a": 1, "b": 2}');
        s.push(null);
      }
    );

    it(
      [
        "should convert a pausable stream to an Observable ",
        "(input: csv stream, objectMode: true)"
      ].join(""),
      function(done) {
        //let s = new stream.Readable({objectMode: true});
        let s = new stream.Readable();
        s._read = function noop() {};

        let source = Rx.Observable.fromNodeReadableStream(s);

        source
          .throughNodeStream(csv({ objectMode: true, delimiter: "\t" }))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql([
                ["header1", "header2", "header3"],
                ["a1", "b1", "c1"],
                ["a2", "b2", "c2"]
              ]);
            },
            done,
            done
          );

        s.push("header1\theader2\theader3\n");
        s.push("a1\tb1\tc1\n");
        s.push("a2\tb2\tc2\n");
        s.push(null);
      }
    );

    it(
      [
        "should convert an unpausable stream to an Observable ",
        "(input: csv stream)"
      ].join(""),
      function(done) {
        //let s = new stream.Readable({objectMode: true});
        let s = new stream.Readable();
        s._read = function noop() {};

        let source = Rx.Observable.fromNodeReadableStream(s);

        source
          .throughNodeStream(csv({ delimiter: "\t" }))
          .map(function(buf) {
            return JSON.parse(buf.toString());
          })
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql([
                ["header1", "header2", "header3"],
                ["a1", "b1", "c1"],
                ["a2", "b2", "c2"]
              ]);
            },
            done,
            done
          );

        s.push("header1\theader2\theader3\n");
        s.push("a1\tb1\tc1\n");
        s.push("a2\tb2\tc2\n");
        s.push(null);
      }
    );

    it(
      [
        "should convert an unpausable stream to an Observable ",
        "(input: single element [an integer], objectMode: true)"
      ].join(""),
      function(done) {
        let s = new stream.Readable({ objectMode: true });
        s._read = function noop() {};
        s.pause = undefined;

        let source = Rx.Observable.fromNodeReadableStream(s);

        source.subscribe(
          function(actual) {
            expect(actual).to.eql(0);
          },
          done,
          done
        );

        s.push(0);
        s.push(null);
      }
    );

    it("should convert an unpausable stream to an Observable", function(done) {
      let s = new stream.Readable({ objectMode: true });
      s._read = function noop() {};
      s.pause = undefined;

      let source = Rx.Observable.fromNodeReadableStream(s);

      source.toArray().subscribe(
        function(actual) {
          expect(actual).to.eql([0, 1, 2]);
        },
        done,
        done
      );

      s.push(0);
      s.push(1);
      s.push(2);
      s.push(null);
    });

    it(
      [
        "should convert an unpausable stream to an Observable that ",
        "works with partitionNested"
      ].join(""),
      function(done) {
        let s = new stream.Readable({ objectMode: true });
        s._read = function noop() {};
        s.pause = undefined;

        Rx.Observable
          .fromNodeReadableStream(s)
          .partitionNested(x => x % 2 === 0)[0]
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql([0, 2]);
            },
            done,
            done
          );

        s.push(0);
        s.push(1);
        s.push(2);
        s.push(null);
      }
    );

    it("should convert readable stream to Observable", function(done) {
      let s = new stream.Readable({ objectMode: true });
      s._read = function noop() {};

      Rx.Observable.fromNodeReadableStream(s).toArray().subscribe(
        function(actual) {
          expect(actual).to.eql([0, 1, 2]);
        },
        done,
        done
      );

      s.push(0);
      s.push(1);
      s.push(2);
      s.push(null);
    });

    it(
      [
        "should convert a pausable stream to an Observable that ",
        "works with partitionNested"
      ].join(""),
      function(done) {
        let s = new stream.Readable({ objectMode: true });
        s._read = function noop() {};

        Rx.Observable
          .fromNodeReadableStream(s)
          .partitionNested(x => x % 2 === 0)[0]
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql([0, 2]);
            },
            done,
            done
          );

        s.push(0);
        s.push(1);
        s.push(2);
        s.push(null);
      }
    );

    it('should run Observable through slow "ThrottledTransform" transform stream', function(
      done
    ) {
      let input = _.range(20);
      const SlowTransformStream = ThrottledTransform.create(
        (data, encoding, done) => {
          setTimeout(function() {
            done(null, data);
          }, 100);
        }
      );

      let source = Rx.Observable
        .from(input)
        .map(x => x.toString())
        .throughNodeStream(new SlowTransformStream())
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(
          function(actual) {
            expect(actual).to.eql(input);
          },
          done,
          done
        );
    });

    it('should run Observable through slow "to-transform" transform stream', function(
      done
    ) {
      let input = _.range(20);
      let TransformStream = transform((x, done) => {
        setTimeout(function() {
          let output = String(parseInt(x) + 1);
          done(null, output);
        }, 50);
      });

      let source = Rx.Observable
        .from(input)
        .map(x => x.toString())
        .throughNodeStream(new TransformStream())
        .map(x => parseInt(x.toString()))
        .toArray()
        .subscribe(
          function(actual) {
            expect(actual).to.eql(input.map(x => x + 1));
          },
          done,
          done
        );
    });

    describe("pass Observable through highland transform stream", function() {
      let input = _.range(20);
      let expected = input.reduce(function(acc, x) {
        acc = acc.concat(_.fill(Array(x), x));
        return acc;
      }, []);
      let maxDelay = 20;

      it("should work when stream is fast", function(done) {
        let source = Rx.Observable.from(input);

        let transformStream = hl.pipeline(function(s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === "undefined" || x === null) {
              // pass nil (end event) along the stream
              push(null, x);
            } else {
              for (let i = 0; i < x; i++) {
                push(null, x);
              }
              next();
            }
          });
        });

        source.throughNodeStream(transformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });

      it("should work when stream is variably slow to complete", function(
        done
      ) {
        let source = Rx.Observable.from(input);

        let transformStream = hl.pipeline(function(s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === "undefined" || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, 21);
            } else {
              for (let i = 0; i < x; i++) {
                push(null, x);
              }
              setTimeout(function() {
                next();
              }, maxDelay / x);
            }
          });
        });

        source.throughNodeStream(transformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });

      it("should work when stream is consistently slow to complete", function(
        done
      ) {
        let transformStream = hl.pipeline(function(s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === "undefined" || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, maxDelay);
            } else {
              for (let i = 0; i < x; i++) {
                push(null, x);
              }
              setTimeout(function() {
                next();
              }, maxDelay);
            }
          });
        });

        let source = Rx.Observable
          .from(input)
          .throughNodeStream(transformStream)
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });

      it("should work when stream is variably slow to produce", function(done) {
        let transformStream = hl.pipeline(function(s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === "undefined" || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, maxDelay);
            } else {
              setTimeout(function() {
                for (let i = 0; i < x; i++) {
                  push(null, x);
                }
                next();
              }, maxDelay);
            }
          });
        });

        let source = Rx.Observable
          .from(input)
          .throughNodeStream(transformStream)
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });

      it("should work when stream is consistently slow to produce", function(
        done
      ) {
        let transformStream = hl.pipeline(function(s) {
          return s.consume(function(err, x, push, next) {
            if (err) {
              // pass errors along the stream and consume next value
              push(err);
              next();
            } else if (x === hl.nil || typeof x === "undefined" || x === null) {
              // pass nil (end event) along the stream
              setTimeout(function() {
                push(null, x);
              }, maxDelay);
            } else {
              setTimeout(function() {
                for (let i = 0; i < x; i++) {
                  push(null, x);
                }
                next();
              }, maxDelay / x);
            }
          });
        });

        Rx.Observable
          .from(input)
          .throughNodeStream(transformStream)
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });
    });

    describe('pass Observable through a "through" transform stream', function() {
      let input = _.range(20);
      let expected = input.reduce(function(acc, x) {
        acc = acc.concat(_.fill(Array(x), x + 1));
        return acc;
      }, []);
      let maxDelay = 20;

      it("should work when stream is fast (end not defined/use default)", function(
        done
      ) {
        // NOTE: "through" uses "push" as an alias for "queue"
        // NOTE: when "end" function is not defined,
        //   "through" default is "function () { this.queue(null) }"
        let transformStream = through(function write(x) {
          let that = this;
          for (let i = 0; i < x; i++) {
            that.queue(String(parseInt(x) + 1));
          }
        });

        let source = Rx.Observable
          .from(input)
          .map(x => x.toString())
          .throughNodeStream(transformStream)
          .map(x => parseInt(x.toString()))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });

      it("should work when stream is variably slow to produce", function(done) {
        let transformStream = through(
          function write(x) {
            this.pause();
            setTimeout(
              function() {
                for (let i = 0; i < x; i++) {
                  this.queue(String(parseInt(x) + 1));
                }
                this.resume();
              }.bind(this),
              x / maxDelay
            );
          },
          function() {
            setTimeout(
              function() {
                this.queue(null);
              }.bind(this),
              maxDelay
            );
          }
        );

        let source = Rx.Observable
          .from(input)
          .map(x => x.toString())
          .throughNodeStream(transformStream)
          .map(x => parseInt(x.toString()))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });

      it("should work when stream is consistently slow to produce", function(
        done
      ) {
        let transformStream = through(
          function write(x) {
            this.pause();
            setTimeout(
              function() {
                for (let i = 0; i < x; i++) {
                  this.queue(String(parseInt(x) + 1));
                }
                this.resume();
              }.bind(this),
              maxDelay
            );
          },
          function() {
            setTimeout(
              function() {
                this.queue(null);
              }.bind(this),
              maxDelay
            );
          }
        );

        let source = Rx.Observable
          .from(input)
          .map(x => x.toString())
          .throughNodeStream(transformStream)
          .map(x => parseInt(x.toString()))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });

      it("should work when stream is variably slow to complete", function(
        done
      ) {
        let transformStream = through(
          function write(x) {
            this.pause();
            for (let i = 0; i < x; i++) {
              this.queue(String(parseInt(x) + 1));
            }
            setTimeout(
              function() {
                this.resume();
              }.bind(this),
              x / maxDelay
            );
          },
          function() {
            setTimeout(
              function() {
                this.queue(null);
              }.bind(this),
              maxDelay
            );
          }
        );

        let source = Rx.Observable
          .from(input)
          .map(x => x.toString())
          .throughNodeStream(transformStream)
          .map(x => parseInt(x.toString()))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });

      it("should work when stream is slow to complete", function(done) {
        let transformStream = through(
          function write(x) {
            this.pause();
            for (let i = 0; i < x; i++) {
              this.queue(String(parseInt(x) + 1));
            }
            setTimeout(
              function() {
                this.resume();
              }.bind(this),
              maxDelay
            );
          },
          function() {
            setTimeout(
              function() {
                this.queue(null);
              }.bind(this),
              maxDelay
            );
          }
        );

        let source = Rx.Observable
          .from(input)
          .map(x => x.toString())
          .throughNodeStream(transformStream)
          .map(x => parseInt(x.toString()))
          .toArray()
          .subscribe(
            function(actual) {
              expect(actual).to.eql(expected);
            },
            done,
            done
          );
      });
    });

    describe("pass Observable through through2 transform stream", function() {
      // NOTE: through2 uses a default highWaterMark of 16,
      // so the input is 20 to be greater than 16.
      let input = _.range(20);
      let expected = input.reduce(function(acc, x) {
        acc = acc.concat(_.fill(Array(x), x));
        return acc;
      }, []);
      let maxDelay = 20;

      it("should work when stream is fast", function(done) {
        let source = Rx.Observable.from(input);

        let slowTransformStream = through2.obj(function(x, enc, callback) {
          let that = this;
          for (let i = 0; i < x; i++) {
            that.push(x);
          }
          callback();
        });

        source.throughNodeStream(slowTransformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });

      it("should work when stream is variably slow to complete", function(
        done
      ) {
        let source = Rx.Observable.from(input);

        let slowTransformStream = through2.obj(function(x, enc, callback) {
          let that = this;
          for (let i = 0; i < x; i++) {
            that.push(x);
          }
          setTimeout(function() {
            callback();
          }, maxDelay / x);
        });

        source.throughNodeStream(slowTransformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });

      it("should when stream is consistently slow to complete", function(done) {
        let source = Rx.Observable.from(input);

        let slowTransformStream = through2.obj(function(x, enc, callback) {
          let that = this;
          for (let i = 0; i < x; i++) {
            that.push(x);
          }
          setTimeout(function() {
            callback();
          }, maxDelay);
        });

        source.throughNodeStream(slowTransformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });

      it("should when stream is variably slow to produce", function(done) {
        let source = Rx.Observable.from(input);

        let slowTransformStream = through2.obj(function(x, enc, callback) {
          let that = this;
          setTimeout(function() {
            for (let i = 0; i < x; i++) {
              that.push(x);
            }
            callback();
          }, maxDelay / x);
        });

        source.throughNodeStream(slowTransformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });

      it("should when stream is consistently slow to produce", function(done) {
        let source = Rx.Observable.from(input);

        let slowTransformStream = through2.obj(function(x, enc, callback) {
          let that = this;
          setTimeout(function() {
            for (let i = 0; i < x; i++) {
              that.push(x);
            }
            callback();
          }, maxDelay);
        });

        source.throughNodeStream(slowTransformStream).toArray().subscribe(
          function(actual) {
            expect(actual).to.eql(expected);
          },
          done,
          done
        );
      });
    });
  });

  it("should work with Subject", function(done) {
    var subject = new Rx.Subject();

    const input = 1;

    subject.subscribe(
      function(actual) {
        expect(actual).to.eql(input);
      },
      done,
      done
    );

    subject.next(input);
    subject.complete();
  });

  //  it('should pan wrap', function(done) {
  //    done(new Error('Have not added a test for ...panWrap'));
  //  });
});
