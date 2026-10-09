 <div align="center">
  <img src="logo/logo.png" alt="Xeno.JS Logo" width="140" />

  <h1>Xeno.JS</h1>
  <p><strong>A Typescript application framework architecture for Node.js, designed for lower technical debt, and faster infrastructure migrations.</strong></p>
  <p>Build long-lived applications with explicit dependency injection, DDD, CQRS, and transport-independent business logic.</p>

  <p>
    <a href="https://www.npmjs.com/package/@xeno-js/fastify"><img src="https://img.shields.io/npm/v/@xeno-js/fastify?style=flat-square" alt="NPM Version" /></a>
    <a href="https://github.com/xeno-js/xeno-fastify"><img src="https://img.shields.io/badge/Powered%20by-Xeno-blueviolet?style=flat-square" alt="Powered by Xeno" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT" /></a>
    <a href="https://buymeacoffee.com/xenojs">
      <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-FFdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
    </a>
  </p>
</div>

---

# @xeno-js/fastify

Fastify transport integration for Xeno.JS.

`@xeno-js/fastify` integrates [Fastify](https://fastify.dev) into Xeno.JS
applications, allowing you to use Fastify's HTTP server and routing API while
keeping application composition and business logic independent of the transport
layer.

**Fastify handles HTTP. Xeno.JS handles the application.**

The goal is simple: expose the same application through different entry points
without rewriting its use cases whenever the transport changes.

## Features

- Fastify 5 integration
- Fluent `FastifyXenoBuilder` API
- Fastify instance registration in the Xeno.JS dependency injection container
- Native Fastify server configuration
- Separate server and listen configuration
- TypeScript-first API
- Support for custom application registries
- Application build before server startup
- Protection against repeated Fastify configuration
- Protection against repeated startup through the same builder instance

## Installation

Install the adapter together with Xeno.JS Core and Fastify:

```bash
npm install @xeno-js/core @xeno-js/fastify fastify
```

The adapter declares `@xeno-js/core` and `fastify` as peer dependencies.

### Requirements

- Node.js `>=20`
- `@xeno-js/core` `^3.0.0`
- Fastify `^5.12.5`
- TypeScript 5.x recommended

## Quick Start

Create a builder, configure Fastify, register your routes, and start the
application.

```ts
import { FastifyXenoBuilder } from '@xeno-js/fastify'

const app = new FastifyXenoBuilder()

app.addFastify((opts) => {
  opts.logger = true
})

await app.start((fastify, opts, _container, config) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
    }
  })

  opts.port = config.getNumber('PORT', 3000)
  opts.host = config.getOrThrow('HOST')
})
```

Configure `HOST` with a hostname or IP address, such as `127.0.0.1` or
`0.0.0.0`. Do not include the URL protocol.

The `start()` callback lets you register routes and configure the listen options
before Fastify begins listening.

## How It Works

The adapter connects the Xeno.JS application builder to Fastify.

```text
┌─────────────────────────────────────┐
│           Application Core          │
│                                     │
│  Use Cases / Commands / Queries     │
│  Domain / Services / Repositories   │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│             @xeno-js/core           │
│                                     │
│  Dependency Injection / CQRS        │
│  Modules / Context / Lifecycle      │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          @xeno-js/fastify           │
│                                     │
│  FastifyXenoBuilder                 │
│  FastifyModule / FastifyFactory     │
│  FastifyXenoRegistry                │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│                Fastify              │
│                                     │
│  HTTP / Routes / Plugins / Server   │
└─────────────────────────────────────┘
```

The adapter does not replace Fastify's APIs. It makes Fastify part of the
Xeno.JS application composition process.

## Fastify Configuration

`addFastify()` accepts a configuration callback that receives Fastify's native
`FastifyServerOptions` and the Xeno.JS configuration service.

```ts
const app = new FastifyXenoBuilder()

app.addFastify((opts) => {
  opts.logger = {
    level: 'info',
  }

  opts.trustProxy = true

  opts.routerOptions = {
    ignoreTrailingSlash: true,
  }
})
```

You can configure Fastify using its native options, including logging, routing,
request handling, and supported HTTP server settings.

For the complete list of available options, see the
[Fastify documentation](https://fastify.dev/docs/latest/Reference/Server/).

### Accessing application configuration

The setup callback can also receive the Xeno.JS configuration service:

```ts
app.addFastify((opts, config) => {
  opts.logger = true

  // Read application configuration when needed.
})
```

This allows Fastify configuration to be composed alongside the rest of the
application.

## Starting the Server

`start()` builds the Xeno.JS application, resolves the registered Fastify
instance, applies the listen configuration, and starts the HTTP server.

```ts
await app.start((fastify, opts, _container, config) => {
  fastify.get('/health', async () => ({
    status: 'ok',
  }))

  opts.port = config.getNumber('PORT', 3000)
  opts.host = config.getOrThrow('HOST')

  // The Xeno.JS service container is available here.
})
```

The callback receives three arguments:

| Argument    | Description                       |
| ----------- | --------------------------------- |
| `fastify`   | The native Fastify instance       |
| `opts`      | Fastify listen options            |
| `container` | The Xeno.JS service container     |
| `config`    | The Xeno.JS configuration service |

The callback runs before `fastify.listen()`.

### Listen options

Listen options configure how the server accepts connections. They are separate
from the options used to create the Fastify instance.

```ts
await app.start((_fastify, opts) => {
  opts.port = 8080
  opts.host = '127.0.0.1'
})
```

Use a host appropriate for your environment. Binding to `0.0.0.0` allows the
server to listen on all IPv4 network interfaces, which may be appropriate for
containers or deployed services.

Fastify documents its startup behavior in the
[server reference](https://fastify.dev/docs/latest/Reference/Server/).

## Routes and Plugins

The adapter exposes the native Fastify instance to the startup callback. You can
use Fastify's existing routing API directly.

```ts
await app.start((fastify, opts, _container, config) => {
  fastify.get('/health', async () => ({
    status: 'ok',
  }))

  fastify.get('/users/:id', async (request) => {
    return {
      id: request.params.id,
    }
  })

  opts.port = config.getNumber('PORT', 3000)
  opts.host = config.getOrThrow('HOST')
})
```

Fastify's native APIs remain available, including:

- `get()`, `post()`, `put()`, `delete()`, and `route()`
- `register()` for plugins
- Hooks and decorators
- Request validation and response serialization
- Logging and supported server configuration

For plugin registration and encapsulation, refer to the
[Fastify plugin documentation](https://fastify.dev/docs/latest/Reference/Plugins/).

## Dependency Injection

The adapter registers the Fastify instance in the Xeno.JS service container
using the `FASTIFY` registry key.

The adapter's registry extends the Xeno.JS application registry with a typed
Fastify dependency:

```ts
import type { ApplicationRegistry } from '@xeno-js/core'
import type { FastifyInstance } from 'fastify'

export interface FastifyXenoRegistry<
  TContext = unknown,
  TTransaction = unknown,
> extends ApplicationRegistry<TContext, TTransaction> {
  readonly FASTIFY: FastifyInstance
}
```

This makes the Fastify instance available to infrastructure that needs it
without relying on a global variable.

Prefer keeping application use cases independent of Fastify. The native instance
belongs at the transport and infrastructure boundary; domain rules should not
need to import HTTP framework types.

## Custom Registries

`FastifyXenoBuilder` accepts a registry type extending `FastifyXenoRegistry`.
This lets an application describe its own registered dependencies while
retaining the Fastify registry contract.

```ts
import { FastifyXenoBuilder } from '@xeno-js/fastify'
import type { XenoRegistry } from '@xeno-js/fastify'

interface AppRegistry extends XenoRegistry {
  readonly MY_SERVICE: MyService
}

const app = new FastifyXenoBuilder<AppRegistry>()
```

Replace `MyService` with a service type defined by your application and register
its implementation through your normal Xeno.JS composition process.

## Application Composition

A typical application has two distinct concerns:

- **Application composition:** registering modules, dependencies, services, and
  application behavior.
- **Transport composition:** configuring Fastify, defining routes, and choosing
  how the HTTP server listens.

Keeping these responsibilities separate helps prevent business logic from
becoming coupled to a specific HTTP framework.

For example, a use case can be invoked from a Fastify route today and reused by
a CLI command or background job later, without implementing the same business
rules twice.

## Builder Lifecycle

The adapter follows this startup sequence:

```text
Create FastifyXenoBuilder
          │
          ▼
     addFastify()
          │
          ▼
     Configure module
          │
          ▼
        start()
          │
          ▼
    Build application
          │
          ▼
 Resolve Fastify instance
          │
          ▼
 Apply listen options
          │
          ▼
    fastify.listen()
```

Calling `start()` performs the application build automatically. You do not need
to call `build()` separately before starting the server.

The builder also guards against repeated `addFastify()` configuration and
repeated startup on the same instance.

## What This Package Provides

`@xeno-js/fastify` provides:

- Integration between Fastify and Xeno.JS Core
- The `FastifyXenoBuilder` application builder
- Fastify module and factory integration
- Registration of the Fastify instance in the Xeno.JS container
- A typed registry contract for Fastify
- Server startup through the builder lifecycle

## What This Package Does Not Provide

This package is not a replacement for Fastify.

It does not introduce a second HTTP framework or attempt to replace Fastify's
routing, plugins, hooks, validation, serialization, logging, or server APIs.

Instead, it integrates Fastify into the Xeno.JS composition model so the HTTP
transport can remain separate from the application core.

## Package API

The package exports:

```ts
export { FastifyXenoBuilder }
export type { XenoRegistry }
export * from '@xeno-js/core'
```

### `FastifyXenoBuilder`

The primary builder for composing a Xeno.JS application with Fastify.

### `addFastify()`

```ts
addFastify(
  setupAction?: SetupAction<
    FastifyServerOptions,
    IConfigurationService
  >
): this
```

Configures the Fastify instance through a callback and adds the Fastify module
to the application.

### `start()`

```ts
start(
  setupAction: (
    fastifyInstance: FastifyInstance,
    opts: FastifyListenOptions,
    container: IServiceContainer<TRegistry>
    configuration: IConfigurationService,
  ) => void
): Promise<this>
```

---

## Advanced Example: Fastify + PostgreSQL

This example demonstrates how to integrate Fastify with the PostgreSQL adapter,
define a typed application registry, register services in the dependency
injection container, and handle HTTP requests using scoped dependencies.

### Install PostgreSQL integration

If you want to use PostgreSQL, install the integration package:

```bash
npm install @xeno-js/postgresql
```

See the [xeno-postgresql repository](https://github.com/xeno-js/xeno-postgresql)
for additional documentation.

### Define the application registry

Create `src/registry.ts`:

```typescript
import type {
  IReadDataSource,
  IReadDao,
  IHandler,
  IController,
} from '@xeno-js/core'
import type { XenoDbRegistry } from '@xeno-js/postgresql'
import type { FindUserQuery, FindUserDto } from './user'
import { DbSchema } from './schema'

export interface AppRegistry extends XenoDbRegistry<DbSchema> {
  USER_DATA_SOURCE: IReadDataSource
  USER_REPOSITORY: IReadDao
  FIND_USER_HANDLER: IHandler<FindUserQuery, void>
  FIND_USER_CONTROLLER: IController<FindUserDto, void>
}
```

`XenoDbRegistry<DbSchema>` extends the registry with the database-related tokens
and types required by the PostgreSQL integration. `AppRegistry` adds the
application's own services.

The `DbSchema` type should be defined according to the
[database schema documentation](https://www.xeno-js.it/docs/data/db-schema).

### Configure the application

Create `src/bootstrap.ts`:

```typescript
import { TOKENS } from '@xeno-js/core'
import { FastifyXenoBuilder } from '@xeno-js/fastify'
import { withPostgresql } from '@xeno-js/postgresql'
import type { AppRegistry } from './registry'
import {
  UserDataSource,
  UserRepository,
  FindUserHandler,
  FindUserController,
} from './user'

const app = new FastifyXenoBuilder<AppRegistry>()
  .addServices((services) => {
    services.addScoped('USER_DATA_SOURCE', (container) => {
      return new UserDataSource(container.resolve(TOKENS.DB_CONTEXT))
    })

    services.addScoped('USER_REPOSITORY', (container) => {
      return new UserRepository(container.resolve('USER_DATA_SOURCE'))
    })

    services.addScoped('FIND_USER_HANDLER', (container) => {
      return new FindUserHandler(
        container.resolve('USER_REPOSITORY'),
        container.resolve(TOKENS.USER_CONTEXT_FACTORY),
      )
    })

    services.addTransient('FIND_USER_CONTROLLER', (container) => {
      return new FindUserController(
        container.resolve(TOKENS.REQUEST_CONTEXT),
        container.resolve(TOKENS.MEDIATOR),
      )
    })
  })
  .addLogger()
  .addPipeline()
  .addDb(
    withPostgresql((opts, config) => {
      opts.connectionString = config.getOrThrow('DATABASE_URL')
    }),
  )
  .addFastify((opts) => {
    opts.logger = true
  })

await app.start((fastify, opts, container, config) => {
  fastify.get<{ Params: { id: string } }>('/user/:id', async (req, res) => {
    const scope = container.createScope()

    try {
      const controller = scope.resolve('FIND_USER_CONTROLLER')
      const response = await controller.handle(
        req.params,
        new AbortController().signal,
      )

      return res.status(response.status).send(response.data)
    } catch (err: unknown) {
      req.log.error(err)

      return res.status(500).send({
        success: false,
        error: { message: 'Internal Server Error' },
      })
    } finally {
      await scope.dispose()
    }
  })

  opts.port = config.getNumber('PORT', 3000)
})
```

### How it works

- **Typed registry:** `AppRegistry` describes the application's services and
  extends the PostgreSQL registry.
- **Dependency injection:** services are registered using `addScoped()` and
  `addTransient()`.
- **PostgreSQL configuration:** `withPostgresql()` reads the connection string
  from `DATABASE_URL`.
- **Fastify configuration:** `addFastify()` enables Fastify's logger.
- **Request-scoped dependencies:** each request creates a scope, resolves the
  controller from that scope, and disposes of the scope in `finally`.
- **Environment-based port:** the server reads `PORT`, defaulting to `3000`.

Make sure your database configuration and schema are set up before starting the
application.

---

Builds the application and starts the Fastify server. The promise resolves to
the builder instance.

## Ecosystem

| Package                                                                    | Responsibility                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`@xeno-js/core`](https://www.npmjs.com/package/@xeno-js/core)             | Application architecture, dependency injection, CQRS, modules, context, and lifecycle |
| [`@xeno-js/shared`](https://www.npmjs.com/package/@xeno-js/shared)         | Shared primitives and contracts                                                       |
| [`@xeno-js/fastify`](https://www.npmjs.com/package/@xeno-js/fastify)       | Fastify HTTP transport integration                                                    |
| [`@xeno-js/postgresql`](https://www.npmjs.com/package/@xeno-js/postgresql) | PostgreSQL integration                                                                |
| [`@xeno-js/vue`](https://www.npmjs.com/package/@xeno-js/fe)                | Vue integration                                                                       |
| [`@xeno-js/cli`](https://www.npmjs.com/package/@xeno-js/cli)               | Project scaffolding and code generation                                               |

See the [Xeno.JS website](https://www.xeno-js.it/) for more information about
the framework.

## Contributing

Contributions are welcome! Bug fixes, documentation improvements, tests, and new
integrations all help improve the Xeno.JS ecosystem.

See the [repository](https://github.com/xeno-js/xeno-fastify) for the source
code and contribution workflow.

## License

MIT
