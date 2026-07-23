import { fromNodeMiddleware } from 'h3'
import { createApp } from '../../apps/api/src/app'

const apiApp = createApp()

export default fromNodeMiddleware(apiApp)
