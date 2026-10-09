import type { IConfigurationService, IServiceContainer } from '@xeno-js/core'
import type { FastifyInstance, FastifyListenOptions, FastifyServerOptions } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FastifyXenoBuilder } from '../app.builder'

const { isDefined } = vi.hoisted(() => ({
  isDefined: vi.fn((value: unknown) => value !== undefined && value !== null),
}))
const { configureFastifyModule, adapter, build, resetContainer } = vi.hoisted(() => ({
  configureFastifyModule: vi.fn(),
  adapter: vi.fn(),
  build: vi.fn(),
  resetContainer: vi.fn(),
}))

vi.mock('@xeno-js/core', () => ({
  AppBuilder: class {
    protected readonly _container = { resolve: vi.fn() }
    protected readonly _configuration = {}
    protected readonly _modules: {
      priority: number
      name: string
      action: () => Promise<void>
    }[] = []

    protected async _resetContainer(): Promise<void> {
      await resetContainer()
    }

    protected addAdapter(setupAction: (options: { fastify: boolean }) => void) {
      const options = { fastify: false }
      setupAction(options)
      adapter(options)
      return this
    }

    async build() {
      await build()
      return this._container
    }
  },
  Guards: { isDefined },
}))

vi.mock('@/shared', () => ({ TOKENS: { FASTIFY: 'FASTIFY' } }))

vi.mock('../../modules/fastify.module', () => ({
  FastifyModule: class {
    configure = configureFastifyModule
  },
}))

class TestFastifyXenoBuilder extends FastifyXenoBuilder {
  public get configuration() {
    return this._configuration
  }

  public get modules() {
    return this._modules
  }

  public replaceContainer(container: unknown) {
    Object.defineProperty(this, '_container', { value: container })
  }
}

describe('FastifyXenoBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    build.mockResolvedValue(undefined)
  })

  describe('addFastify', () => {
    it('enables the Fastify adapter and configures it once', async () => {
      const builder = new TestFastifyXenoBuilder()

      const setupAction = vi.fn((options: FastifyServerOptions) => {
        options.logger = false
      })

      expect(builder.addFastify(setupAction)).toBe(builder)
      expect(builder.addFastify(setupAction)).toBe(builder)
      expect(adapter).toHaveBeenCalledOnce()
      expect(adapter).toHaveBeenCalledWith({ fastify: true, native: false, vercel: false })
      expect(setupAction).toHaveBeenCalledOnce()
      expect(setupAction).toHaveBeenCalledWith(expect.objectContaining({}), builder.configuration)
      expect(builder.modules).toHaveLength(1)
      expect(builder.modules[0]).toMatchObject({ priority: 1, name: 'FastifyModule' })

      await builder.modules[0]?.action()
      expect(configureFastifyModule).toHaveBeenCalledOnce()
      expect(configureFastifyModule).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ logger: false }),
      )
    })

    it('accepts an omitted setup action', () => {
      const builder = new TestFastifyXenoBuilder()

      expect(builder.addFastify()).toBe(builder)
      expect(isDefined).toHaveBeenCalledWith(undefined)
      expect(builder.modules).toHaveLength(1)
    })
  })

  describe('start', () => {
    const createServer = () => ({
      listen: vi.fn().mockResolvedValue('http://localhost:3000'),
      close: vi.fn().mockResolvedValue(undefined),
      log: { error: vi.fn() },
    })

    it('builds, configures, and starts Fastify with default listen options', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      const resolve = vi.fn().mockReturnValue(server)
      builder.replaceContainer({ resolve })
      const fakeContainer = { resolve }
      const setupAction = vi.fn(
        (
          _instance: FastifyInstance,
          options: FastifyListenOptions,
          _container: IServiceContainer,
          _configuration: IConfigurationService,
        ) => {
          options.host = '127.0.0.1'
        },
      )
      const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

      await expect(builder.start(setupAction)).resolves.toBe(builder)

      expect(resolve).toHaveBeenCalledWith('FASTIFY')
      expect(setupAction).toHaveBeenCalledWith(
        server,
        { port: 3000, host: '127.0.0.1' },
        fakeContainer,
        builder.configuration,
      )
      expect(server.listen).toHaveBeenCalledWith({ port: 3000, host: '127.0.0.1' })
      expect(info).toHaveBeenCalledWith('Server listening on 127.0.0.1:3000')
    })

    it('shares an in-flight startup across concurrent calls', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      let resolveListen!: (value: string) => void
      server.listen.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveListen = resolve
          }),
      )
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })
      const firstSetup = vi.fn()
      const secondSetup = vi.fn()
      vi.spyOn(console, 'info').mockImplementation(() => undefined)

      const firstStart = builder.start(firstSetup)
      const secondStart = builder.start(secondSetup)

      await vi.waitFor(() => expect(server.listen).toHaveBeenCalledOnce())
      expect(build).toHaveBeenCalledOnce()
      expect(firstSetup).toHaveBeenCalledOnce()
      expect(secondSetup).not.toHaveBeenCalled()

      resolveListen('http://localhost:3000')
      await expect(Promise.all([firstStart, secondStart])).resolves.toEqual([builder, builder])

      expect(secondStart).toBe(firstStart)
      expect(server.listen).toHaveBeenCalledOnce()
    })

    it('reuses the successful startup promise on subsequent calls', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })
      vi.spyOn(console, 'info').mockImplementation(() => undefined)

      const firstStart = builder.start(vi.fn())
      await expect(firstStart).resolves.toBe(builder)
      const secondStart = builder.start(vi.fn())
      await expect(secondStart).resolves.toBe(builder)

      expect(secondStart).toBe(firstStart)
      expect(build).toHaveBeenCalledOnce()
      expect(server.listen).toHaveBeenCalledOnce()
    })

    it('skips setup when invoked without a setup action', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })

      await Reflect.apply(builder.start.bind(builder), builder, [undefined])

      expect(server.listen).toHaveBeenCalledWith({ host: 'http://localhost', port: 3000 })
    })

    it('logs startup failures and propagates the original error', async () => {
      const builder = new TestFastifyXenoBuilder()
      const error = new Error('listen failed')
      const server = createServer()
      server.listen.mockRejectedValue(error)

      builder.replaceContainer({
        resolve: vi.fn().mockReturnValue(server),
      })

      const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

      await expect(builder.start(() => undefined)).rejects.toBe(error)

      expect(server.log.error).toHaveBeenCalledWith(error)
      expect(server.listen).toHaveBeenCalledOnce()
      expect(info).not.toHaveBeenCalled()
    })

    it('allows retrying startup when building fails', async () => {
      const builder = new TestFastifyXenoBuilder()
      const error = new Error('build failed')
      const server = createServer()
      build.mockRejectedValueOnce(error)
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })
      vi.spyOn(console, 'info').mockImplementation(() => undefined)
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await expect(builder.start(() => undefined)).rejects.toBe(error)
      await expect(builder.start(() => undefined)).resolves.toBe(builder)

      expect(build).toHaveBeenCalledTimes(2)
      expect(server.listen).toHaveBeenCalledOnce()
    })

    it('allows retrying startup after a failure', async () => {
      const builder = new TestFastifyXenoBuilder()
      const error = new Error('listen failed')
      const server = createServer()

      server.listen.mockRejectedValueOnce(error).mockResolvedValueOnce('http://localhost:3000')

      builder.replaceContainer({
        resolve: vi.fn().mockReturnValue(server),
      })

      vi.spyOn(console, 'info').mockImplementation(() => undefined)

      await expect(builder.start(() => undefined)).rejects.toBe(error)
      await expect(builder.start(() => undefined)).resolves.toBe(builder)

      expect(build).toHaveBeenCalledTimes(2)
      expect(server.listen).toHaveBeenCalledTimes(2)
      expect(server.close).toHaveBeenCalledOnce()
      expect(resetContainer).toHaveBeenCalledOnce()
      expect(server.log.error).toHaveBeenCalledOnce()
    })
  })
})
