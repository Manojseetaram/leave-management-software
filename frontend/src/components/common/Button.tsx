import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  /** Renders the button as a router link instead of a <button>. */
  to?: string
  /** Stretches the button across the width of its container. */
  fullWidth?: boolean
  children?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-xs hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
  success:
    'bg-success text-success-foreground shadow-xs hover:brightness-95 active:brightness-90',
  danger:
    'bg-destructive text-destructive-foreground shadow-xs hover:brightness-95 active:brightness-90',
  outline:
    'border border-border bg-card text-foreground hover:bg-muted hover:text-foreground',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

/**
 * The button of the whole interface.
 *
 * The focus indicator comes from the shared outline in the base layer, so
 * every button in the application reacts to the keyboard in the same way.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  to,
  fullWidth = false,
  ...rest
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,color,box-shadow,filter] duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`

  const spinner = isLoading ? (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  ) : null

  if (to) {
    return (
      <Link to={to} className={classes} aria-busy={isLoading || undefined}>
        {spinner}
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
      {...rest}
    >
      {spinner}
      {children}
    </button>
  )
}
