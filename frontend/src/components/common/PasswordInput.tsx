import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import Input from './Input'

import type { InputProps } from './Input'

type PasswordInputProps = Omit<InputProps, 'type' | 'trailing'>

/**
 * A password field with a button that shows the text.
 *
 * The button is a real toggle, so it is reachable by keyboard and it tells
 * the reader what it will do through its label.
 */
export default function PasswordInput({ className = '', ...rest }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <Input
      {...rest}
      type={isVisible ? 'text' : 'password'}
      className={className}
      trailing={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  )
}
