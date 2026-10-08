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

`@xeno-js/fastify` integrates [Fastify](https://fastify.dev) as the HTTP
transport for Xeno.JS applications, while keeping application composition,
dependency injection, CQRS, request context, and infrastructure concerns inside
Xeno.JS.

Xeno.JS does not replace Fastify. Fastify handles HTTP; Xeno.JS handles the
application.

---

## Features

- Fastify 5 integration
- Explicit Fastify dependency registration
- Typed Fastify instance through the Xeno.JS service container
- Fluent application builder
- Separate Fastify server and listen configuration
- Integration with Xeno.JS dependency injection
- Support for custom application registries
- Idempotent Fastify configuration
- Application build before server startup
- TypeScript-first API

---

## Installation

Install `@xeno-js/fastify` together with Xeno.JS core and Fastify:

```bash
npm install @xeno-js/core @xeno-js/fastify fastify
```

The package declares both `@xeno-js/core` and `fastify` as peer dependencies.

---

## Architecture

The package acts as the transport boundary between Xeno.JS and Fastify:

```text
┌──────────────────────────────────────┐
│              Application             │
│                                      │
│  Commands / Queries / Services       │
│  Domain / Use Cases / Repositories   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            @xeno-js/core             │
│                                      │
│  DI / Modules / Context / CQRS       │
│  Pipelines / Application lifecycle   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│           @xeno-js/fastify           │
│                                      │
│  FastifyXenoBuilder                  │
│  FastifyModule                       │
│  FastifyFactory                      │
│  FastifyXenoRegistry                 │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│               Fastify                │
│                                      │
│  HTTP / Routing / Plugins / Server   │
└──────────────────────────────────────┘
```

This follows the architectural role of Xeno.JS:

> Your HTTP framework handles HTTP. Xeno.JS handles the application.

Xeno.JS explicitly positions the application layer underneath the HTTP framework
rather than replacing it.

---

## Quick Start

The main entry point is `FastifyXenoBuilder`.

```ts
import { FastifyXenoBuilder } from '@xeno-js/fastify'

const app = new FastifyXenoBuilder()

app.addFastify(opts => {
  opts.logger: true,
})

await app.start()
```

By default, `start()` listens on port `3000`.

The equivalent explicit configuration is:

```ts
import { FastifyXenoBuilder } from '@xeno-js/fastify'

const app = new FastifyXenoBuilder()

app.addFastify(opts => {
  opts.logger = true,
})

await app.start((opts) => {
  opts.port = 8080
  opts.host = '0.0.0.0'
})
```

`FastifyServerOptions` are passed to the Fastify factory when the Fastify
instance is created, while `FastifyListenOptions` configure the server startup.
Fastify itself documents these as separate configuration stages.

---

## Fastify Configuration

`addFastify()` accepts Fastify's native `FastifyServerOptions`.

```ts
app.addFastify(opts => {
  opts.logger = true,
  opts.trustProxy = true,
})
```

The options are passed directly to Fastify:

```ts
Fastify((opts) => {})
```

This means the package does not introduce a second configuration abstraction
over Fastify.

You can use the Fastify configuration API directly, including options such as:

- `logger`
- `http2`
- `https`
- `routerOptions`
- `trustProxy`
- `bodyLimit`
- `requestIdHeader`
- `disableRequestLogging`
- and other Fastify server options.

Fastify documents `FastifyServerOptions` as the options used when instantiating
the server.

For example:

```ts
const app = new FastifyXenoBuilder()

app.addFastify((opts) => {
  opts.logger = {
    level: 'info',
  },
  opts.routerOptions = {
    ignoreTrailingSlash: true,
  },
})
```

---

## Starting the Server

Use `start()` to build the Xeno.JS application and start Fastify.

```ts
await app.start((fastify, opts, configuration) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
    }
  })
  opts.port = Number(configuration.getOrThrow('PORT'))
  opts.host = configuration.getOrThrow('HOST')
})
```

The builder:

1. Builds the Xeno.JS application.
2. Resolves the Fastify instance from the service container.
3. Applies the listen configuration.
4. Calls `fastify.listen()`.
5. Returns the `FastifyInstance`.

Fastify's `listen()` API starts the server and waits for Fastify's readiness
lifecycle before resolving.

### Custom listen options

Use the `setupAction` argument when the listen configuration needs to come from
application configuration:

```ts
await app.start((fastify, opts, configuration) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
    }
  })
  opts.port = Number(configuration.getOrThrow('PORT'))
  opts.host = configuration.getOrThrow('HOST')
})
```

The callback receives:

```ts
SetupAction<FastifyListenOptions, IConfigurationService>
```

This keeps server startup configuration separate from Fastify instance
configuration.

---

## Server Options vs Listen Options

There are two different configuration stages.

### Fastify server configuration

Passed to:

```ts
app.addFastify((opts) => {
  opts.logger = true,
  opts.http2 = true,
})
```

Type:

```ts
FastifyServerOptions
```

These options configure the Fastify instance itself.

### Server listen configuration

Passed through:

```ts
await app.start((opts) => {
  opts.port = 3000
  opts.host = '0.0.0.0'
})
```

Type:

```ts
FastifyListenOptions
```

These options control how the already-created Fastify server listens for
connections.

This distinction mirrors Fastify's own API.

---

## Dependency Injection

The Fastify instance is registered in the Xeno.JS service container using the
`FASTIFY` token.

```ts
container.resolve(TOKENS.FASTIFY)
```

The registry exposes the instance with its concrete Fastify type:

```ts
export interface FastifyXenoRegistry<
  TContext = unknown,
  TTransaction = unknown,
> extends ApplicationRegistry<TContext, TTransaction> {
  readonly FASTIFY: FastifyInstance
}
```

This allows application infrastructure to resolve the Fastify instance without
relying on a global variable.

For example:

```ts
const fastify = container.resolve(TOKENS.FASTIFY)

fastify.get('/health', async () => {
  return {
    status: 'ok',
  }
})
```

Fastify's native routing API remains available because the registered dependency
is the actual `FastifyInstance`.

---

## Custom Registry

`FastifyXenoBuilder` is generic and can be used with an extended Xeno registry.

```ts
import type { XenoRegistry } from '@xeno-js/fastify'

interface MyRegistry extends XenoRegistry {
  readonly MY_SERVICE: MyService
}

const app = new FastifyXenoBuilder<MyRegistry>()
```

The package preserves the Fastify dependency in the registry while allowing
applications to add their own dependencies.

The exported `XenoRegistry` is based on `FastifyXenoRegistry` and prevents
extensions from redefining existing registry keys.

---

## Routes

`@xeno-js/fastify` does not replace Fastify's routing API.

You can continue to use Fastify directly:

```ts
const app = new FastifyXenoBuilder()

app.addFastify((opts) => {
  opts.logger = true,
})

await app.start((fastify, opts, config) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
    }
  })

  opts.port = config.getNumber('PORT', 3000)
})
```

However, when using `start()`, route registration should normally happen before
the server starts listening.

A typical application can therefore compose its Fastify routes during
application setup and use `start()` only for the final server startup.

Fastify exposes native routing methods such as `get()`, `post()`, `put()`,
`delete()`, and `route()`.

---

## Fastify Plugins

Because the package exposes the actual `FastifyInstance`, Fastify's native
plugin system remains available.

```ts
const fastify = container.resolve(TOKENS.FASTIFY)

fastify.register(myPlugin)
```

Fastify plugins can provide routes, decorators, hooks, and other server
functionality. Fastify's `register()` API also provides encapsulation between
plugin scopes.

This means existing Fastify ecosystem packages can continue to be used without
introducing a Xeno-specific plugin abstraction.

---

## HTTP/2 and HTTPS

Fastify configuration can be passed directly through `addFastify()`.

For example:

```ts
const app = new FastifyXenoBuilder<AppRegistry>()

app.addFastify((opts, config) => {
  opts.http2 = true,
  opts.https = {
    key: readFileSync('./server.key'),
    cert: readFileSync('./server.crt'),
  },
})

await app.start()
```

Fastify supports HTTP/2 through its native `http2` and `https` configuration.

---

## Application Composition

`@xeno-js/fastify` is intended to be used as the transport layer of a larger
Xeno.JS application.

A typical application can compose Xeno modules and Fastify together:

```ts
import { FastifyXenoBuilder } from '@xeno-js/fastify'
import { withPostgresql } from '@xeno-js/postgresql'

const app = new FastifyXenoBuilder()

app
  .addDb(
    withPostgresql((opts, config) => {
      opts.connectionString = config.getOrThrow('DATABASE_URL')
    }),
  )
  .addFastify({
    logger: true,
  })

await app.start((opts, configuration) => {
  opts.port = configuration.getNumber('PORT', 3000)
})
```

The resulting architecture is:

```text
                    Application
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
 @xeno-js/postgresql              @xeno-js/fastify
          │                             │
          ▼                             ▼
      PostgreSQL                     Fastify
          │                             │
          └──────────────┬──────────────┘
                         ▼
                  @xeno-js/core
```

The database and HTTP transport remain infrastructure concerns around the
Xeno.JS application layer.

---

## Builder Lifecycle

`FastifyXenoBuilder` separates application construction from server startup.

```text
addFastify()
     │
     ▼
configure Fastify
     │
     ▼
build()
     │
     ▼
resolve FastifyInstance
     │
     ▼
start()
     │
     ▼
fastify.listen()
```

Calling `start()` automatically builds the application before listening.

```ts
await app.start()
```

This means applications do not need to call `build()` manually before starting
the server.

---

## Idempotent Configuration

`addFastify()` only configures Fastify once.

```ts
app
  .addFastify({
    logger: true,
  })
  .addFastify({
    logger: false,
  })
```

The second call does not reconfigure the Fastify module.

The same principle is applied to server startup: once the builder is already
listening, `start()` returns the existing Fastify instance rather than starting
another listener.

---

## Error Handling

If Fastify fails during startup, the builder logs the error through Fastify's
logger and terminates the process.

```ts
try {
  await fastify.listen(opts)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
```

Applications that require a different process-lifecycle strategy should consider
whether `start()` is the appropriate entry point or whether they should control
the Fastify lifecycle directly.

---

## What This Package Does

`@xeno-js/fastify` provides:

- Fastify integration with Xeno.JS.
- `FastifyXenoBuilder`.
- Fastify dependency registration in the Xeno.JS container.
- Typed `FASTIFY` registry support.
- Fastify server creation.
- Fastify server startup.
- Access to the native `FastifyInstance`.

---

## What This Package Does Not Do

`@xeno-js/fastify` does not attempt to replace Fastify.

It does not provide a second HTTP framework or replace Fastify's:

- routing
- plugins
- hooks
- logging
- validation
- serialization
- HTTP/2 support
- HTTPS support
- server configuration

Instead, it makes Fastify a first-class transport inside the Xeno.JS application
composition model.

This is consistent with Xeno.JS's architectural positioning: the HTTP framework
remains responsible for HTTP while Xeno.JS provides the application architecture
underneath it.

---

## Package API

The package exports:

```ts
export { FastifyXenoBuilder }
export type { XenoRegistry }
export * from '@xeno-js/core'
```

The primary API is:

### `FastifyXenoBuilder`

```ts
class FastifyXenoBuilder<
  TRegistry extends FastifyXenoRegistry = FastifyXenoRegistry
> extends AppBuilder<TRegistry>
```

### `addFastify()`

```ts
addFastify(
  opts: FastifyServerOptions
): this
```

Configures Fastify.

### `start()`

```ts
start(
  setupAction?: SetupAction<
    FastifyListenOptions,
    IConfigurationService
  >
): Promise<FastifyInstance>
```

Builds the application and starts Fastify.

### `XenoRegistry`

```ts
type XenoRegistry<TExtensions = object> = FastifyXenoRegistry &
  Readonly<Omit<TExtensions, keyof FastifyXenoRegistry>>
```

Provides an extensible application registry while preserving the
Fastify-specific registry contract.

---

## Requirements

- Node.js `>= 20`
- Xeno.JS Core `^3.0.0`
- Fastify `^5.12.5`
- TypeScript 5.x recommended

---

## Ecosystem

| Package               | Responsibility                                                                      |
| --------------------- | ----------------------------------------------------------------------------------- |
| `@xeno-js/core`       | Application architecture, DI, CQRS, modules, context and infrastructure composition |
| `@xeno-js/shared`     | Shared domain and application primitives                                            |
| `@xeno-js/fastify`    | Fastify HTTP transport integration                                                  |
| `@xeno-js/postgresql` | PostgreSQL integration                                                              |
| `@xeno-js/vue`        | Vue application integration                                                         |
| `@xeno-js/cli`        | Project scaffolding and code generation                                             |

Xeno.JS is designed around explicit application boundaries while allowing the
application to keep the HTTP framework and infrastructure it already uses.

---

## Why Fastify?

Fastify remains responsible for the HTTP layer.

Xeno.JS provides the application architecture around it:

```text
Fastify
   │
   │ HTTP
   ▼
Transport boundary
   │
   ▼
Xeno.JS Application
   │
   ├── Commands
   ├── Queries
   ├── Services
   ├── Pipelines
   ├── Repositories
   └── Domain
```

This separation allows Fastify-specific concerns to remain at the transport
boundary while application logic remains organized around Xeno.JS's explicit
architecture.

---

## License

MIT
