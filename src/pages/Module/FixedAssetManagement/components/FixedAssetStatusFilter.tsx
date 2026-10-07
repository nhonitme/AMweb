import SelectBox from 'devextreme-react/select-box'
import { useMemo } from 'react'

import type { SysCode } from '@/api/sysCodeService'
import type { SysCodeTranslate } from '@/lib/sysCodeUtils'

import { getActiveFaStatusCodes, createFaStatusDisplayExpr } from '../fixedAssetStatus'

type FixedAssetStatusFilterProps = {
  value: string
  statusCodes: SysCode[]
  label: string
  placeholder?: string
  translate: SysCodeTranslate
  onValueChange: (value: string) => void
  variant?: 'default' | 'inline' | 'filter-bar'
  className?: string
}

export default function FixedAssetStatusFilter({
  value,
  statusCodes,
  label,
  placeholder,
  translate,
  onValueChange,
  variant = 'default',
  className,
}: FixedAssetStatusFilterProps) {
  const options = useMemo(
    () => getActiveFaStatusCodes(statusCodes),
    [statusCodes],
  )

  const displayExpr = useMemo(
    () => createFaStatusDisplayExpr(translate, options),
    [options, translate],
  )

  if (variant === 'inline' || variant === 'filter-bar') {
    return (
      <SelectBox
        className={className}
        dataSource={options}
        value={value || null}
        valueExpr="CODE_CD"
        displayExpr={displayExpr}
        width={variant === 'filter-bar' ? 220 : 200}
        stylingMode="outlined"
        label={label}
        labelMode="floating"
        searchEnabled
        searchExpr={['CODE_NAME', 'CODE_CD']}
        showClearButton
        placeholder={placeholder}
        onValueChanged={(event) => onValueChange(String(event.value ?? ''))}
      />
    )
  }

  return (
    <div className={`flex min-w-[180px] flex-col gap-1 ${className ?? ''}`.trim()}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <SelectBox
        dataSource={options}
        value={value || null}
        valueExpr="CODE_CD"
        displayExpr={displayExpr}
        width={200}
        stylingMode="outlined"
        searchEnabled
        searchExpr={['CODE_NAME', 'CODE_CD']}
        showClearButton
        placeholder={placeholder}
        onValueChanged={(event) => onValueChange(String(event.value ?? ''))}
      />
    </div>
  )
}
