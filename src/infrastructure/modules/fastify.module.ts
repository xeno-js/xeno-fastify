import type { IModule, IServiceContainer } from '@xeno-js/core'
import type { FastifyServerOptions } from 'fastify'

import type { FastifyXenoRegistry } from '../registries/fastify-registry.types'

/**
 * @description FastifyModule is a class that implements the IModule interface for the Fastify framework. It provides a way to configure and set up Fastify within the application's dependency injection container.
 *
 * @author Xeno
 * @version 1.0.0
 * @since 2025-09-30
 * @link https://github.com/xeno-js/xeno-js
 */
export class FastifyModule<
  TRegistry extends FastifyXenoRegistry = FastifyXenoRegistry,
> implements IModule<TRegistry, FastifyServerOptions> {
  async configure(
    container: IServiceContainer<TRegistry>,
    opts: FastifyServerOptions,
  ): Promise<void> {
    const { TOKENS } = await import('@/shared')

    const { FastifyFactory } = await import('../factories/fastify.factory')
    const fastify = new FastifyFactory().create(opts)

    container.addSingleton(TOKENS.FASTIFY, () => fastify)
  }
}
