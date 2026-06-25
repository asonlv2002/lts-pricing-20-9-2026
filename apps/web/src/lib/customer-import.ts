import * as XLSX from 'xlsx';
import { kiemTraMaKhachHang } from './customer-api';

export const MAX_IMPORT_ROWS = 500;

export interface ImportRowInput {
  customerCode: string;
  customerType: 'company' | 'individual';
  companyName: string;
  contactName: string;
  taxCode: string;
  address: string;
  invoiceAddress: string;
  phone: string;
  email: string;
  customerGroup: string;
  notes: string;
  contactNotes: string;
  assignmentNote: string;
}

export type ImportRowStatus = 'ok' | 'duplicate_code' | 'duplicate_name_phone' | 'missing_fields' | 'invalid_code' | 'invalid_phone' | 'invalid_email';

export interface ImportRow {
  index: number;
  raw: ImportRowInput;
  status: ImportRowStatus;
  note: string;
  duplicateInfo?: string;
  selected: boolean;
}

export interface ImportStats {
  total: number;
  ok: number;
  duplicate: number;
  error: number;
  willImport: number;
}

const HEADER_MAP: Record<string, keyof ImportRowInput> = {
  'ma kh': 'customerCode',
  'ma khach hang': 'customerCode',
  'customer code': 'customerCode',
  'code': 'customerCode',
  'mã kh': 'customerCode',
  'mã khách hàng': 'customerCode',
  'loai': 'customerType',
  'loại': 'customerType',
  'type': 'customerType',
  'customer type': 'customerType',
  'ten cong ty': 'companyName',
  'ten khach hang': 'companyName',
  'ten doanh nghiep': 'companyName',
  'tên công ty': 'companyName',
  'tên khách hàng': 'companyName',
  'tên doanh nghiệp': 'companyName',
  'company name': 'companyName',
  'customer name': 'companyName',
  'organization': 'companyName',
  'ten lien he': 'contactName',
  'nguoi lien he': 'contactName',
  'tên liên hệ': 'contactName',
  'người liên hệ': 'contactName',
  'contact name': 'contactName',
  'contact': 'contactName',
  'ma so thue': 'taxCode',
  'mst': 'taxCode',
  'mã số thuế': 'taxCode',
  'tax code': 'taxCode',
  'tax': 'taxCode',
  'dia chi': 'address',
  'địa chỉ': 'address',
  'address': 'address',
  'dia chi xuat hd': 'invoiceAddress',
  'dia chi xuat hoa don': 'invoiceAddress',
  'địa chỉ xuất hđ': 'invoiceAddress',
  'địa chỉ xuất hóa đơn': 'invoiceAddress',
  'invoice address': 'invoiceAddress',
  'billing address': 'invoiceAddress',
  'sdt': 'phone',
  'dien thoai': 'phone',
  'so dien thoai': 'phone',
  'điện thoại': 'phone',
  'số điện thoại': 'phone',
  'phone': 'phone',
  'phone number': 'phone',
  'tel': 'phone',
  'email': 'email',
  'e-mail': 'email',
  'mail': 'email',
  'nhom kh': 'customerGroup',
  'nhom khach hang': 'customerGroup',
  'nhóm kh': 'customerGroup',
  'nhóm khách hàng': 'customerGroup',
  'customer group': 'customerGroup',
  'group': 'customerGroup',
  'ghi chu': 'notes',
  'ghi chú': 'notes',
  'notes': 'notes',
  'note': 'notes',
  'ghi chu lien he': 'contactNotes',
  'ghi chú liên hệ': 'contactNotes',
  'contact notes': 'contactNotes',
  'ghi chu phan cong': 'assignmentNote',
  'ghi chú phân công': 'assignmentNote',
  'assignment note': 'assignmentNote',
};

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function normalizeForDup(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

function cleanPhone(value: string): string {
  return value.replace(/\D/g, '');
}

function resolveCustomerType(value: string): 'company' | 'individual' {
  const norm = normalizeHeader(value);
  if (norm.includes('cn') || norm.includes('ca nhan') || norm.includes('cá nhân') || norm.includes('individual')) {
    return 'individual';
  }
  return 'company';
}

export function parseImportFile(buffer: ArrayBuffer, fileName: string): ImportRowInput[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (data.length < 2) return [];

  const headers = data[0].map((h: string) => normalizeHeader(String(h)));
  const fieldMap: (keyof ImportRowInput | null)[] = headers.map((h: string) => HEADER_MAP[h] ?? null);

  const rows: ImportRowInput[] = [];
  for (let i = 1; i < data.length && rows.length < MAX_IMPORT_ROWS; i++) {
    const row = data[i];

    const entry: ImportRowInput = {
      customerCode: '',
      customerType: 'company',
      companyName: '',
      contactName: '',
      taxCode: '',
      address: '',
      invoiceAddress: '',
      phone: '',
      email: '',
      customerGroup: '',
      notes: '',
      contactNotes: '',
      assignmentNote: '',
    };

    for (let col = 0; col < fieldMap.length; col++) {
      const field = fieldMap[col];
      if (field) {
        const val = String(row[col] ?? '').trim();
        if (field === 'customerType') {
          entry.customerType = resolveCustomerType(val);
        } else if (field === 'phone') {
          entry.phone = cleanPhone(val);
        } else {
          entry[field] = val;
        }
      }
    }

    if (!entry.customerCode.trim()) continue;
    if (entry.customerType === 'company' && !entry.companyName.trim()) continue;
    if (entry.customerType === 'individual' && !entry.contactName.trim()) continue;

    rows.push(entry);
  }

  return rows;
}

export function validateImportRow(row: ImportRowInput): { status: ImportRowStatus; note: string } {
  const missing: string[] = [];

  if (!row.customerCode.trim()) {
    missing.push('Mã KH');
  } else {
    const check = kiemTraMaKhachHang(row.customerCode);
    if (!check.hopLe) {
      return { status: 'invalid_code', note: check.loi ?? 'Mã KH không hợp lệ' };
    }
  }

  if (row.customerType === 'company') {
    if (!row.companyName.trim()) missing.push('Tên công ty');
  } else {
    if (!row.contactName.trim()) missing.push('Tên khách hàng');
  }

  if (!row.phone.trim()) {
    missing.push('SĐT');
  } else if (!/^\d{9,11}$/.test(row.phone)) {
    return { status: 'invalid_phone', note: `SĐT "${row.phone}" không hợp lệ (chỉ nhận số, 9-11 chữ số)` };
  }

  if (!row.email.trim()) {
    missing.push('Email');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    return { status: 'invalid_email', note: `Email "${row.email}" không đúng định dạng` };
  }

  if (missing.length > 0) {
    return { status: 'missing_fields', note: `Thiếu: ${missing.join(', ')}` };
  }

  return { status: 'ok', note: '' };
}

export function detectDuplicate(
  row: ImportRowInput,
  existingCustomers: { customerCode: string; companyName: string; phone: string }[],
): { status: 'ok' | 'duplicate_code' | 'duplicate_name_phone'; note: string; duplicateInfo?: string } {
  const check = kiemTraMaKhachHang(row.customerCode);
  const codeName = check.hopLe ? check.maKhachHang : row.customerCode.trim();

  const codeDup = existingCustomers.find(
    c => c.customerCode.toUpperCase() === codeName.toUpperCase(),
  );
  if (codeDup) {
    return {
      status: 'duplicate_code',
      note: `Mã KH ${codeDup.customerCode} đã tồn tại`,
      duplicateInfo: `Đã có: ${codeDup.companyName} (${codeDup.customerCode})`,
    };
  }

  const normName = normalizeForDup(row.companyName);
  const normPhone = cleanPhone(row.phone);
  if (normName && normPhone) {
    const namePhoneDup = existingCustomers.find(
      c => normalizeForDup(c.companyName) === normName && cleanPhone(c.phone) === normPhone,
    );
    if (namePhoneDup) {
      return {
        status: 'duplicate_name_phone',
        note: 'Trùng tên + SĐT',
        duplicateInfo: `Đã có: ${namePhoneDup.companyName} (${namePhoneDup.customerCode})`,
      };
    }
  }

  return { status: 'ok', note: '' };
}

export function processImportRows(
  rows: ImportRowInput[],
  existingCustomers: { customerCode: string; companyName: string; phone: string }[],
): ImportRow[] {
  return rows.map((raw, idx) => {
    const dup = detectDuplicate(raw, existingCustomers);
    const isDup = dup.status !== 'ok';

    const valid = validateImportRow(raw);
    const isError = valid.status !== 'ok'
      && valid.status !== 'duplicate_name_phone';

    const finalStatus = isDup ? dup.status : isError ? valid.status : 'ok';
    const finalNote = isDup ? dup.note : isError ? valid.note : '';

    const isBlocked = finalStatus === 'duplicate_code'
      || finalStatus === 'missing_fields'
      || finalStatus === 'invalid_code'
      || finalStatus === 'invalid_phone';

    return {
      index: idx + 1,
      raw,
      status: finalStatus as ImportRowStatus,
      note: finalNote,
      duplicateInfo: dup.duplicateInfo,
      selected: !isBlocked,
    };
  });
}

export function computeImportStats(rows: ImportRow[]): ImportStats {
  const ok = rows.filter(r => r.status === 'ok').length;
  const duplicate = rows.filter(r => r.status === 'duplicate_name_phone').length;
  const error = rows.filter(r => r.status !== 'ok' && r.status !== 'duplicate_name_phone').length;
  const willImport = rows.filter(r => r.selected).length;

  return { total: rows.length, ok, duplicate, error, willImport };
}

export function generateTemplateWorkbook(): XLSX.WorkBook {
  const headers = [
    'Mã KH',
    'Loại (DN/CN)',
    'Tên công ty',
    'Tên liên hệ',
    'MST',
    'Địa chỉ',
    'Địa chỉ xuất HĐ',
    'SĐT',
    'Email',
    'Nhóm KH',
    'Ghi chú',
    'Ghi chú liên hệ',
    'Ghi chú phân công',
  ];

  const sampleRows = [
    ['KH001', 'DN', 'CÔNG TY TNHH ABC', 'Nguyễn Văn A', '0123456789', '123 Đường ABC, Q.1, TP.HCM', '', '0901234567', 'abc@example.com', 'Key Account', '', '', ''],
    ['KH002', 'CN', '', 'Trần Thị B', '', '456 Đường XYZ, Q.3, TP.HCM', '', '0909876543', 'tranb@example.com', 'Khách lẻ', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');
  return wb;
}

export function downloadTemplate() {
  const wb = generateTemplateWorkbook();
  XLSX.writeFile(wb, 'Mau_Nhap_Khach_Hang.xlsx');
}

export function generateErrorReport(results: { success: string[]; skipped: { code: string; reason: string }[]; errors: { code: string; reason: string }[] }) {
  const rows: string[][] = [['Mã KH', 'Trạng thái', 'Lý do']];
  results.success.forEach(code => rows.push([code, 'Thành công', '']));
  results.skipped.forEach(s => rows.push([s.code, 'Bỏ qua', s.reason]));
  results.errors.forEach(e => rows.push([e.code, 'Lỗi', e.reason]));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 50 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
  XLSX.writeFile(wb, 'Ket_Qua_Nhap_Khach_Hang.csv');
}
