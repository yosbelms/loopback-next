// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import * as fs from 'fs';
import * as path from 'path';
const debug = require('debug')('loopback:boot:plugin');
import * as assert from 'assert';
import * as _ from 'lodash';
import * as util from './utils';
import g from './globalize';

import {Context} from '@loopback/context';

export interface Plugin {
  name: string;
  load?(context: Context): Promise<void>;
  configure?(context: Context, config: Object): Promise<void>;
  compile?(context: Context): Promise<void>;
}

export interface AnyObject {
  // tslint:disable-next-line:no-any
  [property: string]: any;
}

export interface PluginConfig extends AnyObject {
  // tslint:disable-next-line:no-any
  [property: string]: any;
  rootDir?: string;
}

export abstract class PluginBase implements Plugin {
  constructor(
    public config: PluginConfig,
    public name: string,
    public artifact?: string,
  ) {
    this.config = config || {};
    this.name = name || config.name;
    this.artifact = artifact || config.artifact;
  }

  getRootDir() {
    return this.config.rootDir;
  }

  load(context: Context) {
    const rootDir = this.getRootDir() || this.config.rootDir;
    const env = this.config.env;
    assert(this.name, 'Plugin name must to be set');
    debug('Root dir: %s, env: %s, artifact: %s', rootDir, env, this.artifact);
    let config = {};
    if (this.config[this.name]) {
      // First check if options have the corresponding config object
      debug(
        'Artifact: %s is using provided config obj instead' + ' of config file',
      );
      config = this.config[this.name];
    } else {
      if (this.artifact) {
        config = this.loadNamed(rootDir, env, this.artifact);
      }
    }
    // Register as context.configurations.<plugin-name>
    return this.configure(context, config);
  }

  configure(context: Context, config) {
    config = config || {};
    // Register as context.configurations.<plugin-name>
    if (!context.configurations) {
      context.configurations = {};
    }
    context.configurations[this.name] = config;
    return config;
  }

  merge(target, config, keyPrefix) {
    return this._mergeObjects(target, config, keyPrefix);
  }

  /**
   * Load named configuration.
   * @param {String} rootDir Directory where to look for files.
   * @param {String} env Environment, usually `process.env.NODE_ENV`
   * @param {String} name
   * @returns {Object}
   */
  loadNamed(rootDir, env, name) {
    const files = this.findConfigFiles(rootDir, env, name);
    debug('Looking in dir %s for %s configs', rootDir, this.name);
    if (files.length) {
      debug('found %s %s files: %j', env, name, files);
      files.forEach(function(f) {
        debug('  %s', f);
      });
    }
    const configs = this._loadConfigFiles(files);
    const merged = this._mergeConfigurations(configs);

    debug('merged %s %s configuration %j', env, name, merged);

    return merged;
  }

  /**
   * Search `rootDir` for all files containing configuration for `name`.
   * @param {String} rootDir Root directory
   * @param {String} env Environment, usually `process.env.NODE_ENV`
   * @param {String} name Name
   * @param {Array.<String>} exts An array of extension names
   * @returns {Array.<String>} Array of absolute file paths.
   */
  findConfigFiles(rootDir: string, env, name: string, exts?) {
    const master = ifExists(name + '.json');
    if (
      !master &&
      (ifExistsWithAnyExt(name + '.local') ||
        ifExistsWithAnyExt(name + '.' + env))
    ) {
      g.warn('WARNING: Main config file "%s{{.json}}" is missing', name);
    }
    if (!master) return [];

    const candidates = [
      master,
      ifExistsWithAnyExt(name + '.local'),
      ifExistsWithAnyExt(name + '.' + env),
    ];

    return candidates.filter(function(c) {
      return c !== undefined;
    });

    function ifExists(fileName: string) {
      const filePath = path.resolve(rootDir, fileName);
      return util.fileExistsSync(filePath) ? filePath : undefined;
    }

    function ifExistsWithAnyExt(fileName: string) {
      const extensions = exts || ['js', 'ts', 'json'];
      let file;
      for (let i = 0, n = extensions.length; i < n; i++) {
        file = ifExists(fileName + '.' + extensions[i]);
        if (file) {
          return file;
        }
      }
    }
  }

  /**
   * Load configuration files into an array of objects.
   * Attach non-enumerable `_filename` property to each object.
   * @param {Array.<String>} files
   * @returns {Array.<Object>}
   */
  _loadConfigFiles(files: string[]) {
    return files.map(function(f) {
      let config = require(f);
      config = _.cloneDeep(config);
      Object.defineProperty(config, '_filename', {
        enumerable: false,
        value: f,
      });
      return config;
    });
  }

  /**
   * Merge multiple configuration objects into a single one.
   * @param {Array.<Object>} configObjects
   */
  _mergeConfigurations(configObjects: AnyObject[]) {
    const result = configObjects.shift() || {};
    while (configObjects.length) {
      const next = configObjects.shift();
      this.merge(result, next, next._filename);
    }
    return result;
  }

  _mergeObjects(target, config, keyPrefix?) {
    for (const key in config) {
      const fullKey = keyPrefix ? keyPrefix + '.' + key : key;
      const err = this._mergeSingleItemOrProperty(target, config, key, fullKey);
      if (err) throw err;
    }
    return null; // no error
  }

  _mergeNamedItems(arr1, arr2, key?) {
    assert(Array.isArray(arr1), 'invalid array: ' + arr1);
    assert(Array.isArray(arr2), 'invalid array: ' + arr2);
    key = key || 'name';
    const result = [].concat(arr1);
    for (let i = 0, n = arr2.length; i < n; i++) {
      const item = arr2[i];
      let found = false;
      if (item[key]) {
        for (let j = 0, k = result.length; j < k; j++) {
          if (result[j][key] === item[key]) {
            this._mergeObjects(result[j], item);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        result.push(item);
      }
    }
    return result;
  }

  _mergeSingleItemOrProperty(target, config, key, fullKey) {
    const origValue = target[key];
    const newValue = config[key];

    if (!hasCompatibleType(origValue, newValue)) {
      return (
        'Cannot merge values of incompatible types for the option `' +
        fullKey +
        '`.'
      );
    }

    if (Array.isArray(origValue)) {
      return this._mergeArrays(origValue, newValue, fullKey);
    }

    if (newValue !== null && typeof origValue === 'object') {
      return this._mergeObjects(origValue, newValue, fullKey);
    }

    target[key] = newValue;
    return null; // no error
  }

  _mergeArrays(target, config, keyPrefix) {
    if (target.length !== config.length) {
      return (
        'Cannot merge array values of different length' +
        ' for the option `' +
        keyPrefix +
        '`.'
      );
    }

    // Use for(;;) to iterate over undefined items, for(in) would skip them.
    for (let ix = 0; ix < target.length; ix++) {
      const fullKey = keyPrefix + '[' + ix + ']';
      const err = this._mergeSingleItemOrProperty(target, config, ix, fullKey);
      if (err) return err;
    }

    return null; // no error
  }

  buildInstructions(context, rootDir, config) {}

  compile(context) {
    let instructions;
    if (typeof this.buildInstructions === 'function') {
      const rootDir = this.config.rootDir;
      const config = context.configurations[this.name] || {};
      instructions = this.buildInstructions(context, rootDir, config);
    } else {
      instructions = context.configurations[this.name];
    }

    // Register as context.instructions.<plugin-name>
    if (!context.instructions) {
      context.instructions = {};
      if (this.config.appId) {
        context.instructions.appId = this.config.appId;
      }
    }
    context.instructions[this.name] = instructions;

    return undefined;
  }

  getUpdatedConfigObject(context, config, opts) {
    const app = context.app;
    const useEnvVars = opts && opts.useEnvVars;

    function interpolateVariables(config) {
      // config is a string and contains a config variable ('${var}')
      if (typeof config === 'string')
        return getConfigVariable(app, config, useEnvVars);

      // anything but an array or object
      if (typeof config !== 'object' || config == null) return config;

      // recurse into array elements
      if (Array.isArray(config)) return config.map(interpolateVariables);

      // Not a plain object. Examples: RegExp, Date,
      if (!config.constructor || config.constructor !== Object) return config;

      // recurse into object props
      const interpolated = {};
      Object.keys(config).forEach(function(configKey) {
        const value = config[configKey];
        if (Array.isArray(value)) {
          interpolated[configKey] = value.map(interpolateVariables);
        } else if (typeof value === 'string') {
          interpolated[configKey] = getConfigVariable(app, value, useEnvVars);
        } else if (value === null) {
          interpolated[configKey] = value;
        } else if (typeof value === 'object' && Object.keys(value).length) {
          interpolated[configKey] = interpolateVariables(value);
        } else {
          interpolated[configKey] = value;
        }
      });
      return interpolated;
    }
    return interpolateVariables(config);
  }
}

function hasCompatibleType(origValue, newValue) {
  if (origValue === null || origValue === undefined)
    return true;

  if (Array.isArray(origValue))
    return Array.isArray(newValue);

  if (typeof origValue === 'object')
    return typeof newValue === 'object';

  // Note: typeof Array() is 'object' too,
  // we don't need to explicitly check array types
  return typeof newValue !== 'object';
}

const DYNAMIC_CONFIG_PARAM = /\$\{(\w+)\}$/;
function getConfigVariable(app, param, useEnvVars) {
  let configVariable = param;
  const match = configVariable.match(DYNAMIC_CONFIG_PARAM);
  if (match) {
    const varName = match[1];
    if (useEnvVars && process.env[varName] !== undefined) {
      debug('Dynamic Configuration: Resolved via process.env: %s as %s',
        process.env[varName], param);
      configVariable = process.env[varName];
    } else if (app.get(varName) !== undefined) {
      debug('Dynamic Configuration: Resolved via app.get(): %s as %s',
        app.get(varName), param);
      const appValue = app.get(varName);
      configVariable = appValue;
    } else {
      // previously it returns the original string such as "${restApiRoot}"
      // it will now return `undefined`, for the use case of
      // dynamic datasources url:`undefined` to fallback to other parameters
      configVariable = undefined;
      g.warn('%s does not resolve to a valid value, returned as %s. ' +
        '"%s" must be resolvable in Environment variable or by {{app.get()}}.',
        param, configVariable, varName);
      debug('Dynamic Configuration: Cannot resolve variable for `%s`, ' +
        'returned as %s', varName, configVariable);
    }
  }
  return configVariable;
}
