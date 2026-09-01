import { EventEmitter } from "node:events"
import type { FeedEvent } from "./events.ts"

// Single in-process emitter, fanned out to SSE clients in server.ts (Phase 3).
// No external broker — deliberately, per the "no queues" scope decision.
class Feed extends EventEmitter {
  publish(event: FeedEvent) {
    this.emit("event", event)
  }
}

export const feed = new Feed()
