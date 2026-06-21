import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import ExcelJS from 'exceljs';

const STATUS_LABELS: Record<string, string> = {
  pending_contact: '待联系',
  contacted: '已联系',
  visited: '已到诊',
  converted: '已成交',
  invalid: '无效',
};

const SOURCE_LABELS: Record<string, string> = {
  chat: 'AI导诊',
  manual: '手动录入',
  website: '网站预约',
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const result = await query('SELECT * FROM appointments ORDER BY created_at DESC');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dental Agent';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('线索列表');

    // Column headers
    sheet.columns = [
      { header: '患者姓名', key: 'name', width: 14 },
      { header: '手机号', key: 'phone', width: 16 },
      { header: '就诊项目', key: 'service_type', width: 28 },
      { header: '预约时间', key: 'appointment_time', width: 22 },
      { header: '线索状态', key: 'lead_status', width: 12 },
      { header: '来源', key: 'lead_source', width: 12 },
      { header: '跟进备注', key: 'follow_up_note', width: 30 },
      { header: '下次跟进', key: 'next_follow_up_at', width: 20 },
      { header: '成交金额', key: 'deal_amount', width: 14 },
      { header: '创建时间', key: 'created_at', width: 20 },
      { header: '最后更新', key: 'updated_at', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    // Data rows
    const rows = result.rows.map((r: any) => ({
      name: r.name || '',
      phone: r.phone || '',
      service_type: r.service_type || '',
      appointment_time: r.appointment_time || '',
      lead_status: STATUS_LABELS[r.lead_status] || r.lead_status || '',
      lead_source: SOURCE_LABELS[r.lead_source] || r.lead_source || '',
      follow_up_note: r.follow_up_note || '',
      next_follow_up_at: r.next_follow_up_at
        ? new Date(r.next_follow_up_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '',
      deal_amount: r.deal_amount ? `¥${parseFloat(r.deal_amount).toFixed(2)}` : '',
      created_at: r.created_at
        ? new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '',
      updated_at: r.updated_at
        ? new Date(r.updated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '',
    }));

    rows.forEach((row: any, i: number) => {
      const excelRow = sheet.addRow(row);
      excelRow.height = 22;
      excelRow.eachCell((cell) => {
        cell.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
      // Alternate row color
      if (i % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
    });

    // Status column coloring
    const statusColMap: Record<string, string> = {
      '待联系': 'FFFEF3C7',
      '已联系': 'FFDBEAFE',
      '已到诊': 'FFCCFBF1',
      '已成交': 'FFD1FAE5',
      '无效': 'FFFEE2E2',
    };

    // Apply status color
    for (let i = 2; i <= rows.length + 1; i++) {
      const cell = sheet.getCell(`E${i}`);
      const val = cell.value?.toString() || '';
      const color = statusColMap[val];
      if (color) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leads_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[EXPORT] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
