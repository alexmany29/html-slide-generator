export function makeTextEditable(htmlContent: string, onTextChange: (newContent: string) => void): string {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Find all text-containing elements
  const textElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, li, td, th');
  
  textElements.forEach((element, index) => {
    if (element.textContent?.trim()) {
      element.setAttribute('contenteditable', 'true');
      element.setAttribute('data-editable-id', index.toString());
      element.classList.add('editable-text');
      
      // Add event listener for content changes
      element.addEventListener('blur', (e) => {
        const target = e.target as HTMLElement;
        // Update the HTML content
        onTextChange(tempDiv.innerHTML);
      });

      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      });
    }
  });

  return tempDiv.innerHTML;
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script tags
  const scripts = tempDiv.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove dangerous attributes
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(element => {
    const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
    dangerousAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });
  });
  
  return tempDiv.innerHTML;
}

export function extractTextFromHtml(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}