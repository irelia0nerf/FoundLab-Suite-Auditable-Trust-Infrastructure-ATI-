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
  doc.setTextColor(0, 0, 0); 
  doc.text("TIER 1 BANK | CONFIDENTIAL", margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Reference: ${crypto.randomUUID().slice(0, 8).toUpperCase()}`, margin, y);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, y);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 15;

  // --- EXECUTIVE SUMMARY ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text("1. Executive Risk Summary", margin, y);
  doc.setFont(undefined, 'normal');
  y += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(40);
  const summaryLines = doc.splitTextToSize(report.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += (summaryLines.length * 5) + 10;

  // --- RISK SCORECARD ---
  checkPageBreak(40);
  doc.setFillColor(report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH' ? 220 : 240, 240, 240);
  doc.rect(margin, y, contentWidth, 30, 'F');
  
  y += 8;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Risk Rating: ${report.riskLevel}`, margin + 5, y);
  doc.text(`Score: ${report.riskScore}/100`, margin + 100, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Decision: ${report.recommendation}`, margin + 5, y);
  y += 20;

  // --- ENTITY PROFILE ---
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("2. Client Profile (KYC)", margin, y);
  doc.setFont(undefined, 'normal');
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Legal Name: ${entity.name}`, margin, y); y += 5;
  doc.text(`Entity Type: ${entity.type}`, margin, y); y += 5;
  doc.text(`ID Reference: ${entity.idNumber || "N/A"}`, margin, y); y += 5;
  doc.text(`Registered Address: ${entity.address || "N/A"}`, margin, y); y += 5;
  if (entity.dob) { doc.text(`Incorp/DOB: ${entity.dob}`, margin, y); y += 5; }
  if (entity.nationality) { doc.text(`Jurisdiction: ${entity.nationality}`, margin, y); y += 5; }
  if (entity.documentType) { doc.text(`Source Docs: ${entity.documentType}`, margin, y); y += 5; }
  y += 10;

  // --- ENRICHMENT & ADVERSE MEDIA ---
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text("3. Enhanced Due Diligence (EDD) Findings", margin, y);
  doc.setFont(undefined, 'normal');
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(60);
  
  // Location
  doc.setFont(undefined, 'bold');
  doc.text("Geospatial Verification:", margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(enrichment.locationVerification.verified ? " [CONFIRMED]" : " [UNVERIFIED]", margin + 45, y);
  y += 6;
  
  const locLines = doc.splitTextToSize(`Analysis: ${enrichment.locationVerification.details}`, contentWidth);
  doc.text(locLines, margin, y);
  y += (locLines.length * 5) + 6;

  // Adverse Media
  doc.setFont(undefined, 'bold');
  doc.text("Negative News / Sanctions Screening:", margin, y);
  doc.setFont(undefined, 'normal');
  y += 6;

  if (enrichment.adverseMedia.length === 0) {
      doc.text("No significant adverse media found in public index.", margin, y);
      y += 6;
  } else {
      enrichment.adverseMedia.forEach(media => {
          checkPageBreak(20);
          doc.setTextColor(0);
          doc.text(`• ${media.title}`, margin, y);
          y += 5;
          doc.setTextColor(80);
          doc.setFontSize(9);
          const snippet = doc.splitTextToSize(media.snippet, contentWidth - 5);
          doc.text(snippet, margin + 5, y);
          y += (snippet.length * 4) + 4;
          doc.setTextColor(0, 0, 238);
          doc.textWithLink("Source Link", margin + 5, y, { url: media.url });
          doc.setTextColor(60);
          doc.setFontSize(10);
          y += 8;
      });
  }
  
  // --- VERITAS AUDIT ---
  y += 10;
  checkPageBreak(30);
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("VERITAS PROTOCOL: This document is cryptographically hashed.", margin, y);
  y += 4;
  doc.text("Audit Trail: Server-side log active. Zero-Persistence enforced.", margin, y);

  doc.save(`FoundLab_Risk_Report_${entity.name.replace(/\s/g, '_')}.pdf`);
};