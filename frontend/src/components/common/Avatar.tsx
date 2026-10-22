interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

/**
 * The initials of a name.
 *
 * A single word gives its first two letters, a longer name gives the first
 * letter of the first and the last word.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/**
 * The colour of an avatar.
 *
 * It is derived from the name, so the same person keeps the same colour
 * everywhere in the application.
 */
const TONE_CLASSES = [
  'bg-brand-100 text-brand-800',
  'bg-status-approved-soft text-status-approved',
  'bg-status-pending-soft text-status-pending',
  'bg-status-changes-soft text-status-changes',
  'bg-status-completed-soft text-status-completed',
  'bg-status-draft-soft text-status-draft',
]

function toneOf(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 100000
  }

  return TONE_CLASSES[hash % TONE_CLASSES.length]
}

/** The initials of a person in a coloured circle. */
export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none ${SIZE_CLASSES[size]} ${toneOf(name)} ${className}`}
    >
      {initialsOf(name)}
    </span>
  )
}
