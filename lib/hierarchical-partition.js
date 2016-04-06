//function(Rx) {
//
//  function hierarchicalPartition(inputSource, partitioner, parentResetSource) {
//    var latestValue;
//    var replaySource = new Rx.Subject();
//
//    var mainAndResetSource = Rx.Observable.merge(
//        inputSource
//          .map(function(value) {
//            latestValue = value;
//            return value;
//          }),
//        replaySource
//    )
//    .partition(partitioner);
//
//    var mainSource = mainAndResetSource[0];
//    var thisResetSource = mainAndResetSource[1];
//    var resetSource;
//    if (parentResetSource) {
//      resetSource = parentResetSource.merge(thisResetSource);
//    } else {
//      resetSource = thisResetSource;
//    }
//    return {
//      mainSource: mainSource,
//      resetSource: resetSource,
//      replay: function() {
//        replaySource.onNext(latestValue);
//      }
//    };
//  }
//
//  Rx.Observable.hierarchicalPartition = hierarchicalPartition;
//
//  Rx.Observable.prototype.hierarchicalPartition = function(
//      partitioner, parentResetSource) {
//    var source = this;
//    return source
//      .let(function(o) {
//        return hierarchicalPartition(o, partitioner, parentResetSource);
//      });
//  };
//}

module.exports = function(Rx) {

  function hierarchicalPartition(partitioner, inputSource, parentRestSource) {
    var latestValue;
    var replaySource = new Rx.Subject();

    var inputAndReplaySource = Rx.Observable.merge(
        inputSource
        .doOnNext(function(value) {
          latestValue = value;
        })
        .doOnError(function(err) {
          replaySource.onError(err);
        })
        .doOnCompleted(function(value) {
          replaySource.onCompleted();
        }),
        replaySource
    )
    .partition(partitioner);

    var mainSource = inputAndReplaySource[0];
    var thisRestSource = inputAndReplaySource[1];
    var restSource;
    if (parentRestSource) {
      restSource = Rx.Observable.merge(parentRestSource, thisRestSource);
    } else {
      restSource = thisRestSource;
    }

    var result = [mainSource, restSource];

    // allows a new subscriber to "prime the pump" with
    // the most recent value, even if that value happened
    // before the subscriber started.
    result.replay = function() {
      replaySource.onNext(latestValue);
    };

    return result;
  }

  Rx.Observable.hierarchicalPartition = hierarchicalPartition;

  Rx.Observable.prototype.hierarchicalPartition = function(
      partitioner, parentRestSource) {
    var source = this;
    return source
      .let(function(o) {
        return hierarchicalPartition(partitioner, o, parentRestSource);
      });
  };

};
