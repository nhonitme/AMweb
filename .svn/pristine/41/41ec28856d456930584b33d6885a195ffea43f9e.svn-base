import { Form } from 'devextreme-react/data-grid';
import { Item } from 'devextreme-react/form';

type StoreFormProps = {
  lblKind: string;
  lblChoose: string;
  isUpdate: boolean;
  data: { VALUE: string; TEXT: string }[];
};

export function StoreForm({lblKind, lblChoose, isUpdate, data }: StoreFormProps) {
  return (
    <Form colCount={2}>
       {<Item dataField="STORE_KIND_ID"
        editorType="dxSelectBox" 
        label={{ text: lblKind }}
        editorOptions={{
          dataSource: data,
          valueExpr: "VALUE",
          displayExpr: "TEXT",
          searchEnabled: true,
          placeholder: lblChoose,
          showClearButton: true,
          value: undefined,
        }}
       >
        
      </Item>}

      <Item dataField="STORE_CD"
        editorOptions={{ validationMessageMode: "always" }}
      >
      </Item>

      <Item dataField="STORE_NM_VIET" colSpan={2} 
        editorOptions={{ validationMessageMode: "always" }}
      >
      </Item>

      <Item dataField="STORE_NM_ENG" colSpan={2} />
      <Item dataField="STORE_NM_KOR" colSpan={2} />
      <Item dataField="STORE_NM_CHINA" colSpan={2} />
    </Form>
  );
}
