import { Context } from '@netlify/functions'

import getTestHelloWorldString from 'netlify/model/hello-world-test'

export default (request: Request, context: Context) => {
  try {
    const url = new URL(request.url)
    const subject = url.searchParams.get('name') || 'World'

    return new Response(
      // `Hello ${subject}`
      getTestHelloWorldString()
    )
  } catch (error) {
    return new Response(error.toString(), {
      status: 500,
    })
  }
}
