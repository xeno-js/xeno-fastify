import type { IConfigurationService } from '@xeno-js/core'
import type { FastifyInstance, FastifyListenOptions, FastifyServerOptions } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FastifyXenoBuilder } from '../app.builder'

const { isDefined } = vi.hoisted(() => ({
  isDefined: vi.fn((value: unknown) => value !== undefined && value !== null),
}))
const { configureFastifyModule, adapter } = vi.hoisted(() => ({
  configureFastifyModule: vi.fn(),
  adapter: vi.fn(),
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

    protected addAdapter(setupAction: (options: { fastify: boolean }) => void) {
      const options = { fastify: false }
      setupAction(options)
      adapter(options)
      return this
    }

    async build() {
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
      expect(adapter).toHaveBeenCalledWith({ fastify: true })
      expect(setupAction).toHaveBeenCalledOnce()
      expect(setupAction).toHaveBeenCalledWith(expect.objectContaining({}), builder.configuration)
      expect(builder.modules).toHaveLength(1)
      expect(builder.modules[0]).toMatchObject({ priority: 50, name: 'FastifyModule' })

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
      log: { error: vi.fn() },
    })

    it('builds, configures, and starts Fastify with default listen options', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      const resolve = vi.fn().mockReturnValue(server)
      builder.replaceContainer({ resolve })
      const setupAction = vi.fn(
        (
          _instance: FastifyInstance,
          options: FastifyListenOptions,
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
        builder.configuration,
      )
      expect(server.listen).toHaveBeenCalledWith({ port: 3000, host: '127.0.0.1' })
      expect(info).toHaveBeenCalledWith('Server listening on 127.0.0.1:3000')
    })

    it('does not listen or rerun setup after the server has started', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })
      const setupAction = vi.fn()
      const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

      await builder.start(setupAction)
      await builder.start(setupAction)

      expect(server.listen).toHaveBeenCalledOnce()
      expect(setupAction).toHaveBeenCalledOnce()
      expect(info).toHaveBeenCalledOnce()
    })

    it('skips setup when invoked without a setup action', async () => {
      const builder = new TestFastifyXenoBuilder()
      const server = createServer()
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })

      await Reflect.apply(builder.start.bind(builder), builder, [undefined])

      expect(server.listen).toHaveBeenCalledWith({ host: 'http://localhost', port: 3000 })
    })

    it('logs startup failures and exits with status 1', async () => {
      const builder = new TestFastifyXenoBuilder()
      const error = new Error('listen failed')
      const exitError = new Error('process exit intercepted')
      const server = createServer()
      server.listen.mockRejectedValue(error)
      builder.replaceContainer({ resolve: vi.fn().mockReturnValue(server) })
      vi.spyOn(console, 'info').mockImplementation(() => undefined)
      const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw exitError
      })

      await expect(builder.start(() => undefined)).rejects.toBe(exitError)

      expect(server.log.error).toHaveBeenCalledWith(error)
      expect(exit).toHaveBeenCalledWith(1)
    })
  })
})
