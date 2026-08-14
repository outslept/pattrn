import app from './src/app.js'
import { serve } from '@hono/node-server'
import 'dotenv/config'

const port = parseInt(process.env.PORT || '8080', 10)
serve({ fetch: app.fetch, port })
