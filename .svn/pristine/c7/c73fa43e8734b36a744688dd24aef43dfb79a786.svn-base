import type { MutableRefObject, ReactNode } from "react"

import Form, { GroupItem } from "devextreme-react/form"

import type { VoucherFieldChangeEvent, VoucherFormData } from "../types"

interface BaseVoucherFormProps {
  children: ReactNode
  formData: VoucherFormData
  onFieldDataChanged: (event: VoucherFieldChangeEvent) => void
  formRef?: MutableRefObject<any | null>
  sidebar: ReactNode
}

export function BaseVoucherForm({
  children,
  formData,
  onFieldDataChanged,
  formRef,
  sidebar,
}: BaseVoucherFormProps) {
  return (
    <Form
      ref={formRef}
      formData={formData}
      labelLocation="top"
      colCount={1}
      onFieldDataChanged={onFieldDataChanged}
    >
      <GroupItem
        colCount={4}
        colCountByScreen={{ xs: 1, sm: 1, md: 4, lg: 4 }}
        cssClass="voucher-form-shell"
      >
        <GroupItem colSpan={3} colCount={1} cssClass="voucher-form-main">
          {children}
        </GroupItem>
        <GroupItem colSpan={1} colCount={1} cssClass="voucher-form-sidebar">
          {sidebar}
        </GroupItem>
      </GroupItem>
    </Form>
  )
}

export default BaseVoucherForm
