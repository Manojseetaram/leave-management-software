import AppTopbar from '../common/AppTopbar'

interface FacultyTopbarProps {
  onMenuClick: () => void
}

export default function FacultyTopbar({ onMenuClick }: FacultyTopbarProps) {
  return <AppTopbar title="Faculty Portal" onMenuClick={onMenuClick} />
}
