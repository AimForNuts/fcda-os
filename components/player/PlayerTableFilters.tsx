'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  searchValue: string
  onSearchChange: (value: string) => void
}

export function PlayerTableFilters({
  searchValue,
  onSearchChange,
}: Props) {
  return (
    <div className="mb-4">
      <div className="space-y-1.5">
        <Label htmlFor="player-search">Nome</Label>
        <Input
          id="player-search"
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Procurar jogador..."
        />
      </div>
    </div>
  )
}
