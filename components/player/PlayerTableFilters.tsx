'use client'

import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  return (
    <div className="mb-4">
      <div className="space-y-1.5">
        <Label htmlFor="player-search">{t('players.nameLabel')}</Label>
        <Input
          id="player-search"
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('players.searchPlaceholder')}
        />
      </div>
    </div>
  )
}
