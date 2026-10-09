import type {
  IConfigurationService,
  IServiceContainer,
  Nullable,
  Optional,
  SetupAction,
} from '@xeno-js/core'
import { AppBuilder, Guards } from '@xeno-js/core'
import type { FastifyInstance, FastifyListenOptions, FastifyServerOptions } from 'fastify'

import { TOKENS } from '@/shared'

import type { FastifyXenoRegistry } from '../registries/fastify-registry.types'

export class FastifyXenoBuilder<
  TRegistry extends FastifyXenoRegistry = FastifyXenoRegistry,
> extends AppBuilder<TRegistry> {
  private _fastifyIsConfigured = false
  private _isListening: Nullable<Promise<this>> = null

  /**
   * Add Fastify as the HTTP transport for the application.
   * @param  setupAction An optional setup action to configure Fastify.
   * @returns The builder instance.
   */
  public addFastify(
    setupAction?: Optional<SetupAction<FastifyServerOptions, IConfigurationService>>,
  ): this {
    if (this._fastifyIsConfigured) return this

    this.addAdapter((opt) => {
      opt.fastify = true
      opt.native = false
      opt.vercel = false
    })

    const opts: FastifyServerOptions = {}
    if (Guards.isDefined(setupAction)) setupAction(opts, this._configuration)

    this._modules.push({
      priority: 1,
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
   * @param setupAction - The action to configure Fastify.
   * @returns A promise that resolves when the application is listening for requests.
   */
  public start(
    setupAction: (
      fastifyInstance: FastifyInstance,
      opts: FastifyListenOptions,
      container: IServiceContainer<TRegistry>,
      configuration: IConfigurationService,
    ) => void,
  ): Promise<this> {
    if (Guards.isDefined(this._isListening)) return this._isListening

    const attempt = this.executeStart(setupAction)
    this._isListening = attempt

    void attempt.then(
      () => {
        /* noop */
      },
      () => {
        if (this._isListening === attempt) {
          this._isListening = null
        }
      },
    )

    return attempt
  }

  private async executeStart(
    setupAction: (
      fastifyInstance: FastifyInstance,
      opts: FastifyListenOptions,
      container: IServiceContainer<TRegistry>,
      configuration: IConfigurationService,
    ) => void,
  ): Promise<this> {
    await this.build()

    const fastify = this._container.resolve(TOKENS.FASTIFY)
    try {
      const opts: FastifyListenOptions = {
        host: 'http://localhost',
        port: 3000,
      }
      if (Guards.isDefined(setupAction))
        setupAction(fastify, opts, this._container, this._configuration)
      await fastify.listen(opts)
      console.info(`Server listening on ${opts.host}:${opts.port}`)
      return this
    } catch (err: unknown) {
      fastify.log.error(err)
      try {
        await fastify.close()
      } catch {
        /* noop */
      }
      await this._resetContainer()
      this._buildPromise = null
      throw err
    }
  }
}
