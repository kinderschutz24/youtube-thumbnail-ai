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

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header')
  }

  let event: Stripe.Event

  try {
    const buf = await buffer(req)

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const userId = session.metadata?.user_id

      if (!userId) {
        console.warn('Missing user_id in session metadata - event skipped')
        return res.status(200).json({ received: true, skipped: 'missing user_id' })
      }

      if (!subscriptionId) {
        console.error('Missing subscriptionId in checkout session')
        return res.status(400).send('Missing subscriptionId')
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Supabase upsert error:', error)
        return res.status(500).send('Supabase upsert failed')
      }

      console.log('Subscription saved/updated successfully')
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('Supabase update error:', error)
        return res.status(500).send('Supabase update failed')
      }

      console.log('Subscription updated successfully')
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('Supabase cancel update error:', error)
        return res.status(500).send('Supabase cancel update failed')
      }

      console.log('Subscription cancelled successfully')
    }

    return res.status(200).json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return res.status(500).send('Internal Server Error')
  }
}
