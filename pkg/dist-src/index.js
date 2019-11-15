"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.of = exports.PropertiesFile = void 0;

var _fs = _interopRequireDefault(require("fs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * properties
 *
 * Copyright (c) 2013 Matt Steele
 * Licensed under the MIT license.
 */
class PropertiesFile {
  //For tracking if a file is corrupt with duplicate keys - records the line numbers
  //For tracking if a file is corrupt with duplicate values - records the line numbers
  constructor(...args) {
    this.objs = {};
    this.duplicateKeys = {};
    this.duplicateValues = {};
    this.lookupDuplicateKeys = false;
    this.lookupDuplicateValues = false;

    if (args.length) {
      this.of.apply(this, args);
    }
  }

  enableLookupDuplicateKeys() {
    this.lookupDuplicateKeys = true;
    return this;
  }

  enableLookupDuplicateValues() {
    this.lookupDuplicateValues = true;
    return this;
  }

  parseValue(value) {
    try {
      const escapedValue = value.replace(/\\"/g, '"') // fix any escaped double quotes
      .replace(/\\'/g, '\'') // fix any escaped single quotes
      .replace(/"/g, '\\"') // escape "
      .replace(/\\:/g, ':') // remove \ before :
      .replace(/\\=/g, '=') // remove \ before =
      .replace(/\t/g, "\\t") // tab > \t
      .replace(/\n/g, "\\n"); // new line > \n

      return unescape(JSON.parse('"' + escapedValue + '"'));
    } catch (_unused) {
      return value.replace(/\\"/g, '"') // fix any escaped double quotes
      .replace(/\\'/g, '\'') // fix any escaped single quotes
      .replace(/\\:/g, ':') // remove \ before :
      .replace(/\\=/g, '='); // remove \ before =
    }
  }

  makeKeys(line) {
    if (line && line.indexOf('#') !== 0) {
      //let splitIndex = line.indexOf('=');
      let separatorPositions = ['=', ':'].map(sep => {
        return line.indexOf(sep);
      }).filter(index => {
        return index > -1;
      });
      let splitIndex = Math.min(...separatorPositions);
      let key = line.substring(0, splitIndex).trim();
      let value = line.substring(splitIndex + 1).trim();
      let parsedValue = this.parseValue(value); // if keys already exists ...

      if (this.objs.hasOwnProperty(key)) {
        // if it is already an Array
        if (Array.isArray(this.objs[key])) {
          // just push the new value
          this.objs[key].push(parsedValue);
        } else {
          // transform the value into Array
          let oldValue = this.objs[key];
          this.objs[key] = [oldValue, parsedValue];
        }
      } else {
        // the key does not exists
        this.objs[key] = parsedValue;
      }

      return [key, parsedValue];
    }

    return null;
  }

  addFile(file) {
    this.duplicateKeys[file] = {};
    this.duplicateValues[file] = {};

    let data = _fs.default.readFileSync(file, 'utf-8');

    let items = data.split(/\r?\n/);
    let me = this;
    let fileKeys = {};
    let fileValues = {};

    for (let i = 0; i < items.length; i++) {
      let line = items[i];

      while (line.substring(line.length - 1) === '\\') {
        line = line.slice(0, -1);
        let nextLine = items[i + 1];
        line = line + nextLine.trim();
        i++;
      }

      const keyValue = me.makeKeys(line); //Track duplicate keys in this file

      if (this.lookupDuplicateKeys && keyValue && fileKeys[keyValue[0]]) {
        if (!this.duplicateKeys[file][keyValue[0]]) {
          this.duplicateKeys[file][keyValue[0]] = [fileKeys[keyValue[0]]]; //Add the first key's line number too
        }

        this.duplicateKeys[file][keyValue[0]].push(i + 1);
      } else if (this.lookupDuplicateKeys && keyValue) {
        fileKeys[keyValue[0]] = i + 1;
      } //Track duplicate values in this file


      if (this.lookupDuplicateValues && keyValue && fileValues[keyValue[1]]) {
        if (!this.duplicateValues[file][keyValue[1]]) {
          this.duplicateValues[file][keyValue[1]] = [fileValues[keyValue[1]]]; //Add the first key's line number too
        }

        this.duplicateValues[file][keyValue[1]].push(i + 1);
      } else if (this.lookupDuplicateValues && keyValue) {
        fileValues[keyValue[1]] = i + 1;
      }
    }
  }

  of(...args) {
    for (let i = 0; i < args.length; i++) {
      this.addFile(args[i]);
    }

    return this;
  }

  get(key, defaultValue) {
    if (this.objs.hasOwnProperty(key)) {
      if (Array.isArray(this.objs[key])) {
        let ret = [];

        for (let i = 0; i < this.objs[key].length; i++) {
          ret[i] = this.interpolate(this.objs[key][i]);
        }

        return ret;
      } else {
        return typeof this.objs[key] === 'undefined' ? '' : this.interpolate(this.objs[key]);
      }
    }

    return defaultValue;
  }

  getLast(key, defaultValue) {
    if (this.objs.hasOwnProperty(key)) {
      if (Array.isArray(this.objs[key])) {
        var lg = this.objs[key].length;
        return this.interpolate(this.objs[key][lg - 1]);
      } else {
        return typeof this.objs[key] === 'undefined' ? '' : this.interpolate(this.objs[key]);
      }
    }

    return defaultValue;
  }

  getFirst(key, defaultValue) {
    if (this.objs.hasOwnProperty(key)) {
      if (Array.isArray(this.objs[key])) {
        return this.interpolate(this.objs[key][0]);
      } else {
        return typeof this.objs[key] === 'undefined' ? '' : this.interpolate(this.objs[key]);
      }
    }

    return defaultValue;
  }

  getInt(key, defaultIntValue) {
    let val = this.getLast(key);

    if (!val) {
      return defaultIntValue;
    } else {
      return parseInt(val, 10);
    }
  }

  getFloat(key, defaultFloatValue) {
    let val = this.getLast(key);

    if (!val) {
      return defaultFloatValue;
    } else {
      return parseFloat(val);
    }
  }

  getBoolean(key, defaultBooleanValue) {
    function parseBool(b) {
      return !/^(false|0)$/i.test(b) && !!b;
    }

    let val = this.getLast(key);

    if (!val) {
      return defaultBooleanValue || false;
    } else {
      return parseBool(val);
    }
  }

  set(key, value) {
    this.objs[key] = value;
  }

  interpolate(s) {
    let me = this;
    return s.replace(/\\\\/g, '\\').replace(/\$\{([A-Za-z0-9\.\-\_]*)\}/g, function (match) {
      return me.getLast(match.substring(2, match.length - 1));
    });
  }

  getKeys() {
    let keys = [];

    for (let key in this.objs) {
      keys.push(key);
    }

    return keys;
  }

  getMatchingKeys(matchstr) {
    let keys = [];

    for (let key in this.objs) {
      if (key.search(matchstr) !== -1) {
        keys.push(key);
      }
    }

    return keys;
  }

  getKeysForValue(value) {
    let keys = [];

    for (let key in this.objs) {
      if (this.objs[key] === value) {
        keys.push(key);
      }
    }

    return keys;
  }

  flattenFirst() {
    for (let key in this.objs) {
      if (Array.isArray(this.objs[key]) && this.objs[key].length >= 2) {
        this.objs[key] = this.objs[key][0];
      }
    }

    return this;
  }

  reset() {
    this.objs = {};
  }

  hasDuplicateKeys() {
    let hasDuplicates = false;
    Object.keys(this.duplicateKeys).forEach(file => {
      if (hasDuplicates) return;

      if (Object.keys(this.duplicateKeys[file]).length) {
        hasDuplicates = true;
      }
    });
    return hasDuplicates;
  }

  hasDuplicateValues() {
    let hasDuplicates = false;
    Object.keys(this.duplicateValues).forEach(file => {
      if (hasDuplicates) return;

      if (Object.keys(this.duplicateValues[file]).length) {
        hasDuplicates = true;
      }
    });
    return hasDuplicates;
  }

} // Retain 'of' from v1 for backward compatibility


exports.PropertiesFile = PropertiesFile;

let of = function of(...args) {
  let globalFile = new PropertiesFile();
  globalFile.of.apply(globalFile, args);
  return globalFile;
};

exports.of = of;