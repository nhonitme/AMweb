import type { FormFieldTabStep } from '@/components/forms/formFieldTabNavigation'

export const FIXED_ASSET_FORM_TAB_PANEL_SELECTOR = '.fixed-asset-form-tabs--compact .dx-tabpanel'

export const FIXED_ASSET_FORM_FIELD_TAB_ORDER: readonly FormFieldTabStep[] = [
  { field: 'ASSET_CD', formTabIndex: 0 },
  { field: 'ASSET_NM', formTabIndex: 0 },
  { field: 'ACC_CD', formTabIndex: 0 },
  { field: 'ORIGINAL_AMT', formTabIndex: 0 },
  { field: 'STATUS', formTabIndex: 0 },
  { field: 'RECEIVE_YMD', formTabIndex: 0 },
  { field: 'USE_START_YMD', formTabIndex: 0 },
  { field: 'ACQ_CHIT_NO', formTabIndex: 0 },
  { field: 'NOTE', formTabIndex: 0 },
  { field: 'USEFUL_LIFE_MONTH', formTabIndex: 1 },
  { field: 'ACCUM_DEPRE_AMT', formTabIndex: 1 },
  { field: 'FIRST_DEPRE_AMT', formTabIndex: 1 },
  { field: 'NORMAL_DEPRE_AMT', formTabIndex: 1 },
  { field: 'LAST_DEPRE_AMT', formTabIndex: 1 },
]
