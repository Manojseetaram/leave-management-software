import { Paperclip } from 'lucide-react'

import Callout from '../common/Callout'

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
    <Callout tone="neutral" icon={Paperclip} title="Supporting documents">
      Attaching a document — for example a medical certificate — is not available
      yet. The backend has no document endpoint, so a request can only be sent
      with the details below.
    </Callout>
  )
}
