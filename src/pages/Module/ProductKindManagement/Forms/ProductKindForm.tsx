import { Form } from 'devextreme-react/data-grid';
import { Item  } from 'devextreme-react/form';

export function ProductKindForm() {
  return (
    <Form colCount={2}>
      <Item dataField="PRODUCT_KIND_CD" ></Item>
      <Item dataField="REMARK" />
      <Item dataField="PRODUCTKIND_NM" colSpan={2} />
      <Item dataField="PRODUCTKIND_NM_ENG" colSpan={2} />
      <Item dataField="PRODUCTKIND_NM_KOR" colSpan={2} />
    </Form>
  );
}
