import type { IConfigurationService, Optional, SetupAction } from '@xeno-js/core'
import { AppBuilder, Guards } from '@xeno-js/core'
import type { FastifyInstance, FastifyListenOptions, FastifyServerOptions } from 'fastify'

import { TOKENS } from '@/shared'

import type { FastifyXenoRegistry } from '../registries/fastify-registry.types'

export class FastifyXenoBuilder<
  TRegistry extends FastifyXenoRegistry = FastifyXenoRegistry,
> extends AppBuilder<TRegistry> {
  private _fastifyIsConfigured = false
  private _isListening = false

  /**
   * Add Fastify as the HTTP transport for the application.
   * @param opts - The options to configure Fastify.
   * @returns The builder instance.
   */
  public addFastify(
    setupAction?: Optional<SetupAction<FastifyServerOptions, IConfigurationService>>,
  ): this {
    if (this._fastifyIsConfigured) return this

    this.addAdapter((opt) => {
      opt.fastify = true
    })

    const opts: FastifyServerOptions = {}
    if (Guards.isDefined(setupAction)) setupAction(opts, this._configuration)

    this._modules.push({
      priority: 50,
      name: 'FastifyModule',
      action: async () => {
        const { FastifyModule } = await import('../modules/fastify.module')
        await new FastifyModule().configure(this._container, opts)
      },
    })
    this._fastifyIsConfigured = true
    return this
  }

  /**
   * Start the application and listen for incoming requests.
   * @param opts - The options to configure the server.
   * @returns A promise that resolves to the Fastify instance.
   */
  public async start(
    setupAction: (
      fastifyInstance: FastifyInstance,
      opts: FastifyListenOptions,
      configuration: IConfigurationService,
    ) => void,
  ): Promise<this> {
    await this.build()
    const fastify = this._container.resolve(TOKENS.FASTIFY)
    if (this._isListening) return this

    try {
      const opts: FastifyListenOptions = {
        port: 3000,
      }
      if (Guards.isDefined(setupAction)) setupAction(fastify, opts, this._configuration)
      await fastify.listen(opts)
      console.info(`Server listening on ${opts.port}`)
      this._isListening = true
      return this
    } catch (err: unknown) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
}
