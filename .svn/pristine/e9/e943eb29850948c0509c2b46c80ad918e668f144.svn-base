
export const materialGroupFormConfig = {
  title: 'Thông tin nhóm vật tư',
  fields: [
    // PRODUCTKIND_CD is auto-generated, not shown in add form
    { id: 'PRODUCTKIND_NM', name: 'PRODUCTKIND_NM', label: 'Tên nhóm vật tư', type: 'text', required: true },
    { id: 'PRODUCTKIND_NM_ENG', name: 'PRODUCTKIND_NM_ENG', label: 'Tên nhóm vật tư (ENG)', type: 'text', required: false },
    { id: 'PRODUCTKIND_NM_KOR', name: 'PRODUCTKIND_NM_KOR', label: 'Tên nhóm vật tư (KOR)', type: 'text', required: false },
    { id: 'REMARK', name: 'REMARK', label: 'Ghi chú', type: 'textarea', required: false },
    { id: 'COUNT', name: 'COUNT', label: 'Số lượng', type: 'number', required: false },
  ],
  validationRules: {
    PRODUCTKIND_NM: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = [];
      if (value) {
        // Check for duplicate material group name (ignore case, trim)
        const duplicateItem = existingData.find(
          (item) => item.PRODUCTKIND_NM && item.PRODUCTKIND_NM.trim().toLowerCase() === value.trim().toLowerCase() && item.id !== formData.id
        );
        if (duplicateItem) {
          errors.push(`Tên nhóm vật tư "${value}" đã tồn tại trong hệ thống`);
        }
      }
      return errors;
    },
  },
};

export default materialGroupFormConfig;
