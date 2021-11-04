const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const counter = require('./counter');

const chainCallbacks = (...callbacks) => {
  const chain = (i, ...args) => {
    if (i === callbacks.length - 1) {
      callbacks[i](null, ...args);
      return;
    }
    callbacks[i](...args, (...extraArgs) => (err, ...args) => {
      if (err) {
        callbacks[callbacks.length - 1](err);
      } else {
        chain(i + 1, ...extraArgs, ...args);
      }
    });
  };
  chain(0);
};

const fileFor = (id) => path.join(exports.dataDir, id + '.txt');

var items = {};

// Config+Initialization code -- DO NOT MODIFY /////////////////////////////////

exports.dataDir = path.join(__dirname, 'data');

exports.initialize = () => {
  if (!fs.existsSync(exports.dataDir)) {
    fs.mkdirSync(exports.dataDir);
  }
};

// Public API - Fix these CRUD functions ///////////////////////////////////////

exports.create = (text, callback) => {
  chainCallbacks(
    cb => counter.getNextUniqueId(cb()),
    (id, cb) => fs.writeFile(fileFor(id), text, cb({id, text})),
    callback
  );
};

exports.readAll = (callback) => {
  fs.readdir(exports.dataDir, (err, files) => {
    if (err) {
      callback(err);
      return;
    }
    var todos = [];
    const readRecur = (i) => {
      if (i === files.length) {
        callback(null, todos);
      } else {
        exports.readOne(files[i].slice(0, -4), (err, todo) => {
          if (err) {
            callback(err);
            return;
          }
          todos.push(todo);
          readRecur(i + 1);
        });
      }
    };
    readRecur(0);
  });
};

exports.readOne = (id, callback) => {
  fs.readFile(fileFor(id), (err, text) => callback(err, {id, text: text && text.toString()}));
};

exports.update = (id, text, callback) => {
  chainCallbacks(
    cb => fs.open(fileFor(id), 'r+', cb()),
    (fd, cb) => fs.ftruncate(fd, cb(fd)),
    (fd, cb) => fs.writeFile(fd, text, cb({ id, text })),
    callback
  );
};

exports.delete = (id, callback) => {
  fs.unlink(fileFor(id), callback);
};
