import { Form } from 'devextreme-react/data-grid';
import { Item  } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';

export function ProductUnitForm() {
  return (
    <Form colCount={2}>
      <Item dataField="UNIT_CD" editorOptions={createOutlinedEditorOptions()}></Item>
      <Item/>
      <Item dataField="UNIT_NM" colSpan={2} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
};
