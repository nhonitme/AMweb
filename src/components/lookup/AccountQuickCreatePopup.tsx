import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Button from 'devextreme-react/button'
import Form, { Item } from 'devextreme-react/form'
import Popup from 'devextreme-react/popup'
import type dxForm from 'devextreme/ui/form'
import notify from 'devextreme/ui/notify'

import { createAcclistInfo } from '@/api/acclistAPI'
import { getApiErrorMessage } from '@/api/apiTypes'
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions'
import { LanguageContext } from '@/lib/i18nLoader'
import { useSysCodes } from '@/lib/sysCodeContext'
import type { SysCode } from '@/api/sysCodeService'
import type { AcclistInfo } from '@/types/acclist'

type AccountQuickCreatePopupProps = {
  visible: boolean
  initialAccCd?: string
  onClose: () => void
  onSaved: (account: AcclistInfo) => void
}

const createDefaultDraft = (initialAccCd = ''): Partial<AcclistInfo> => ({
  ACC_CD: initialAccCd,
  ISABLETYPE: 1,
  ACCTITLE_NM_VIET: '',
  ACCTITLE_NM_ENG: '',
  ACCTITLE_NM_KOR: '',
  ACCTITLE_NM_CHINA: '',
})

export default function AccountQuickCreatePopup({
  visible,
  initialAccCd = '',
  onClose,
  onSaved,
}: AccountQuickCreatePopupProps) {
  const formRef = useRef<dxForm | null>(null)
  const [draft, setDraft] = useState<Partial<AcclistInfo>>(() => createDefaultDraft(initialAccCd))
  const [saving, setSaving] = useState(false)
  const { getCodesByType } = useSysCodes()

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const accTypeData = useMemo(() => {
    try {
      const sysCodes = getCodesByType('ACC_ISABLETYPE')
      return sysCodes.map((item: SysCode) => ({
        VALUE: Number(item.CODE_CD ?? 1),
        TEXT: String(translate ? translate(item.CODE_NAME ?? '') : item.CODE_NAME ?? ''),
      }))
    } catch {
      return []
    }
  }, [getCodesByType, translate])

  useEffect(() => {
    if (!visible) {
      return
    }

    setDraft(createDefaultDraft(initialAccCd))
  }, [initialAccCd, visible])

  const handleSaveAndSelect = useCallback(async () => {
    const validationResult = formRef.current?.instance().validate()
    if (validationResult && !validationResult.isValid) {
      return
    }

    setSaving(true)

    try {
      const response = await createAcclistInfo(draft)
      const created =
        (response.Data as AcclistInfo | undefined) ??
        (response.data as AcclistInfo | undefined) ??
        ({
          ...draft,
          ACC_ID: Number((response as { ACC_ID?: number }).ACC_ID ?? draft.ACC_ID ?? 0),
        } as AcclistInfo)

      if (!created.ACC_CD?.trim()) {
        throw new Error(t('MSG_MUST_ITEM', 'Vui lòng nhập mã tài khoản.'))
      }

      notify(t('MSG_INSERT_SUCCESS', 'Thêm tài khoản thành công.'), 'success', 2500)
      onSaved(created)
      onClose()
    } catch (error) {
      notify(
        getApiErrorMessage(error, t('MSG_INSERT_ERROR', 'Thêm tài khoản thất bại.')),
        'error',
        3000,
      )
    } finally {
      setSaving(false)
    }
  }, [draft, onClose, onSaved, t])

  return (
    <Popup
      visible={visible}
      title={t('ADD_ACCOUNT', 'Thêm tài khoản mới')}
      showTitle
      width={720}
      maxWidth="95vw"
      height="auto"
      dragEnabled={false}
      hideOnOutsideClick={!saving}
      onHiding={() => {
        if (!saving) {
          onClose()
        }
      }}
    >
      <div className="flex flex-col gap-3 p-1">
        <Form
          ref={formRef}
          formData={draft}
          colCount={2}
          labelLocation="top"
          onFieldDataChanged={(event) => {
            if (typeof event.dataField !== 'string') {
              return
            }

            setDraft((current) => ({
              ...current,
              [event.dataField as keyof AcclistInfo]: event.value,
            }))
          }}
        >
          <Item
            dataField="ACC_CD"
            label={{ text: t('ACC_CD', 'Mã tài khoản') }}
            editorOptions={createOutlinedEditorOptions({ validationMessageMode: 'always' })}
            validationRules={[
              { type: 'required', message: t('MSG_MUST_ITEM', 'Vui lòng nhập mã tài khoản.') },
            ]}
          />
          <Item
            dataField="ISABLETYPE"
            label={{ text: t('ACC_TYPE', 'Loại tài khoản') }}
            editorType="dxSelectBox"
            editorOptions={createOutlinedEditorOptions({
              dataSource: accTypeData,
              valueExpr: 'VALUE',
              displayExpr: 'TEXT',
              searchEnabled: true,
              placeholder: t('lblChoose', 'Chọn'),
              showClearButton: true,
              validationMessageMode: 'always',
            })}
          />
          <Item
            dataField="ACCTITLE_NM_VIET"
            label={{ text: t('ACCTITLE_NM_VIET', 'Tên tiếng Việt') }}
            colSpan={2}
            editorOptions={createOutlinedEditorOptions({ validationMessageMode: 'always' })}
            validationRules={[
              { type: 'required', message: t('MSG_MUST_ITEM', 'Vui lòng nhập tên tài khoản.') },
            ]}
          />
          <Item
            dataField="ACCTITLE_NM_ENG"
            label={{ text: t('ACCTITLE_NM_ENG', 'Tên tiếng Anh') }}
            colSpan={2}
            editorOptions={createOutlinedEditorOptions()}
          />
          <Item
            dataField="ACCTITLE_NM_KOR"
            label={{ text: t('ACCTITLE_NM_KOR', 'Tên tiếng Hàn') }}
            colSpan={2}
            editorOptions={createOutlinedEditorOptions()}
          />
          <Item
            dataField="ACCTITLE_NM_CHINA"
            label={{ text: t('ACCTITLE_NM_CHINA', 'Tên tiếng Trung') }}
            colSpan={2}
            editorOptions={createOutlinedEditorOptions()}
          />
        </Form>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <Button
            text={t('CANCEL', 'Hủy')}
            stylingMode="outlined"
            disabled={saving}
            onClick={onClose}
          />
          <Button
            text={t('SAVE_AND_SELECT', 'Lưu và chọn')}
            type="default"
            stylingMode="contained"
            disabled={saving}
            onClick={() => {
              void handleSaveAndSelect()
            }}
          />
        </div>
      </div>
    </Popup>
  )
}
