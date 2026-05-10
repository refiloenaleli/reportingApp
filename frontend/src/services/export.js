import * as FileSystem from 'expo-file-system';

function escapeValue(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportRecordsToExcel(filePrefix, headers, records) {
  const headerRow = headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join('');
  const bodyRows = records
    .map(
      (record) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(record[header.key])}</td>`)
          .join('')}</tr>`
    )
    .join('');
  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const filename = `${filePrefix}-${Date.now()}.xls`;
  const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, workbook.trim(), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}
