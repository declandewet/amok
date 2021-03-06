var http = require('http');
var util = require('util');
var child = require('child_process');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var chokidar = require('chokidar');
var rdbg = require('rdbg');

function serve(options, callback) {
  var server = http.createServer(function(request, response) {
    if (request.url == '/') {
      response.setHeader('content-type', 'text/html');
      response.write('<!doctype html><head><meta charset="utf-8"></head><body>');

      for (var key in options.scripts) {
        response.write('<script src="' + key + '"></script>');
      }

      response.end('</body>');
    } else {
      var filename = options.scripts[path.basename(request.url)];
      if (!filename) {
        var filename = path.join(options.cwd, request.url);
      }

      fs.exists(filename, function(exists) {
        if (exists) {
          response.setHeader('content-type', mime.lookup(filename));
          response.writeHead(200);

          var file = fs.createReadStream(filename);
          file.pipe(response);
        } else {
          response.writeHead(404);
          response.end('404');
        }
      });
    }
  });

  server.listen(options.port, options.host, callback);
  return server;
}

function bundle(options, callback) {
  var cmd = util.format('%s %s', options.bundler, options.args.join(' '));
  return child.exec(cmd, callback);
}

function watch(options, callback) {
  var watcher = chokidar.watch(options.cwd, {
    ignored: /[\/\\]\./, persistent: true
  });

  if (callback) {
    watcher.once('ready', callback);
  }

  return watcher;
}

function debug(options, callback) {
  var bugger = rdbg.connect(options.debuggerPort, options.debuggerHost, function(targets) {
    bugger.on('detatch', function() {
      var id = setInterval(function() {
        bugger.targets(function(targets) {
          if (targets == undefined) {
            targets = [];
          }

          var target = targets.filter(function(target) {
            return target.url.indexOf(options.host) > -1;
          })[0];

          if (target && target.webSocketDebuggerUrl) {
            bugger.attach(target);
          }
        });
      }, 500);

      bugger.once('attach', function() {
        clearInterval(id);
      });
    });

    var id = setInterval(function() {
      var target = targets.filter(function(target) {
        return target.url.indexOf(options.host) > -1 && target.webSocketDebuggerUrl;
      })[0];

      if (target) {
        bugger.attach(target, callback);
        clearInterval(id);
      }
    }, 250);
  });

  return bugger;
}

function browse(options, callback) {
  var cmd = util.format('%s http://%s:%d', options.browser, options.host, options.port);
  return child.exec(cmd, callback);
}

module.exports.serve = serve;
module.exports.watch = watch;
module.exports.bundle = bundle;
module.exports.debug = debug;
module.exports.browse = browse;
