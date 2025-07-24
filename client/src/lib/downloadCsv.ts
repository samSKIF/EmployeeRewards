// Utility function to download CSV files
export function downloadCsvFile(csvContent: string, filename = 'export.csv') {
  // 1) prepend BOM (\uFEFF) so that editors/Excel see UTF-8
  const utf8BOM = '\uFEFF';
  const blob = new Blob([utf8BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // 2) create URL and click a temporary anchor
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 3) release memory
  URL.revokeObjectURL(url);
}
