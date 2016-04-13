var stream = require('stream');

module.exports = function(Rx) {
  var RxNode = Rx.RxNode;

  // now it can act as a Promise
  require('./then.js')(Rx);

  function createStream(method) {
    var outputStream = this instanceof stream.Stream ? this : process.stdout;
    var source = method.apply(this, arguments);
    var disposable = RxNode.writeToStream(source, outputStream, 'utf8');
    return outputStream;
  }

  function wrapMethod(originalMethod, isArray) {
    var lastArgumentIndex = arguments.length - 1;
    var lastArgument = arguments[lastArgumentIndex];
    var lastArgumentIsFunction = typeof lastArgument === 'function';
    if (!lastArgumentIsFunction) {
      return originalMethod.apply(this, arguments);
    } else {
      var argumentsSanFirst = [];
      for (var i = 0; i++; i < lastArgumentIndex) {
        argumentsSanFirst.push(arguments[i]);
      }

      var source = originalMethod.apply(this, argumentsSanFirst);
      if (isArray) {
        source = source.toArray();
      }
      return source
        .toNodeCallback(lastArgument);
    }
  }

  // TODO check whether this actually works. Haven't tested it yet.
  // TODO document it. It's unclear to me how to use it now. Also,
  // compare with universalRespond method in utils.js in gpml2pvjson.
  // also see main.js in gpml2pvjson
  /**
   * panWrap
   *
   * @param {Object} mod I don't know what this is. Is it a module?
   * @param {Function} mod[methodName] which can be createMETHOD_NAMEStream,
   *                   then, subscribe, ...?
   * @param {Object} methodDetails
   * @param {Object} methodDetails[methodName]
   * @param {Boolean} methodDetails[methodName].isArray
   * @return {undefined}
   */
  Rx.panWrap = function(mod, methodDetails) {
    // TODO make sure we should be using the method below, not Object.keys()
    var methodNamesToWrap = Object.getOwnPropertyNames(methodDetails);
    var streamsSupported = typeof RxNode !== 'undefined' && typeof stream !== 'undefined';
    methodNamesToWrap.forEach(function(methodName) {
      var originalMethod = mod[methodName];
      var isArray = methodDetails[methodName].isArray;
      mod[methodName] = wrapMethod(originalMethod, isArray);

      if (streamsSupported) {
        var characters = methodName.split('');
        var capitalizedMethodName = characters.shift().toUpperCase() + characters.join('');
        mod['create' + capitalizedMethodName + 'Stream'] = createStream(originalMethod);
      }

    });

    return mod;
  };

};
