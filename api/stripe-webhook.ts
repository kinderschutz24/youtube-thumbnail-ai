import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed')
  }

  const sig = req.headers['stripe-signature']
  const buf = await buffer(req)

  let event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // 🎯 Checkout completed (Trial oder Abo gestartet)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const userId = session.metadata?.user_id

    if (!userId) {
      console.error('No user_id in metadata')
      return res.status(400).send('Missing user_id')
    }

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      updated_at: new Date(),
    })

    console.log('Subscription saved/updated')
  }

  // 🎯 Abo Status geändert
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription

    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000),
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        updated_at: new Date(),
      })
      .eq('stripe_subscription_id', subscription.id)
  }

  // 🎯 Kündigung
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription

    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date(),
      })
      .eq('stripe_subscription_id', subscription.id)
  }

  res.status(200).json({ received: true })
}
