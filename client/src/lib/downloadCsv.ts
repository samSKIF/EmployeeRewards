
// Utility function to download CSV files
export function downloadCsvFile(csvContent: string, filename = "employee_template.csv") {
  // Add BOM for Excel UTF-8 compatibility
  const utf8BOM = "\uFEFF";
  
  // Add timestamp to filename
  const timestamp = new Date().toISOString().split('T')[0];
  const safeFilename = `employee_template_${timestamp}.csv`.replace(/[^a-z0-9.-]/gi, '_');
  
  // Create proper CSV MIME type and headers with additional metadata
  const blob = new Blob([utf8BOM + csvContent], {
    type: "application/vnd.ms-excel;charset=utf-8"
  });
  
  // Create URL and temporary link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", safeFilename);
  link.setAttribute("type", "text/csv");
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
