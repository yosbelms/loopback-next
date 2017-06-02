// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Context, BindFn} from '@loopback/context';
import {OpenApiSpec} from '@loopback/openapi-spec';
import {ServerRequest, ServerResponse} from 'http';
import {getApiSpec} from './router/metadata';
import * as HttpErrors from 'http-errors';

import {Sequence, FindRoute, InvokeMethod} from './sequence';
import {RoutingTable, ResolvedRoute, parseRequestUrl} from './router/routing-table';
import {ParsedRequest, OperationArgs} from './internal-types';

const debug = require('debug')('loopback:core:http-handler');

export class HttpHandler {
  protected _routes: RoutingTable<string> = new RoutingTable<string>();

  public handleRequest: (request: ServerRequest, response: ServerResponse) => Promise<void>;

  constructor(protected _rootContext: Context) {
    this.handleRequest = (req, res) => this._handleRequest(req, res);
  }

  registerController(name: string, spec: OpenApiSpec) {
    this._routes.registerController(name, spec);
  }

  protected async _handleRequest(request: ServerRequest, response: ServerResponse): Promise<void> {
    const parsedRequest: ParsedRequest = parseRequestUrl(request);
    const requestContext = this._createRequestContext(request, response);

    this._bindInvokeMethod(requestContext);

    context.bind('findRoute').toDynamicValue('bind', (bind: BindFn) => {
      return (req: ParsedRequest) => this._findRoute(req, requestContext);
    });

    const findRoute = await requestContext.get('findRoute');
    const invokeMethod = await requestContext.get('invokeMethod');

    // TODO(bajtos) instantiate the Sequence via ctx.get()
    const sequence = new Sequence(findRoute, invokeMethod, this.logError.bind(this));
    return sequence.run(parsedRequest, response);
  }

  protected _createRequestContext(req: ServerRequest, res: ServerResponse): Context {
    const requestContext = new Context(this._rootContext);
    requestContext.bind('http.request').to(req);
    requestContext.bind('http.response').to(res);
    return requestContext;
  }


  protected _findRoute(req: ParsedRequest, context: Context): ResolvedRoute {
    const found = this._routes.find(req);
    if (!found)
      throw new HttpErrors.NotFound(`Endpoint "${req.method} ${req.path}" not found.`);

    // bind routing information to context
    const ctor = context.getBinding(found.controller).valueConstructor;
    if (!ctor)
      throw new Error(`The controller ${found.controller} was not bound via .toClass()`);

    context.bind('controller.current.ctor').to(ctor);
    context.bind('controller.current.operation').to(found.methodName);

    return found;
  }

  protected _bindInvokeMethod(context: Context) {
    context.bind('invokeMethod').toDynamicValue(() => {
      return async (controllerName: string, method: string, args: OperationArgs) => {
        const controller: { [opName: string]: Function } = await context.get(controllerName);
        const result = await controller[method](...args);
        return result;
      };
    });
  }

  logError(err: Error, statusCode: number, req: ServerRequest): void {
    console.error('Unhandled error in %s %s: %s %s',
      req.method, req.url, statusCode, err.stack || err);
  }
}
