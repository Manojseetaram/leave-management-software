import AppTopbar from '../common/AppTopbar'

interface HodTopbarProps {
  onMenuClick: () => void
}

export default function HodTopbar({ onMenuClick }: HodTopbarProps) {
  return <AppTopbar title="Leave Management — HOD" onMenuClick={onMenuClick} />
}
