import React from 'react';

// Mock ReactMarkdown component for testing
const ReactMarkdown = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'mocked-markdown' }, children);
};

export default ReactMarkdown; 