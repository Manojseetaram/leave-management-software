import AppTopbar from '../common/AppTopbar'

interface FacultyTopbarProps {
  onMenuClick: () => void
}

export default function FacultyTopbar({ onMenuClick }: FacultyTopbarProps) {
  return <AppTopbar title="Leave Management — Faculty" onMenuClick={onMenuClick} />
}
