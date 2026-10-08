import type { IFactory } from '@xeno-js/shared'
import type { FastifyInstance, FastifyServerOptions } from 'fastify'
import Fastify from 'fastify'

export class FastifyFactory implements IFactory<FastifyServerOptions, FastifyInstance> {
  public create(opts: FastifyServerOptions): FastifyInstance {
    return Fastify(opts)
  }
}
