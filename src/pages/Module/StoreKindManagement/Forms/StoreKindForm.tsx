import { Form } from 'devextreme-react/data-grid';
import { Item} from 'devextreme-react/form';

type StoreFormProps = {
  isUpdate: boolean;
};

export function StoreKindForm({isUpdate }: StoreFormProps) {
  return (
    <Form colCount={2}>
      
      <Item dataField="STORE_KIND_CD" colSpan={2}
        editorOptions={{
        validationMessageMode: "always",
      }}
      >
      </Item>
      <Item dataField="STORE_KIND_NM_VIET" colSpan={2}
          editorOptions={{
          validationMessageMode: "always",
        }}
      >

      </Item>
      <Item dataField="STORE_KIND_NM_ENG" colSpan={2} />
      <Item dataField="STORE_KIND_NM_KOR" colSpan={2} />
      <Item dataField="STORE_KIND_NM_CHINA" colSpan={2} />
    </Form>
  );
}
