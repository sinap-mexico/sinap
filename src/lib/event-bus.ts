import { useSinapStore, type SinapEvent } from './sinap-store'

type AgentName = 'desk' | 'flow' | 'bill' | 'grow' | 'sight' | 'hub'

type EventBusCallback = (events: SinapEvent[]) => void

class SinapEventBus {
  private subscribers: Map<string, EventBusCallback[]> = new Map()
  private pollInterval: ReturnType<typeof setInterval> | null = null

  // Emit an event via the API and update Zustand store
  async emit(
    clinicId: string,
    eventType: string,
    sourceAgent: string,
    targetAgent?: string,
    payload?: string
  ) {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          eventType,
          sourceAgent,
          targetAgent: targetAgent || null,
          payload: payload || '{}',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const event: SinapEvent = {
          id: data.event.id,
          eventType,
          sourceAgent,
          targetAgent,
          payload: payload || '{}',
          createdAt: new Date().toISOString(),
        }

        // Update Zustand store
        useSinapStore.getState().addRecentEvent(event)

        // Notify subscribers
        this.notifySubscribers(targetAgent as AgentName)

        return event
      }
    } catch (error) {
      console.error('EventBus emit error:', error)
      // Still add to local store even if API fails
      const event: SinapEvent = {
        id: `local_${Date.now()}`,
        eventType,
        sourceAgent,
        targetAgent,
        payload: payload || '{}',
        createdAt: new Date().toISOString(),
      }
      useSinapStore.getState().addRecentEvent(event)
    }
    return null
  }

  // Subscribe an agent to receive events
  subscribe(agent: AgentName, callback: EventBusCallback) {
    if (!this.subscribers.has(agent)) {
      this.subscribers.set(agent, [])
    }
    this.subscribers.get(agent)!.push(callback)

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(agent)
      if (subs) {
        const index = subs.indexOf(callback)
        if (index > -1) subs.splice(index, 1)
      }
    }
  }

  // Poll for pending events for an agent
  async fetchPendingEvents(clinicId: string, agent: AgentName) {
    try {
      const response = await fetch(`/api/events?clinicId=${clinicId}&agent=${agent}`)
      if (response.ok) {
        const data = await response.json()
        return data.events as SinapEvent[]
      }
    } catch (error) {
      console.error('EventBus fetch error:', error)
    }
    return []
  }

  // Mark an event as processed
  async markProcessed(eventId: string, status: 'processed' | 'failed' = 'processed') {
    try {
      await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status }),
      })
    } catch (error) {
      console.error('EventBus markProcessed error:', error)
    }
  }

  // Notify subscribers for an agent
  private notifySubscribers(targetAgent?: AgentName) {
    if (targetAgent) {
      const subs = this.subscribers.get(targetAgent)
      if (subs) {
        const events = useSinapStore.getState().recentEvents
        subs.forEach((cb) => cb(events))
      }
    }
    // Also notify 'all' subscribers
    const allSubs = this.subscribers.get('all')
    if (allSubs) {
      const events = useSinapStore.getState().recentEvents
      allSubs.forEach((cb) => cb(events))
    }
  }

  // Start polling for events
  startPolling(clinicId: string, agent: AgentName, intervalMs = 30000) {
    this.stopPolling()
    this.pollInterval = setInterval(async () => {
      const events = await this.fetchPendingEvents(clinicId, agent)
      if (events.length > 0) {
        events.forEach((event) => {
          useSinapStore.getState().addRecentEvent(event)
        })
        this.notifySubscribers(agent)
      }
    }, intervalMs)
  }

  // Stop polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }
}

// Singleton instance
export const eventBus = new SinapEventBus()
