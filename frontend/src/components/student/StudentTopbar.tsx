import AppTopbar from '../common/AppTopbar'

interface StudentTopbarProps {
  onMenuClick: () => void
}

export default function StudentTopbar({ onMenuClick }: StudentTopbarProps) {
  return <AppTopbar title="Leave Management — Student" onMenuClick={onMenuClick} />
}
