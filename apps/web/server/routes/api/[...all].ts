import { fromNodeMiddleware } from 'h3'
import { createApp } from '../../../../api/src/app'

const apiApp = createApp()

export default fromNodeMiddleware(apiApp)
