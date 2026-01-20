import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export route details to PDF
 * @param {Object} route - The route object containing details and stops
 */
export const exportToPDF = (route) => {
  try {
    if (!route) {
        console.error("No route data provided for PDF export");
        return;
    }
    
    // Create new PDF instance
    const doc = new jsPDF();
    const routeId = route._id ? route._id.toString().slice(-6).toUpperCase() : "UNKNOWN";
    const status = route.status ? route.status.toUpperCase() : "PENDING";
    const stops = Array.isArray(route.route) ? route.route : [];
    const source = stops.length > 0 ? (stops[0].address || "N/A") : "N/A";
    const destination = stops.length > 1 ? (stops[stops.length-1].address || "N/A") : (stops.length === 1 ? (stops[0].address || "N/A") : "N/A");

    // Header Color Block
    doc.setFillColor(0, 102, 255);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("FLEETFLOW LOGISTICS REPORT", 14, 20);
    doc.setFontSize(10);
    doc.text(`REPORT ID: FF-${routeId} | GENERATED: ${new Date().toLocaleString()}`, 14, 28);
    
    let currentY = 55;

    // Overview Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Route Overview", 14, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryX1 = 14;
    const summaryX2 = 110;
    
    doc.text(`Route ID: #${routeId}`, summaryX1, currentY);
    doc.text(`Vehicle: ${route.vehicleData?.type?.toUpperCase() || 'VAN'}`, summaryX2, currentY);
    currentY += 6;
    
    doc.text(`Status: ${status}`, summaryX1, currentY);
    doc.text(`Max Capacity: ${route.vehicleData?.capacity || 1000} kg`, summaryX2, currentY);
    currentY += 6;
    
    doc.text(`Distance: ${route.totalDistance || 0} km`, summaryX1, currentY);
    doc.text(`Driver: ${route.driverId?.name || (typeof route.driverId === 'string' ? route.driverId : 'Unassigned')}`, summaryX2, currentY);
    currentY += 6;
    
    doc.text(`Est. Travel Time: ${route.estimatedTime || 0} min`, summaryX1, currentY);
    doc.text(`Total Stops: ${stops.length}`, summaryX2, currentY);
    currentY += 12;

    doc.setFont("helvetica", "bold");
    doc.text("Path Details", 14, currentY);
    currentY += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`From: ${source}`, 14, currentY);
    currentY += 6;
    doc.text(`To:   ${destination}`, 14, currentY);
    currentY += 12;

    // Financial Table
    if (doc.autoTable) {
        doc.setFont("helvetica", "bold");
        doc.text("Financial Breakdown", 14, currentY);
        currentY += 5;
        
        const costTableData = [
            ["Fuel Cost", `INR ${route.costBreakdown?.fuel?.toLocaleString('en-IN') || '0'}`],
            ["Wages", `INR ${route.costBreakdown?.time?.toLocaleString('en-IN') || '0'}`],
            ["Maintenance", `INR ${route.costBreakdown?.maintenance?.toLocaleString('en-IN') || '0'}`],
            ["Tolls", `INR ${route.costBreakdown?.tolls?.toLocaleString('en-IN') || '0'}`],
            ["Total Cost", `INR ${route.costBreakdown?.total?.toLocaleString('en-IN') || '0'}`]
        ];

        doc.autoTable({
            startY: currentY,
            head: [['Category', 'Amount']],
            body: costTableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 102, 255] },
            styles: { fontSize: 9 },
            margin: { right: 110 }
        });
        
        // AI Reasoning - Positioned to the right of cost table
        if (route.reasoning) {
            doc.setFont("helvetica", "bold");
            doc.text("AI Optimization Logic", 110, currentY);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            const splitReasoning = doc.splitTextToSize(route.reasoning, 85);
            doc.text(splitReasoning, 110, currentY + 7);
        }

        currentY = doc.lastAutoTable.finalY + 15;
    } else {
        // Fallback if autoTable fails to load
        doc.text("AutoTable plugin not detected. Stops list skipped.", 14, currentY);
        currentY += 10;
    }

    // Stops Sequence Table
    if (doc.autoTable && stops.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Stop Sequence Details", 14, currentY);
        
        const tableColumn = ["#", "Type", "Address", "Priority", "Window", "Arrival (Est)"];
        const tableRows = [];

        stops.forEach((stop, index) => {
          const arrivalDate = route.createdAt ? new Date(route.createdAt) : new Date();
          const arrivalTime = new Date(arrivalDate.getTime() + index * 30 * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          let type = "Mid-Stop";
          if (index === 0) type = "Source";
          else if (index === stops.length - 1) type = "Destination";

          tableRows.push([
            index + 1,
            type,
            stop.address || "Unknown",
            (stop.priority || "normal").toUpperCase(),
            stop.timeWindow || "Anytime",
            arrivalTime
          ]);
        });

        doc.autoTable({
          startY: currentY + 5,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [33, 37, 41] },
          styles: { fontSize: 8 },
        });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        doc.text('FleetFlow - AI Logistics Management System', doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, {align: 'right'});
    }

    doc.save(`fleetflow_route_${routeId}.pdf`);
  } catch (err) {
    console.error("Critical PDF Export Error:", err);
    alert("PDF generation failed. A full report is still available in the Dashboard.");
  }
};

/**
 * Export route details to CSV
 * @param {Object} route - The route object
 */
export const exportToCSV = (route) => {
  try {
    const routeId = route?._id ? route._id.toString().slice(-6).toUpperCase() : "UNKNOWN";
    const stops = Array.isArray(route?.route) ? route.route : [];
    
    // Metadata / Summary Rows
    const summary = [
        ["ROUTE LOGISTICS REPORT"],
        ["Route ID", routeId],
        ["Created At", route.createdAt || new Date().toISOString()],
        ["Status", route.status || "Draft"],
        ["Total Distance (km)", route.totalDistance || 0],
        ["Estimated Time (min)", route.estimatedTime || 0],
        ["Vehicle Type", route.vehicleData?.type || "van"],
        ["Vehicle Capacity (kg)", route.vehicleData?.capacity || 1000],
        ["Driver Name", route.driverId?.name || "Unassigned"],
        ["Total Cost (INR)", route.costBreakdown?.total || 0],
        ["Fuel Cost", route.costBreakdown?.fuel || 0],
        ["Wages", route.costBreakdown?.time || 0],
        ["Maintenance", route.costBreakdown?.maintenance || 0],
        ["Tolls", route.costBreakdown?.tolls || 0],
        [""], // Empty line
        ["STOP SEQUENCE DETAILS"],
        ["Seq", "Type", "Address", "Priority", "Time Window", "Expected Arrival"]
    ];
    
    const rows = stops.map((stop, index) => {
      const arrivalDate = route.createdAt ? new Date(route.createdAt) : new Date();
      const arrivalTime = new Date(arrivalDate.getTime() + index * 30 * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      let type = "Stop";
      if (index === 0) type = "Source";
      else if (index === stops.length - 1) type = "Destination";

      return [
          index + 1,
          type,
          `"${stop.address || 'Unknown'}"`,
          stop.priority || 'normal',
          stop.timeWindow || "Anytime",
          arrivalTime
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + 
        [...summary, ...rows].map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleetflow_route_${routeId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("CSV Export Error:", err);
  }
};

/**
 * Export route details to iCal (.ics)
 * @param {Object} route - The route object
 */
export const exportToiCal = (route) => {
  try {
    const routeId = route?._id ? route._id.toString().slice(-6).toUpperCase() : "UNKNOWN";
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FleetFlow//Route Schedule//EN\n";

    const stops = Array.isArray(route?.route) ? route.route : [];
    const baseDate = route.createdAt ? new Date(route.createdAt) : new Date();

    stops.forEach((stop, index) => {
      // Estimate each stop is 30 mins apart for scheduling purpose
      const arrival = new Date(baseDate.getTime() + index * 30 * 60000);
      const departure = new Date(arrival.getTime() + 15 * 60000); // 15 min duration

      const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      let summaryPrefix = "Delivery";
      if (index === 0) summaryPrefix = "START (Source)";
      else if (index === stops.length - 1) summaryPrefix = "END (Destination)";

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${routeId}-${index}@fleetflow.app\n`;
      icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
      icsContent += `DTSTART:${formatDate(arrival)}\n`;
      icsContent += `DTEND:${formatDate(departure)}\n`;
      icsContent += `SUMMARY:${summaryPrefix}: ${stop.address}\n`;
      icsContent += `DESCRIPTION:${summaryPrefix}. Priority: ${stop.priority}.\n`;
      icsContent += `LOCATION:${stop.address}\n`;
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const link = document.createElement("a");
    link.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsContent);
    link.download = `fleetflow_route_${routeId}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("iCal Export Error:", err);
    alert("Failed to export iCalendar file.");
  }
};
