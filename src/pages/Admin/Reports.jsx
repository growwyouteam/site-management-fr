import { useState } from 'react';
import optimizedApi from '../../services/optimizedApi';
import { showToast } from '../../components/Toast';

const Reports = () => {
  const [reportType, setReportType] = useState('expenses');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      console.log('🚀 Generating report with optimization...');
      const startTime = Date.now();

      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await optimizedApi.get(`/admin/reports?${params}`);
      setReportData(res.data.data);

      console.log(`⚡ Report generated in ${Date.now() - startTime}ms`);
      showToast('Report generated successfully', 'success');
    } catch (error) {
      showToast('Failed to generate report', 'error');
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format) => {
    if (!reportData) return;

    if (format === 'json') {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportType}-${Date.now()}.json`;
      link.click();
      showToast('JSON report downloaded', 'success');
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(reportData);
      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportType}-${Date.now()}.csv`;
      link.click();
      showToast('CSV report downloaded', 'success');
    } else if (format === 'pdf') {
      // Generate PDF (basic HTML to PDF conversion)
      const pdfContent = generatePDF(reportData, reportType);
      const dataBlob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportType}-${Date.now()}.html`;
      link.click();
      showToast('HTML report downloaded (can be saved as PDF)', 'success');
    }
  };

  const convertToCSV = (data) => {
    if (!data || !Array.isArray(data)) {
      return 'No data available for CSV export';
    }

    if (data.length === 0) {
      return 'No records found';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  };

  const generatePDF = (data, type) => {
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;
    const date = new Date().toLocaleString();

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${date}</p>
        <div class="summary">
          <h3>Summary</h3>
          <p>Total Records: ${Array.isArray(data) ? data.length : 'N/A'}</p>
        </div>
    `;

    if (Array.isArray(data) && data.length > 0) {
      htmlContent += `
        <table>
          <thead>
            <tr>
              ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row =>
        `<tr>${Object.values(row).map(value => `<td>${value || 'N/A'}</td>`).join('')}</tr>`
      ).join('')}
          </tbody>
        </table>
      `;
    } else {
      htmlContent += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    htmlContent += `
      </body>
      </html>
    `;

    return htmlContent;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Reports & Analytics</h1>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expenses">💰 Expenses</option>
              <option value="attendance">👥 Attendance</option>
              <option value="stock">📦 Stock</option>
              <option value="machines">🚜 Machines</option>
              <option value="contractors">👷 Contractors</option>
              <option value="pl">📊 Profit & Loss</option>
              <option value="full">📈 Full Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData && (
            <div className="flex gap-2">
              <button
                onClick={() => downloadReport('json')}
                className="px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                📄 JSON
              </button>
              <button
                onClick={() => downloadReport('csv')}
                className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                📊 CSV
              </button>
              <button
                onClick={() => downloadReport('pdf')}
                className="px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                📑 PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {reportData && (
        <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Report Preview</h2>

          {/* Summary Card */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">Report Type</span>
                <p className="font-semibold capitalize">{reportType}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Records</span>
                <p className="font-semibold">{Array.isArray(reportData) ? reportData.length : 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Date Range</span>
                <p className="font-semibold">{startDate || 'All'} - {endDate || 'All'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Generated</span>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[500px]">
            {Array.isArray(reportData) && reportData.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(reportData[0]).map(key => (
                      <th key={key} className="text-left p-2 font-semibold bg-gray-100">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b">
                      {Object.values(row).map((value, idx) => (
                        <td key={idx} className="p-2">{value || 'N/A'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="text-xs">{JSON.stringify(reportData, null, 2)}</pre>
            )}
            {Array.isArray(reportData) && reportData.length > 10 && (
              <p className="text-center text-gray-500 mt-2">Showing first 10 of {reportData.length} records</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
