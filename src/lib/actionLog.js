import { supabase } from './supabase'

export async function logAction({ actorId, actorName, actorEmail, action, entityType, entityId, details }) {
  try {
    await supabase.from('action_log').insert({
      actor_id:    actorId    ?? null,
      actor_name:  actorName  ?? null,
      actor_email: actorEmail ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id:   entityId != null ? String(entityId) : null,
      details:     details    ?? null,
    })
  } catch {
    // Never crash the UI for a logging failure
  }
}
