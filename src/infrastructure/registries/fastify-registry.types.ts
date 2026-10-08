/* eslint-disable @typescript-eslint/naming-convention */
import type { ApplicationRegistry } from '@xeno-js/core'
import type { FastifyInstance } from 'fastify'

export interface FastifyXenoRegistry<
  TContext = unknown,
  TTransaction = unknown,
> extends ApplicationRegistry<TContext, TTransaction> {
  readonly FASTIFY: FastifyInstance
}

/**
 * @description The XenoRegistry type is an alias for the ApplicationRegistry specialized with DbContext. It represents the registry of application services and dependencies, specifically tailored for applications that utilize a database context. This type is used throughout the application to ensure consistent typing and to facilitate dependency injection and service resolution.
 * @author Xeno
 * @version 1.0.0
 * @since 2025-09-30
 * @link https://github.com/xeno-js/xeno-js
 */
export type XenoRegistry<TExtensions = object> = FastifyXenoRegistry &
  Readonly<Omit<TExtensions, keyof FastifyXenoRegistry>>
