
import type { FastifyError, FastifyInstance } from 'fastify'

type SQLiteError = Error & {
  code: string
}

function isSQLiteError(error: unknown): error is SQLiteError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('SQLITE_CONSTRAINT')
  )
}

const sqliteErrors: Record<
  string,
  { status: number; message: string }
> = {
  SQLITE_CONSTRAINT_UNIQUE: {
    status: 409,
    message: 'Record already exists',
  },

  SQLITE_CONSTRAINT_PRIMARYKEY: {
    status: 409,
    message: 'Record already exists',
  },

  SQLITE_CONSTRAINT_FOREIGNKEY: {
    status: 409,
    message: 'Related record not found or cannot be modified',
  },

  SQLITE_CONSTRAINT_NOTNULL: {
    status: 400,
    message: 'Required field is missing',
  },

  SQLITE_CONSTRAINT_CHECK: {
    status: 400,
    message: 'Invalid field value',
  },
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (isSQLiteError(error)) {
      const result = sqliteErrors[error.code]

      if (result) {
        return reply.code(result.status).send({
          message: result.message,
        })
      }
    }

    const status = error.statusCode ?? 500

    if (status >= 500) {
      request.log.error({ err: error }, 'Request failed')
    }

    return reply.code(status).send({
      message: status >= 500
        ? 'Internal server error'
        : error.message,
    })
  })
}
