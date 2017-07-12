'use strict';

export default function(opitions) {
  return new Tracker(opitions);
};

class Tracker {
  constructor(options) {
    this.name = 'tracker';
    this.options = options || {};
  }

  load(context) {
    context.configurations.tracker = 'load';
  }

  compile(context, done) {
    context.instructions.tracker = 'compile';
    process.nextTick(done);
  }

  start(context, done) {
    context.executions = context.executions || {};
    context.executions.tracker = 'start';
    process.nextTick(done);
  }
}
