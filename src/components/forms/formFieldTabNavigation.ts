import TabPanel from 'devextreme/ui/tab_panel'
import type dxForm from 'devextreme/ui/form'

export type FormFieldTabStep = {
  field: string
  formTabIndex: number
}

function setFormTabIndex(
  form: dxForm,
  tabIndex: number,
  tabPanelSelector: string,
): Promise<void> {
  const tabPanelElement = form.element().querySelector(tabPanelSelector)
  if (!tabPanelElement) {
    return Promise.resolve()
  }

  const tabPanel = TabPanel.getInstance(tabPanelElement)
  if (!tabPanel) {
    return Promise.resolve()
  }

  if (tabPanel.option('selectedIndex') === tabIndex) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    tabPanel.option('selectedIndex', tabIndex)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function focusFormEditor(form: dxForm, fieldName: string, attempt = 0): void {
  const editor = form.getEditor(fieldName) as { focus?: () => void; close?: () => void } | undefined

  if (!editor && attempt < 4) {
    window.requestAnimationFrame(() => focusFormEditor(form, fieldName, attempt + 1))
    return
  }

  editor?.close?.()
  editor?.focus?.()

  const fieldItem = form.element().querySelector(
    `.dx-field-item[data-field='${fieldName}'], .dx-field-${fieldName}`,
  )

  const editorInput = fieldItem?.querySelector(
    'input.dx-texteditor-input, textarea.dx-texteditor-input',
  ) as HTMLInputElement | HTMLTextAreaElement | null

  if (editorInput) {
    editorInput.focus()
    editorInput.select?.()
    return
  }

  editor?.focus?.()
}

async function focusFormFieldStep(
  form: dxForm,
  step: FormFieldTabStep,
  tabPanelSelector: string,
): Promise<void> {
  await setFormTabIndex(form, step.formTabIndex, tabPanelSelector)

  window.requestAnimationFrame(() => {
    focusFormEditor(form, step.field)
  })
}

function findStepIndex(fieldTabOrder: readonly FormFieldTabStep[], dataField: string): number {
  return fieldTabOrder.findIndex((step) => step.field === dataField)
}

function isFormEditableTarget(target: EventTarget | null, formRoot: HTMLElement): target is HTMLElement {
  if (!(target instanceof HTMLElement) || !formRoot.contains(target)) {
    return false
  }

  return (
    target.matches('input.dx-texteditor-input, textarea.dx-texteditor-input') ||
    Boolean(target.closest('.dx-texteditor'))
  )
}

function resolveActiveFormField(formRoot: HTMLElement, fallbackField?: string | null): string | null {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && formRoot.contains(activeElement)) {
    const fieldItemWithAttr = activeElement.closest('.dx-field-item[data-field]')
    const dataFieldAttr = fieldItemWithAttr?.getAttribute('data-field')
    if (dataFieldAttr) {
      return dataFieldAttr
    }

    const namedInput = activeElement.closest('[name]')
    const inputName =
      (namedInput instanceof HTMLElement ? namedInput.getAttribute('name') : null) ||
      (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
        ? activeElement.name
        : '')
    if (inputName) {
      return inputName
    }

    const fieldItem = activeElement.closest('.dx-field-item')
    if (fieldItem) {
      const namedEditor = fieldItem.querySelector('[name]')
      const editorName = namedEditor?.getAttribute('name')
      if (editorName) {
        return editorName
      }
    }
  }

  return fallbackField ?? null
}

export function attachFormFieldTabNavigation({
  formRoot,
  getForm,
  tabPanelSelector,
  fieldTabOrder,
}: {
  formRoot: HTMLElement
  getForm: () => dxForm | null | undefined
  tabPanelSelector: string
  fieldTabOrder: readonly FormFieldTabStep[]
}): () => void {
  const handleKeyDown = (nativeEvent: KeyboardEvent) => {
    if (nativeEvent.key !== 'Tab') {
      return
    }

    if (!isFormEditableTarget(nativeEvent.target, formRoot)) {
      return
    }

    const form = getForm()
    if (!form) {
      return
    }

    const activeField = resolveActiveFormField(formRoot)
    if (!activeField) {
      return
    }

    const currentIndex = findStepIndex(fieldTabOrder, activeField)
    if (currentIndex < 0) {
      return
    }

    const delta = nativeEvent.shiftKey ? -1 : 1
    const nextIndex = currentIndex + delta

    // At first/last field: let browser Tab leave the form (do not wrap to other tabs).
    if (nextIndex < 0 || nextIndex >= fieldTabOrder.length) {
      return
    }

    nativeEvent.preventDefault()
    nativeEvent.stopPropagation()
    nativeEvent.stopImmediatePropagation?.()

    const currentEditor = form.getEditor(activeField) as { close?: () => void } | undefined
    currentEditor?.close?.()

    void focusFormFieldStep(form, fieldTabOrder[nextIndex], tabPanelSelector)
  }

  formRoot.addEventListener('keydown', handleKeyDown, true)

  return () => {
    formRoot.removeEventListener('keydown', handleKeyDown, true)
  }
}
