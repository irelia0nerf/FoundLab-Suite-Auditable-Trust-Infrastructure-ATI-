import { jsPDF } from "jspdf";
import { ExtractedEntity, EnrichmentData, RiskReport } from "../types";

export const generatePDFReport = (
  entity: ExtractedEntity,
  enrichment: EnrichmentData,
  report: RiskReport
) => {
  const doc = new jsPDF();
  let y = 20;
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);

  // Helper to check page break
  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // --- HEADER ---
  doc.setFontSize(22);
  doc.setTextColor(14, 165, 233); // Brand Blue
  doc.text("FoundLab | KYC Risk Assessment", margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 15;

  // --- EXECUTIVE SUMMARY ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Executive Summary", margin, y);
  y += 8;
  
  doc.setFontSize(11);
  doc.setTextColor(60);
  const summaryLines = doc.splitTextToSize(report.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += (summaryLines.length * 6) + 10;

  // --- RISK ASSESSMENT ---
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Risk Assessment", margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`Risk Level: ${report.riskLevel} (${report.riskScore}/100)`, margin, y);
  y += 6;
  doc.text(`Recommendation: ${report.recommendation}`, margin, y);
  y += 15;

  // --- SUBJECT ENTITY ---
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Subject Entity Details", margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(`Name: ${entity.name}`, margin, y); y += 6;
  doc.text(`Type: ${entity.type}`, margin, y); y += 6;
  doc.text(`ID Number: ${entity.idNumber || "N/A"}`, margin, y); y += 6;
  doc.text(`Address: ${entity.address || "N/A"}`, margin, y); y += 6;
  if (entity.dob) { doc.text(`DOB/Inc: ${entity.dob}`, margin, y); y += 6; }
  if (entity.nationality) { doc.text(`Nationality: ${entity.nationality}`, margin, y); y += 6; }
  y += 10;

  // --- ENRICHMENT FINDINGS ---
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Agent Enrichment Findings", margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(60);
  
  // Location
  doc.setFont(undefined, 'bold');
  doc.text("Location Verification:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(enrichment.locationVerification.verified ? " Verified" : " Unverified", margin + 45, y);
  y += 6;
  
  const locLines = doc.splitTextToSize(`Details: ${enrichment.locationVerification.details}`, contentWidth);
  doc.text(locLines, margin, y);
  y += (locLines.length * 6) + 6;

  // Adverse Media
  doc.setFont(undefined, 'bold');
  doc.text("Adverse Media Search:", margin, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  
  if (enrichment.adverseMedia.length === 0) {
    doc.text("- No significant adverse media found.", margin + 5, y); 
    y += 6;
  } else {
    enrichment.adverseMedia.forEach(media => {
      checkPageBreak(20);
      const titleLines = doc.splitTextToSize(`- ${media.title}`, contentWidth - 5);
      doc.text(titleLines, margin + 5, y);
      y += (titleLines.length * 6);
      
      doc.setTextColor(100);
      doc.setFontSize(9);
      const urlLines = doc.splitTextToSize(media.url, contentWidth - 10);
      doc.text(urlLines, margin + 8, y);
      y += (urlLines.length * 5) + 2;
      doc.setFontSize(11);
      doc.setTextColor(60);
    });
  }
  y += 10;

  // --- COMPLIANCE ANALYSIS ---
  checkPageBreak(80);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Compliance Logic", margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(60);

  const fatfLines = doc.splitTextToSize(`FATF Alignment: ${report.fatfAlignment}`, contentWidth);
  doc.text(fatfLines, margin, y);
  y += (fatfLines.length * 6) + 6;

  const ofacLines = doc.splitTextToSize(`OFAC Screening: ${report.ofacScreening}`, contentWidth);
  doc.text(ofacLines, margin, y);
  y += (ofacLines.length * 6) + 10;

  // --- RED FLAGS ---
  if (report.redFlags.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red
    doc.text("Detected Red Flags:", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    report.redFlags.forEach(flag => {
      checkPageBreak(15);
      const flagLines = doc.splitTextToSize(`• ${flag}`, contentWidth - 5);
      doc.text(flagLines, margin + 5, y);
      y += (flagLines.length * 6);
    });
  }

  // Save
  doc.save(`FoundLab_RiskReport_${entity.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};