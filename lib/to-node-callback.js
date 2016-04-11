module.exports = function toNodeCallback(source, cb) {
  // version adapted from Falcor example
  var val;
  var hasVal = false;
  source.subscribe(
      function(x) {
        hasVal = true;
        val = x;
      },
      function(e) {
        return cb(e);
      },
      function() {
        if (hasVal) {
          cb(null, val);
        }
      }
  );
};
