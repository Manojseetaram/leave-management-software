import { Paperclip } from 'lucide-react'

/**
 * Supporting documents cannot be attached yet.
 *
 * The backend exposes no document endpoint — uploading, storing and
 * downloading evidence is a later phase of the backend plan and is not in
 * the router. The gap is kept in this single component so it is visible
 * without leaking into the behaviour of the form.
 */
export default function DocumentsNotice() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4">
      <div className="flex items-start gap-3">
        <Paperclip
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />

        <div>
          <p className="text-sm font-medium text-foreground">Supporting documents</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Attaching a document — for example a medical certificate — is not available
            yet. The backend has no document endpoint, so a request can only be sent
            with the details below.
          </p>
        </div>
      </div>
    </div>
  )
}
