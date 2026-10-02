import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}
const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(event: any, reason: Reason) {
  const recipient = String(event?.data?.recipient ?? '').toLowerCase()
  if (!recipient) return

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email: recipient, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to record suppression', {
      code: suppressError.code, message: suppressError.message, event_id: event.event_id,
    })
    throw new Error('Failed to record suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: recipient,
    status: STATUS[reason],
    error_message: MESSAGE[reason],
    metadata: null,
  })
  if (logError) {
    console.error('Failed to log email event', {
      code: logError.code, message: logError.message, event_id: event.event_id,
    })
    throw new Error('Failed to log email event')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => record(event, 'bounce'),
    'email.complaint': async (event) => record(event, 'complaint'),
    'email.unsubscribed': async (event) => record(event, 'unsubscribe'),
  },
})

Deno.serve((req) => handler(req))
