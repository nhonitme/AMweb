-- Language keys for ReportPdfExportPopup redesign.
-- Review and run manually against am_web_manager (do NOT auto-execute).
-- Table/columns follow existing language_info seed style in am_web_manager.sql.

-- Popup header title
INSERT INTO language_info (CODE, KOR, ENG, VIET, JPN, THAI, CHINA, REMARK, CREATE_DT, UPDATE_DT)
SELECT
  'REPORT_EXPORT_PDF_TITLE',
  'PDF 보고서 내보내기',
  'Export PDF report',
  'Xuất báo cáo PDF',
  'PDFレポート出力',
  'ส่งออกรายงาน PDF',
  '导出 PDF 报告',
  'Shared PDF export popup title',
  NOW(),
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM language_info WHERE CODE = 'REPORT_EXPORT_PDF_TITLE'
);

-- Popup header description
INSERT INTO language_info (CODE, KOR, ENG, VIET, JPN, THAI, CHINA, REMARK, CREATE_DT, UPDATE_DT)
SELECT
  'REPORT_EXPORT_PDF_DESCRIPTION',
  '내보내기 전에 정보를 설정하세요.',
  'Configure the details before exporting the report.',
  'Thiết lập thông tin trước khi xuất báo cáo.',
  'エクスポート前に情報を設定してください。',
  'ตั้งค่าข้อมูลก่อนส่งออกรายงาน',
  '导出报告前请先设置信息。',
  'Shared PDF export popup description',
  NOW(),
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM language_info WHERE CODE = 'REPORT_EXPORT_PDF_DESCRIPTION'
);

-- Print template field label
INSERT INTO language_info (CODE, KOR, ENG, VIET, JPN, THAI, CHINA, REMARK, CREATE_DT, UPDATE_DT)
SELECT
  'REPORT_PRINT_TEMPLATE',
  '보고서 양식',
  'Report template',
  'Mẫu báo cáo',
  'レポート様式',
  'แม่แบบรายงาน',
  '报表模板',
  'Shared PDF export popup print template label',
  NOW(),
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM language_info WHERE CODE = 'REPORT_PRINT_TEMPLATE'
);

-- Confirm / Check button (keep language key CONFIRM; seed if missing)
INSERT INTO language_info (CODE, KOR, ENG, VIET, JPN, THAI, CHINA, REMARK, CREATE_DT, UPDATE_DT)
SELECT
  'CONFIRM',
  '확인',
  'Check',
  'Kiểm tra',
  '確認',
  'ตรวจสอบ',
  '检查',
  'Shared confirm / check action',
  NOW(),
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM language_info WHERE CODE = 'CONFIRM'
);
