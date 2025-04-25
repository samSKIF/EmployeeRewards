
// Utility function to download CSV files
export function downloadCsvFile(csvContent: string, filename = "export.csv") {
  // Add BOM for Excel UTF-8 compatibility
  const utf8BOM = "\uFEFF";
  
  // Create proper CSV MIME type and headers
  const blob = new Blob([utf8BOM + csvContent], {
    type: "text/csv;charset=utf-8"
  });

  // Use a safe filename format
  const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_');
  
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
