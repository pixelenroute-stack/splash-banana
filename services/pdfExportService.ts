
import { jsPDF } from "jspdf";

export interface TutorialForPDF {
  title: string;
  software: 'Premiere Pro' | 'After Effects';
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
  estimatedTime: number; // minutes
  instructions: Array<{
    order: number;
    action: string;
    parameters?: Array<{
      name: string;
      value: string;
      unit?: string;
    }>;
    shortcut?: string;
  }>;
}

export class PDFExportService {
  
  async generateTutorialPDF(
    tutorials: TutorialForPDF[],
    projectTitle: string
  ): Promise<Blob> {
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    let currentY = 20;
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    
    // --- EN-TÊTE ---
    pdf.setFontSize(22);
    pdf.setTextColor(59, 130, 246); // Primary Blue (#3b82f6)
    pdf.text('Splash Banana', margin, currentY);
    
    currentY += 10;
    pdf.setFontSize(14);
    pdf.setTextColor(30, 41, 59); // Slate-800
    pdf.text(projectTitle, margin, currentY);
    
    currentY += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, margin, currentY);
    
    currentY += 15;
    
    // --- TUTORIELS ---
    for (const tutorial of tutorials) {
      // Vérifier si on a assez de place pour le titre et métadonnées (environ 30mm), sinon nouvelle page
      if (currentY > 250) {
        pdf.addPage();
        currentY = 20;
      }
      
      // Séparateur si ce n'est pas le premier
      if (tutorials.indexOf(tutorial) > 0) {
          pdf.setDrawColor(226, 232, 240); // Slate-200
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 10;
      }

      // Titre du tutoriel
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42); // Slate-900
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(tutorial.title, contentWidth);
      pdf.text(titleLines, margin, currentY);
      currentY += (titleLines.length * 6) + 2;
      
      // Métadonnées
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139); // Slate-500
      pdf.text(
        `${tutorial.software} • ${tutorial.difficulty} • ${tutorial.estimatedTime} min`,
        margin,
        currentY
      );
      
      currentY += 10;
      
      // Instructions
      pdf.setFontSize(10);
      
      for (const instruction of tutorial.instructions) {
        // Check page break
        if (currentY > 270) {
          pdf.addPage();
          currentY = 20;
        }

        // Numéro (Bulle)
        pdf.setFillColor(241, 245, 249); // Slate-100
        pdf.circle(margin + 2, currentY - 1, 3, 'F');
        pdf.setTextColor(59, 130, 246); // Primary
        pdf.setFontSize(8);
        pdf.text(`${instruction.order}`, margin + 2, currentY, { align: 'center', baseline: 'middle' });

        // Action Text
        pdf.setFontSize(10);
        pdf.setTextColor(51, 65, 85); // Slate-700
        const textX = margin + 8;
        const textWidth = contentWidth - 10;
        
        const actionText = instruction.action;
        const lines = pdf.splitTextToSize(actionText, textWidth);
        
        pdf.text(lines, textX, currentY);
        currentY += lines.length * 5;
        
        // Paramètres (Settings)
        if (instruction.parameters && instruction.parameters.length > 0) {
          currentY += 1;
          pdf.setFontSize(9);
          pdf.setFont("courier", "normal");
          
          for (const param of instruction.parameters) {
            if (currentY > 280) { pdf.addPage(); currentY = 20; }
            
            // Fond léger pour le paramètre
            pdf.setTextColor(71, 85, 105); // Slate-600
            const paramText = `${param.name}: `;
            const valText = `${param.value}${param.unit || ''}`;
            
            pdf.text(paramText, textX + 2, currentY);
            const paramWidth = pdf.getTextWidth(paramText);
            
            pdf.setTextColor(37, 99, 235); // Blue-600
            pdf.text(valText, textX + 2 + paramWidth, currentY);
            
            currentY += 4;
          }
          
          pdf.setFont("helvetica", "normal"); // Reset font
          currentY += 2;
        }
        
        // Raccourci
        if (instruction.shortcut) {
          if (currentY > 280) { pdf.addPage(); currentY = 20; }
          pdf.setFontSize(8);
          pdf.setTextColor(148, 163, 184); // Slate-400
          pdf.text(`Raccourci: [ ${instruction.shortcut} ]`, textX, currentY);
          currentY += 4;
        }
        
        currentY += 4; // Espace entre instructions
      }
      
      currentY += 5; // Espace final
    }
    
    // --- FOOTER (Pagination) ---
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); // Slate-400
      pdf.text(
        `Splash Banana Studio - Page ${i}/${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
    }
    
    return pdf.output('blob');
  }
  
  downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const pdfExportService = new PDFExportService();
