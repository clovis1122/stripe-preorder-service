const Joi = require('@hapi/joi')
const Hoek = require('@hapi/hoek')
const debug = require('debug')('pay-order')
const Stripe = require('stripe')

const LookupAccount = require('../utils/lookup-account')

let stripe = Stripe(process.env.STRIPE_KEY)

const schema = Joi.object().keys({
  jwt: Joi.string().required(),
  orderId: Joi.string().required(),
})

module.exports.pay_order = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  console.log('has account')

  console.log(event.body)
  try {
    const valid = Joi.attempt(JSON.parse(event.body), schema)

    const accountInfo = await LookupAccount(valid.jwt)

    if (!accountInfo.customerId) {
      throw new Error('no stripe customer')
    }
    if (!accountInfo.emailVerified) {
      throw new Error('not verified')
    }

    debug(
      'paying order',
      valid.orderId,
      accountInfo.customerId,
      accountInfo.email
    )

    const order = await stripe.orders.pay(valid.orderId, {
      customer: accountInfo.customerId,
    })

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify({
        orderId: order.id,
        order: order,
      }),
    }
  } catch (e) {
    debug(e)
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify({
        error: 'There was an error while paying the order.',
      }),
    }
  }
}
